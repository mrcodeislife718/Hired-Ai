import { createHash, randomUUID } from 'node:crypto';

export type ConnectorCapability =
  | 'submit-application'
  | 'send-outreach'
  | 'send-email'
  | 'create-calendar-event'
  | 'read-opportunities'
  | 'read-employer-intelligence'
  | 'read-compensation'
  | 'verify-credential';

export type ConnectorOperationState = 'queued'|'dispatching'|'retrying'|'provider-acknowledged'|'verified-received'|'dead-letter';

export interface ConnectorDispatchRequest {
  operationId: string;
  idempotencyKey: string;
  candidateId: string;
  capability: ConnectorCapability;
  approvalId?: string;
  opportunityId?: string;
  payload: Record<string, unknown>;
}

export interface ConnectorDispatchResult {
  providerMessageId: string;
  acknowledged: boolean;
  verifiedReceived?: boolean;
  detail?: string;
  retryAfterMs?: number;
}

export interface CareerConnector {
  readonly id: string;
  readonly provider: string;
  readonly capabilities: readonly ConnectorCapability[];
  dispatch(request: ConnectorDispatchRequest): Promise<ConnectorDispatchResult>;
  verifyReceipt?(providerMessageId:string, request:ConnectorDispatchRequest):Promise<boolean>;
}

export interface ConnectorOperation {
  id: string;
  candidateId: string;
  connectorId: string;
  provider: string;
  capability: ConnectorCapability;
  approvalId?: string;
  opportunityId?: string;
  idempotencyKey: string;
  payloadHash: string;
  state: ConnectorOperationState;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  updatedAt: string;
  nextAttemptAt?: string;
  providerMessageId?: string;
  detail?: string;
  lastError?: string;
  deadLetterReason?: string;
}

export interface ConnectorFabricSnapshot { candidateId:string; operations:ConnectorOperation[]; }
export interface ConnectorLifecycleHooks {
  onDispatchBoundary?(operation:ConnectorOperation):void;
  onProviderAcknowledged?(operation:ConnectorOperation):void;
  onVerifiedReceived?(operation:ConnectorOperation):void;
  onDeadLetter?(operation:ConnectorOperation):void;
}

const clone=<T>(value:T):T=>structuredClone(value);
const now=()=>new Date().toISOString();
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

export class ConnectorRetryableError extends Error {
  constructor(message:string, readonly retryAfterMs?:number){super(message);this.name='ConnectorRetryableError';}
}

export class ConnectorFabric {
  private readonly connectors=new Map<string,CareerConnector>();
  private readonly operations=new Map<string,ConnectorOperation>();
  private readonly idempotency=new Map<string,string>();

  constructor(readonly candidateId:string,snapshot?:ConnectorFabricSnapshot,private readonly hooks:ConnectorLifecycleHooks={}){
    if(snapshot){
      if(snapshot.candidateId!==candidateId)throw new Error('connector fabric candidate mismatch');
      for(const operation of snapshot.operations){
        if(operation.candidateId!==candidateId)throw new Error('connector operation candidate mismatch');
        if(this.operations.has(operation.id))throw new Error('duplicate connector operation id');
        const existing=this.idempotency.get(operation.idempotencyKey);
        if(existing&&existing!==operation.id)throw new Error('duplicate connector idempotency key');
        this.operations.set(operation.id,clone(operation));
        this.idempotency.set(operation.idempotencyKey,operation.id);
      }
    }
  }

  register(connector:CareerConnector){
    if(!connector.id.trim()||!connector.provider.trim())throw new Error('connector id and provider required');
    if(!connector.capabilities.length)throw new Error('connector must expose at least one capability');
    if(this.connectors.has(connector.id))throw new Error(`connector already registered: ${connector.id}`);
    this.connectors.set(connector.id,connector);
    return this.describe(connector.id);
  }

