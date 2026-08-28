import type { ApprovalRequest, PipelineState } from './domain.js';
import { PIPELINE_STATES } from './domain.js';
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

export class Governor {
  constructor(private readonly store: Store) {}

  transition(opportunityId: string, next: PipelineState) {
    if (!PIPELINE_STATES.includes(next)) throw new Error(`unknown state ${next}`);
    const opportunity = this.store.opportunities.get(opportunityId);
    if (!opportunity) throw new Error('opportunity not found');
    if (!allowed[opportunity.state].includes(next)) throw new Error(`illegal transition ${opportunity.state} -> ${next}`);
    opportunity.state = next;
    opportunity.updatedAt = new Date().toISOString();
    this.audit('Governor', 'STATE_TRANSITION', opportunityId, { next });
    return opportunity;
  }

  requestApproval(opportunityId: string, action: ApprovalRequest['action'], payload: Record<string, unknown>) {
    if (!this.store.opportunities.has(opportunityId)) throw new Error('opportunity not found');
    const approval: ApprovalRequest = { id: id('approval'), opportunityId, action, payload, status: 'PENDING', createdAt: new Date().toISOString() };
    this.store.saveApproval(approval);
    this.audit('Governor', 'APPROVAL_REQUESTED', opportunityId, { approvalId: approval.id, action, payloadHash: stableHash(payload) });
    return approval;
  }

  approve(approvalId: string) {
    const approval = this.store.approvals.get(approvalId);
    if (!approval || approval.status !== 'PENDING') throw new Error('pending approval not found');
    approval.status = 'APPROVED';
    this.audit('Human', 'APPROVAL_GRANTED', approval.opportunityId, { approvalId });
    return approval;
  }

  executeApproved(approvalId: string) {
    const approval = this.store.approvals.get(approvalId);
    if (!approval || approval.status !== 'APPROVED') throw new Error('explicit approval required');
    const opportunity = this.store.opportunities.get(approval.opportunityId);
    if (!opportunity) throw new Error('opportunity not found');

    approval.status = 'EXECUTED';
    this.audit('Governor', 'APPROVED_ACTION_EXECUTED', approval.opportunityId, { approvalId, action: approval.action });

    if (approval.action === 'SEND_OUTREACH' && opportunity.state === 'QUALIFIED') {
      this.transition(approval.opportunityId, 'CONTACTED');
    }
    if (approval.action === 'SUBMIT_APPLICATION' && (opportunity.state === 'QUALIFIED' || opportunity.state === 'CONTACTED')) {
      this.transition(approval.opportunityId, 'APPLIED');
    }

    return approval.payload;
  }

  assertNoDuplicate(source: string, sourceId: string) {
    for (const item of this.store.opportunities.values()) if (item.job.source === source && item.job.sourceId === sourceId) throw new Error('duplicate opportunity');
  }

  audit(actor: string, action: string, opportunityId: string | undefined, detail: Record<string, unknown>) {
    return this.store.addAudit({ id: id('audit'), at: new Date().toISOString(), actor, action, opportunityId, detail });
  }
}
