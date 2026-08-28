import type { CandidateProfile, Evidence } from './domain.js';
import { ConnectorFabric, type CareerConnector, type ConnectorCapability } from './connector-fabric.js';
import { HiredEngine } from './engine.js';
import type { PersistenceAdapter, StoreSnapshot } from './persistence.js';
import { persistenceFromEnv } from './persistence.js';
import { TraceRecorder } from './observability.js';

export class HiredRuntime {
  readonly traces=new TraceRecorder();
  readonly connectors:ConnectorFabric;
  private saveTimer?:NodeJS.Timeout;
  private constructor(readonly engine:HiredEngine,readonly persistence:PersistenceAdapter,connectorSnapshot?:StoreSnapshot['connectorFabric']){
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
  static async create(profile:CandidateProfile,seedEvidence:Evidence[]=[],persistence=persistenceFromEnv()){
    const snapshot=await persistence.load();
    const engine=new HiredEngine(profile,snapshot?.evidence.length?snapshot.evidence:seedEvidence,{careerTwin:snapshot?.careerTwin,careerOutcomes:snapshot?.careerOutcomes,savedOpportunities:snapshot?.savedOpportunities,opportunityWatches:snapshot?.opportunityWatches,careerState:snapshot?.careerState,careerPlans:snapshot?.careerPlans,proactiveMaya:snapshot?.proactiveMaya});
    if(snapshot){engine.store.restore(snapshot);engine.governor.restoreDeliveryEvents(snapshot.deliveryEvents??[]);}
    return new HiredRuntime(engine,persistence,snapshot?.connectorFabric);
  }
  registerConnector(connector:CareerConnector){return this.connectors.register(connector);}
  async dispatchApproved(approvalId:string,connectorId:string,capability:ConnectorCapability,maxAttempts=3){
    const approval=this.engine.store.approvals.get(approvalId);if(!approval)throw new Error('approval not found');
    if(approval.status!=='APPROVED'&&approval.status!=='EXECUTED')throw new Error('connector dispatch requires explicit approval');
    const operation=this.connectors.prepare({connectorId,capability,approvalId,opportunityId:approval.opportunityId,payload:approval.payload,idempotencyKey:`approval:${approvalId}:${connectorId}:${capability}`,maxAttempts});
    const result=await this.connectors.dispatch(operation.id,approval.payload);await this.checkpoint();return result;
  }
  async retryConnectorOperation(operationId:string,at=new Date()){
    const operation=this.connectors.get(operationId);if(operation.state!=='retrying')throw new Error(`connector operation is not retryable from ${operation.state}`);
    if(!operation.approvalId)throw new Error('connector retry requires recoverable approval payload');
    const approval=this.engine.store.approvals.get(operation.approvalId);if(!approval)throw new Error('connector approval not found');
    const result=await this.connectors.dispatch(operation.id,approval.payload,at);await this.checkpoint();return result;
  }
  snapshot():StoreSnapshot{return {...this.engine.store.snapshot(),...this.engine.durableState(),deliveryEvents:this.engine.governor.deliveryEvents(),connectorFabric:this.connectors.snapshot()};}
  async checkpoint(){const span=this.traces.start('persistence.checkpoint');try{await this.persistence.save(this.snapshot());span.end({opportunities:this.engine.store.opportunities.size,saved:this.engine.saved.listSaved().length,outcomes:this.engine.outcomes.all().length,deliveries:this.engine.governor.deliveryEvents().length,careerPlans:this.engine.plans.all().length,careerEvents:this.engine.careerState.events.all().length,proactiveSignals:this.engine.proactive.all().length,connectorOperations:this.connectors.all().length,connectorDeadLetters:this.connectors.deadLetters().length});}catch(error){span.fail(error);throw error;}}
  startAutoCheckpoint(intervalMs=Number(process.env.HIRED_CHECKPOINT_MS??5000)){this.stopAutoCheckpoint();this.saveTimer=setInterval(()=>void this.checkpoint(),intervalMs);this.saveTimer.unref();}
  stopAutoCheckpoint(){if(this.saveTimer)clearInterval(this.saveTimer);this.saveTimer=undefined;}
  async close(){this.stopAutoCheckpoint();await this.checkpoint();await this.persistence.close?.();}
}