  unregister(connectorId:string){return this.connectors.delete(connectorId);}
  available(capability?:ConnectorCapability){return [...this.connectors.values()].filter(c=>!capability||c.capabilities.includes(capability)).map(c=>({id:c.id,provider:c.provider,capabilities:[...c.capabilities]}));}
  describe(connectorId:string){const c=this.requiredConnector(connectorId);return{id:c.id,provider:c.provider,capabilities:[...c.capabilities]};}

  prepare(input:{connectorId:string;capability:ConnectorCapability;approvalId?:string;opportunityId?:string;payload:Record<string,unknown>;idempotencyKey?:string;maxAttempts?:number}){
    const connector=this.requiredConnector(input.connectorId);
    if(!connector.capabilities.includes(input.capability))throw new Error(`connector ${connector.id} does not support ${input.capability}`);
    const payloadHash=hash(input.payload);
    const idempotencyKey=input.idempotencyKey?.trim()||`${this.candidateId}:${input.approvalId??input.opportunityId??input.capability}:${connector.id}:${input.capability}:${payloadHash}`;
    const priorId=this.idempotency.get(idempotencyKey);
    if(priorId){const prior=this.operations.get(priorId)!;if(prior.payloadHash!==payloadHash||prior.connectorId!==connector.id||prior.capability!==input.capability)throw new Error('connector idempotency conflict');return clone(prior);}
    const at=now();
    const operation:ConnectorOperation={id:`connop_${randomUUID()}`,candidateId:this.candidateId,connectorId:connector.id,provider:connector.provider,capability:input.capability,approvalId:input.approvalId,opportunityId:input.opportunityId,idempotencyKey,payloadHash,state:'queued',attempts:0,maxAttempts:Math.max(1,Math.min(8,input.maxAttempts??3)),createdAt:at,updatedAt:at};
    this.operations.set(operation.id,operation);this.idempotency.set(idempotencyKey,operation.id);return clone(operation);
  }

  async dispatch(operationId:string,payload:Record<string,unknown>,at=new Date()){
    let operation=this.requiredOperation(operationId);
    if(hash(payload)!==operation.payloadHash)throw new Error('connector payload hash mismatch');
    if(operation.state==='verified-received'||operation.state==='provider-acknowledged')return clone(operation);
    if(operation.state==='dead-letter')throw new Error('connector operation is dead-lettered');
    if(operation.nextAttemptAt&&Date.parse(operation.nextAttemptAt)>at.getTime())throw new Error('connector retry is not due yet');
    const connector=this.requiredConnector(operation.connectorId);
    operation={...operation,state:'dispatching',attempts:operation.attempts+1,updatedAt:at.toISOString(),nextAttemptAt:undefined};this.store(operation);
    this.hooks.onDispatchBoundary?.(clone(operation));
    const request:ConnectorDispatchRequest={operationId:operation.id,idempotencyKey:operation.idempotencyKey,candidateId:this.candidateId,capability:operation.capability,approvalId:operation.approvalId,opportunityId:operation.opportunityId,payload:clone(payload)};
    try{
      const result=await connector.dispatch(request);
      if(!result.providerMessageId?.trim())throw new Error('connector providerMessageId required');
      if(!result.acknowledged)throw new ConnectorRetryableError(result.detail||'provider did not acknowledge connector operation',result.retryAfterMs);
      operation={...operation,state:'provider-acknowledged',providerMessageId:result.providerMessageId.trim(),detail:result.detail,updatedAt:new Date().toISOString(),lastError:undefined};this.store(operation);this.hooks.onProviderAcknowledged?.(clone(operation));
      let verified=Boolean(result.verifiedReceived);
      if(!verified&&connector.verifyReceipt)verified=await connector.verifyReceipt(operation.providerMessageId,request);
      if(verified){operation={...operation,state:'verified-received',updatedAt:new Date().toISOString()};this.store(operation);this.hooks.onVerifiedReceived?.(clone(operation));}
      return clone(operation);
    }catch(error){
      const message=error instanceof Error?error.message:String(error);
      const retryAfter=error instanceof ConnectorRetryableError?error.retryAfterMs:undefined;
      if(operation.attempts>=operation.maxAttempts){operation={...operation,state:'dead-letter',deadLetterReason:message,lastError:message,updatedAt:new Date().toISOString(),nextAttemptAt:undefined};this.store(operation);this.hooks.onDeadLetter?.(clone(operation));return clone(operation);}
      const delay=Math.max(1000,retryAfter??Math.min(60_000,1000*(2**(operation.attempts-1))));
      operation={...operation,state:'retrying',lastError:message,nextAttemptAt:new Date(at.getTime()+delay).toISOString(),updatedAt:new Date().toISOString()};this.store(operation);return clone(operation);
    }
  }

