import { randomUUID } from 'node:crypto';
import type { CandidateProfile, Evidence } from './domain.js';
import { ConnectorFabric, type CareerConnector, type ConnectorCapability, type ConnectorOperation } from './connector-fabric.js';
import { HiredEngine } from './engine.js';
import type { PersistenceAdapter, StoreSnapshot } from './persistence.js';
import { persistenceFromEnv } from './persistence.js';
import { TraceRecorder, telemetryExporterFromEnv } from './observability.js';
import { actionOutboxFromEnv, type ActionOutbox, type OutboxCommand } from './action-outbox.js';

export class HiredRuntime {
  readonly traces:TraceRecorder;
  readonly connectors:ConnectorFabric;
  private saveTimer?:NodeJS.Timeout;
  private readonly workerId=`runtime_${process.pid}_${randomUUID()}`;

  private constructor(
    readonly engine:HiredEngine,
    readonly persistence:PersistenceAdapter,
    readonly outbox:ActionOutbox,
    connectorSnapshot?:StoreSnapshot['connectorFabric']
  ){
    this.traces=new TraceRecorder(telemetryExporterFromEnv());
    this.connectors=new ConnectorFabric(engine.profile.id,connectorSnapshot,{
      onDispatchBoundary:operation=>{
        if(!operation.approvalId)return;
        const approval=engine.store.approvals.get(operation.approvalId);
        if(!approval)throw new Error('connector approval not found');
        if(approval.status==='APPROVED')engine.governor.executeApproved(approval.id);
        else if(approval.status!=='EXECUTED')throw new Error('connector dispatch requires explicit approval');
      },
      onProviderAcknowledged:operation=>{
        if(!operation.approvalId||!operation.providerMessageId)return;
        if(engine.governor.deliveryState(operation.approvalId)==='dispatched')engine.governor.providerAcknowledged(operation.approvalId,operation.provider,operation.providerMessageId,operation.detail);
      },
      onVerifiedReceived:operation=>{
        if(!operation.approvalId||!operation.providerMessageId)return;
        const state=engine.governor.deliveryState(operation.approvalId);
        if(state==='provider-acknowledged')engine.governor.verifyReceived(operation.approvalId,operation.provider,operation.providerMessageId,operation.detail);
      },
      onDeadLetter:operation=>{
        if(operation.approvalId){
          const state=engine.governor.deliveryState(operation.approvalId);
          if(state==='dispatched'||state==='provider-acknowledged'||state==='unknown')engine.governor.failDelivery(operation.approvalId,operation.deadLetterReason??'connector retries exhausted');
        }
        engine.governor.audit('ConnectorFabric','CONNECTOR_DEAD_LETTER',operation.opportunityId,{operationId:operation.id,connectorId:operation.connectorId,provider:operation.provider,attempts:operation.attempts,reason:operation.deadLetterReason});
      }
    });
  }

  static async create(profile:CandidateProfile,seedEvidence:Evidence[]=[],persistence=persistenceFromEnv(),outbox=actionOutboxFromEnv()){
    const snapshot=await persistence.load();
    const engine=new HiredEngine(profile,snapshot?.evidence.length?snapshot.evidence:seedEvidence,{careerTwin:snapshot?.careerTwin,careerOutcomes:snapshot?.careerOutcomes,savedOpportunities:snapshot?.savedOpportunities,opportunityWatches:snapshot?.opportunityWatches,careerState:snapshot?.careerState,careerPlans:snapshot?.careerPlans,proactiveMaya:snapshot?.proactiveMaya});
    if(snapshot){engine.store.restore(snapshot);engine.governor.restoreDeliveryEvents(snapshot.deliveryEvents??[]);}
    return new HiredRuntime(engine,persistence,outbox,snapshot?.connectorFabric);
  }

  registerConnector(connector:CareerConnector){return this.connectors.register(connector);}

  private dispatchKey(approvalId:string,connectorId:string,capability:ConnectorCapability){return `approval:${approvalId}:${connectorId}:${capability}`;}

  private async journalDispatch(approvalId:string,connectorId:string,capability:ConnectorCapability,payload:Record<string,unknown>,opportunityId:string|undefined,maxAttempts:number,at=new Date()){
    const idempotencyKey=this.dispatchKey(approvalId,connectorId,capability);
    const journal=await this.outbox.enqueue({aggregateType:'approval',aggregateId:approvalId,action:`connector:${capability}`,idempotencyKey,payload:{approvalId,connectorId,capability,opportunityId,maxAttempts,payload},availableAt:at});
    const leased=await this.outbox.claimById(journal.id,this.workerId,30_000,at);
    return{idempotencyKey,journal:leased};
  }

