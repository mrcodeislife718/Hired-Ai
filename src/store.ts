import type { ApprovalRequest, AuditEvent, Evidence, FeedbackEvent, Opportunity } from './domain.js';

export class Store {
  opportunities = new Map<string, Opportunity>();
  evidence = new Map<string, Evidence>();
  approvals = new Map<string, ApprovalRequest>();
  audit: AuditEvent[] = [];
  feedback: FeedbackEvent[] = [];

  saveOpportunity(value: Opportunity) { this.opportunities.set(value.id, value); return value; }
  saveEvidence(value: Evidence) { this.evidence.set(value.id, value); return value; }
  addAudit(value: AuditEvent) { this.audit.push(value); return value; }
  addFeedback(value: FeedbackEvent) { this.feedback.push(value); return value; }
  saveApproval(value: ApprovalRequest) { this.approvals.set(value.id, value); return value; }
}