  get(operationId:string){return clone(this.requiredOperation(operationId));}
  byApproval(approvalId:string){return clone([...this.operations.values()].filter(o=>o.approvalId===approvalId));}
  all(){return clone([...this.operations.values()]);}
  deadLetters(){return this.all().filter(o=>o.state==='dead-letter');}
  snapshot():ConnectorFabricSnapshot{return{candidateId:this.candidateId,operations:this.all()};}
  integrity(){const operations=this.all();return{candidateId:this.candidateId,operations:operations.length,deadLetters:operations.filter(o=>o.state==='dead-letter').length,uniqueIds:new Set(operations.map(o=>o.id)).size===operations.length,uniqueIdempotencyKeys:new Set(operations.map(o=>o.idempotencyKey)).size===operations.length};}

  private store(operation:ConnectorOperation){this.operations.set(operation.id,clone(operation));}
  private requiredOperation(id:string){const value=this.operations.get(id);if(!value)throw new Error('connector operation not found');return value;}
  private requiredConnector(id:string){const value=this.connectors.get(id);if(!value)throw new Error(`connector not registered: ${id}`);return value;}
}

export interface HttpJsonConnectorOptions {
  id:string;
  provider:string;
  endpoint:string;
  capabilities:ConnectorCapability[];
  bearerToken?:string;
  timeoutMs?:number;
}

export class HttpJsonConnector implements CareerConnector {
  readonly id:string;readonly provider:string;readonly capabilities:readonly ConnectorCapability[];
  private readonly endpoint:URL;private readonly bearerToken?:string;private readonly timeoutMs:number;
  constructor(options:HttpJsonConnectorOptions){
    this.id=options.id;this.provider=options.provider;this.capabilities=[...options.capabilities];this.endpoint=new URL(options.endpoint);this.bearerToken=options.bearerToken;this.timeoutMs=Math.max(1000,Math.min(30_000,options.timeoutMs??10_000));
    if(this.endpoint.protocol!=='https:'&&this.endpoint.hostname!=='localhost'&&this.endpoint.hostname!=='127.0.0.1')throw new Error('connector endpoint must use HTTPS outside localhost');
  }
  async dispatch(request:ConnectorDispatchRequest):Promise<ConnectorDispatchResult>{
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),this.timeoutMs);
    try{
      const response=await fetch(this.endpoint,{method:'POST',headers:{'content-type':'application/json','idempotency-key':request.idempotencyKey,...(this.bearerToken?{authorization:`Bearer ${this.bearerToken}`}:{})},body:JSON.stringify(request),signal:controller.signal});
      const retryAfter=response.headers.get('retry-after');const retryAfterMs=retryAfter&&Number.isFinite(Number(retryAfter))?Number(retryAfter)*1000:undefined;
      const body=await response.json().catch(()=>({})) as Record<string,unknown>;
      if(response.status===429||response.status>=500)throw new ConnectorRetryableError(`connector provider returned ${response.status}`,retryAfterMs);
      if(!response.ok)throw new Error(`connector provider rejected request with ${response.status}`);
      return{providerMessageId:String(body.providerMessageId??body.id??''),acknowledged:body.acknowledged===undefined?true:Boolean(body.acknowledged),verifiedReceived:Boolean(body.verifiedReceived),detail:typeof body.detail==='string'?body.detail:undefined,retryAfterMs};
    }finally{clearTimeout(timer);}
  }
}