  private async settleJournal(journal:OutboxCommand,result:ConnectorOperation,at=new Date()){
    if(journal.state==='delivered')return journal;
    if(result.state==='verified-received'||result.state==='provider-acknowledged')return this.outbox.delivered(journal.id,this.workerId,at);
    if(result.state==='dead-letter')return this.outbox.retry(journal.id,this.workerId,result.deadLetterReason??result.lastError??'connector dead-lettered',1000,1,at);
    if(result.state==='retrying'){
      const delay=result.nextAttemptAt?Math.max(1000,Date.parse(result.nextAttemptAt)-at.getTime()):1000;
      return this.outbox.retry(journal.id,this.workerId,result.lastError??'connector retry scheduled',delay,Math.max(1,result.maxAttempts),at);
    }
    return journal;
  }

  async dispatchApproved(approvalId:string,connectorId:string,capability:ConnectorCapability,maxAttempts=3){
    const approval=this.engine.store.approvals.get(approvalId);if(!approval)throw new Error('approval not found');
    if(approval.status!=='APPROVED'&&approval.status!=='EXECUTED')throw new Error('connector dispatch requires explicit approval');
    const at=new Date();
    const {idempotencyKey,journal}=await this.journalDispatch(approvalId,connectorId,capability,approval.payload,approval.opportunityId,maxAttempts,at);
    const operation=this.connectors.prepare({connectorId,capability,approvalId,opportunityId:approval.opportunityId,payload:approval.payload,idempotencyKey,maxAttempts});
    try{
      const result=await this.connectors.dispatch(operation.id,approval.payload,at);await this.settleJournal(journal,result,at);await this.checkpoint();return result;
    }catch(error){if(journal.state!=='delivered')await this.outbox.retry(journal.id,this.workerId,error instanceof Error?error.message:String(error),1000,maxAttempts,at).catch(()=>undefined);throw error;}
  }

  async retryConnectorOperation(operationId:string,at=new Date()){
    const operation=this.connectors.get(operationId);if(operation.state!=='retrying')throw new Error(`connector operation is not retryable from ${operation.state}`);
    if(!operation.approvalId)throw new Error('connector retry requires recoverable approval payload');
    const approval=this.engine.store.approvals.get(operation.approvalId);if(!approval)throw new Error('connector approval not found');
    const key=this.dispatchKey(operation.approvalId,operation.connectorId,operation.capability);
    const existing=await this.outbox.byIdempotencyKey(key);
    const journal=existing??await this.outbox.enqueue({aggregateType:'approval',aggregateId:operation.approvalId,action:`connector:${operation.capability}`,idempotencyKey:key,payload:{approvalId:operation.approvalId,connectorId:operation.connectorId,capability:operation.capability,opportunityId:operation.opportunityId,maxAttempts:operation.maxAttempts,payload:approval.payload},availableAt:at});
    const leased=await this.outbox.claimById(journal.id,this.workerId,30_000,at);
    try{
      const result=await this.connectors.dispatch(operation.id,approval.payload,at);await this.settleJournal(leased,result,at);await this.checkpoint();return result;
    }catch(error){if(leased.state!=='delivered')await this.outbox.retry(leased.id,this.workerId,error instanceof Error?error.message:String(error),1000,operation.maxAttempts,at).catch(()=>undefined);throw error;}
  }

  snapshot():StoreSnapshot{return {...this.engine.store.snapshot(),...this.engine.durableState(),deliveryEvents:this.engine.governor.deliveryEvents(),connectorFabric:this.connectors.snapshot()};}
  async checkpoint(){const span=this.traces.start('persistence.checkpoint');try{await this.persistence.save(this.snapshot());const pendingOutbox=(await this.outbox.pending()).length;this.traces.metric('hired.outbox.pending',pendingOutbox,{candidateId:this.engine.profile.id});span.end({opportunities:this.engine.store.opportunities.size,saved:this.engine.saved.listSaved().length,outcomes:this.engine.outcomes.all().length,deliveries:this.engine.governor.deliveryEvents().length,careerPlans:this.engine.plans.all().length,careerEvents:this.engine.careerState.events.all().length,proactiveSignals:this.engine.proactive.all().length,connectorOperations:this.connectors.all().length,connectorDeadLetters:this.connectors.deadLetters().length,pendingOutbox});}catch(error){span.fail(error);throw error;}}
  startAutoCheckpoint(intervalMs=Number(process.env.HIRED_CHECKPOINT_MS??5000)){this.stopAutoCheckpoint();this.saveTimer=setInterval(()=>void this.checkpoint(),intervalMs);this.saveTimer.unref();}
  stopAutoCheckpoint(){if(this.saveTimer)clearInterval(this.saveTimer);this.saveTimer=undefined;}
  async close(){this.stopAutoCheckpoint();await this.checkpoint();await this.persistence.close?.();await this.outbox.close?.();await this.traces.close();}
}
