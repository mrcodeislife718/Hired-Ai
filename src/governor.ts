import type { ApprovalRequest, AuditEvent, PipelineState } from './domain.js';
import { PIPELINE_STATES } from './domain.js';
import { DeliveryLedger, type DeliveryEvent } from './delivery-ledger.js';
import { Store } from './store.js';
import { id, stableHash } from './utils.js';

const allowed: Record<PipelineState, PipelineState[]> = {
  DISCOVERED: ['QUALIFIED','REJECTED'],
  QUALIFIED: ['CONTACTED','APPLIED','REJECTED'],
  CONTACTED: ['APPLIED','RECRUITER_SCREEN','REJECTED'],
  APPLIED: ['RECRUITER_SCREEN','REJECTED'],
  RECRUITER_SCREEN: ['TECHNICAL','REJECTED'],
  TECHNICAL: ['ONSITE','OFFER','REJECTED'],
  ONSITE: ['OFFER','REJECTED'],
  OFFER: [], REJECTED: []
};

export type GovernorAuditSink = (event: AuditEvent) => void;

export class Governor {
  readonly deliveries = new DeliveryLedger();
  constructor(private readonly store: Store, private readonly eventSink?: GovernorAuditSink) {}

  transition(opportunityId: string, next: PipelineState) {
    if (!PIPELINE_STATES.includes(next)) throw new Error(`unknown state ${next}`);
    const opportunity = this.store.opportunities.get(opportunityId);
    if (!opportunity) throw new Error('opportunity not found');
    if (!allowed[opportunity.state].includes(next)) throw new Error(`illegal transition ${opportunity.state} -> ${next}`);
    const previous = opportunity.state;
    opportunity.state = next;
    opportunity.updatedAt = new Date().toISOString();
    this.audit('Governor', 'STATE_TRANSITION', opportunityId, { previous, next });
    return opportunity;
  }

  requestApproval(opportunityId: string, action: ApprovalRequest['action'], payload: Record<string, unknown>) {
    if (!this.store.opportunities.has(opportunityId)) throw new Error('opportunity not found');
    const approval: ApprovalRequest = { id: id('approval'), opportunityId, action, payload, status: 'PENDING', createdAt: new Date().toISOString() };
    this.store.saveApproval(approval);
    this.deliveries.record({id:id('delivery'),actionId:approval.id,state:'prepared',at:new Date().toISOString(),detail:`${action} prepared and awaiting explicit authorization`});
    this.audit('Governor', 'APPROVAL_REQUESTED', opportunityId, { approvalId: approval.id, action, payloadHash: stableHash(payload) });
    return approval;
  }

  approve(approvalId: string) {
    const approval = this.store.approvals.get(approvalId);
    if (!approval || approval.status !== 'PENDING') throw new Error('pending approval not found');
    approval.status = 'APPROVED';
    this.deliveries.record({id:id('delivery'),actionId:approval.id,state:'approved',at:new Date().toISOString(),detail:'explicit user authorization recorded'});
    this.audit('Human', 'APPROVAL_GRANTED', approval.opportunityId, { approvalId });
    return approval;
  }

  executeApproved(approvalId: string) {
    const approval = this.store.approvals.get(approvalId);
    if (!approval || approval.status !== 'APPROVED') throw new Error('explicit approval required');
    const opportunity = this.store.opportunities.get(approval.opportunityId);
    if (!opportunity) throw new Error('opportunity not found');

    approval.status = 'EXECUTED';
    this.deliveries.record({id:id('delivery'),actionId:approval.id,state:'dispatched',at:new Date().toISOString(),detail:'authorized payload released to the external connector boundary; receipt is not yet verified'});
    this.audit('Governor', 'APPROVED_ACTION_EXECUTED', approval.opportunityId, { approvalId, action: approval.action });

    if (approval.action === 'SEND_OUTREACH' && opportunity.state === 'QUALIFIED') this.transition(approval.opportunityId, 'CONTACTED');
    if (approval.action === 'SUBMIT_APPLICATION' && (opportunity.state === 'QUALIFIED' || opportunity.state === 'CONTACTED')) this.transition(approval.opportunityId, 'APPLIED');

    return approval.payload;
  }

  providerAcknowledged(approvalId:string,provider:string,providerMessageId:string,detail?:string){
    const approval=this.store.approvals.get(approvalId);
    if(!approval||approval.status!=='EXECUTED')throw new Error('executed approval required before provider acknowledgement');
    if(!provider.trim()||!providerMessageId.trim())throw new Error('provider and providerMessageId required');
    const event=this.deliveries.record({id:id('delivery'),actionId:approval.id,state:'provider-acknowledged',at:new Date().toISOString(),provider:provider.trim(),providerMessageId:providerMessageId.trim(),detail});
    this.audit('DeliveryVerifier','PROVIDER_ACKNOWLEDGED',approval.opportunityId,{approvalId,provider:event.provider,providerMessageId:event.providerMessageId});
    return event;
  }

  verifyReceived(approvalId:string,provider:string,providerMessageId:string,detail?:string){
    const approval=this.store.approvals.get(approvalId);
    if(!approval||approval.status!=='EXECUTED')throw new Error('executed approval required before receipt verification');
    if(!provider.trim()||!providerMessageId.trim())throw new Error('provider and providerMessageId required');
    const event=this.deliveries.record({id:id('delivery'),actionId:approvalId,state:'verified-received',at:new Date().toISOString(),provider:provider.trim(),providerMessageId:providerMessageId.trim(),detail});
    this.audit('DeliveryVerifier','DELIVERY_VERIFIED_RECEIVED',approval.opportunityId,{approvalId,provider:event.provider,providerMessageId:event.providerMessageId});
    return event;
  }

  failDelivery(approvalId:string,detail:string){
    const approval=this.store.approvals.get(approvalId);
    if(!approval||approval.status!=='EXECUTED')throw new Error('executed approval required before delivery failure');
    const state=this.deliveryState(approvalId);
    if(state!=='dispatched'&&state!=='provider-acknowledged'&&state!=='unknown')throw new Error(`delivery cannot fail from ${state??'missing'} state`);
    const event=this.deliveries.record({id:id('delivery'),actionId:approval.id,state:'failed',at:new Date().toISOString(),detail:detail.trim()||'external connector delivery failed'});
    this.audit('DeliveryVerifier','DELIVERY_FAILED',approval.opportunityId,{approvalId,detail:event.detail,previousState:state});
    return event;
  }

  deliveryState(approvalId:string){return this.deliveries.state(approvalId);}
  deliveryHistory(approvalId:string){return this.deliveries.history(approvalId);}
  deliveryEvents(){return this.deliveries.all();}
  restoreDeliveryEvents(events:DeliveryEvent[]){this.deliveries.restore(events);}

  assertNoDuplicate(source: string, sourceId: string) {
    for (const item of this.store.opportunities.values()) if (item.job.source === source && item.job.sourceId === sourceId) throw new Error('duplicate opportunity');
  }

  audit(actor: string, action: string, opportunityId: string | undefined, detail: Record<string, unknown>) {
    const event = this.store.addAudit({ id: id('audit'), at: new Date().toISOString(), actor, action, opportunityId, detail });
    this.eventSink?.(structuredClone(event));
    return event;
  }
}
