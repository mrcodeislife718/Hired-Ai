export type CareerAction =
  | 'search_jobs'
  | 'draft_application'
  | 'modify_resume'
  | 'submit_application'
  | 'contact_recruiter'
  | 'decline_interview'
  | 'negotiate_compensation'
  | 'accept_offer';

export type ActionPolicy = 'allow' | 'approval' | 'deny';

export interface AuthorityDecision {
  action: CareerAction;
  policy: ActionPolicy;
  allowed: boolean;
  approvalRequired: boolean;
  reason: string;
}

const DEFAULT_POLICY: Record<CareerAction, ActionPolicy> = {
  search_jobs: 'allow',
  draft_application: 'allow',
  modify_resume: 'approval',
  submit_application: 'approval',
  contact_recruiter: 'approval',
  decline_interview: 'deny',
  negotiate_compensation: 'approval',
  accept_offer: 'deny',
};

export class CareerActionAuthority {
  constructor(private readonly policy: Record<CareerAction, ActionPolicy> = DEFAULT_POLICY) {}

  decide(action: CareerAction, approvals: CareerAction[] = []): AuthorityDecision {
    const policy = this.policy[action];
    const approved = approvals.includes(action);
    if (policy === 'deny') return { action, policy, allowed: false, approvalRequired: false, reason: 'action is outside Maya authority' };
    if (policy === 'approval' && !approved) return { action, policy, allowed: false, approvalRequired: true, reason: 'explicit user approval is required' };
    return { action, policy, allowed: true, approvalRequired: policy === 'approval', reason: policy === 'allow' ? 'action is delegated by default' : 'explicit approval satisfied' };
  }

  assertAllowed(action: CareerAction, approvals: CareerAction[] = []): void {
    const decision = this.decide(action, approvals);
    if (!decision.allowed) throw new Error(`${action}: ${decision.reason}`);
  }
}

export interface ExternalActionReceipt {
  id: string;
  action: CareerAction;
  target: string;
  attemptedAt: string;
  completedAt?: string;
  verified: boolean;
  reversible: boolean;
  externalReference?: string;
  evidence?: Record<string, unknown>;
}

export function createExternalActionReceipt(input: Omit<ExternalActionReceipt, 'attemptedAt'> & { attemptedAt?: string }): ExternalActionReceipt {
  if (!input.id || !input.target) throw new Error('receipt id and target are required');
  if (input.verified && !input.externalReference && !input.evidence) throw new Error('verified external action requires evidence or external reference');
  return {
    ...input,
    attemptedAt: input.attemptedAt ?? new Date().toISOString(),
    evidence: input.evidence ? structuredClone(input.evidence) : undefined,
  };
}
