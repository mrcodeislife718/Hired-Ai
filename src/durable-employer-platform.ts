import type { CapabilityEvidence, DecisionType, HiringOutcomeObservation } from './bias-resistant-hiring.js';
import { employerPersistenceFromEnv, type EmployerPersistenceAdapter } from './employer-persistence.js';
import {
  EmployerPlatform,
  type CandidateSourcingConsent,
  type EmployerJob,
  type EmployerRole
} from './employer-platform.js';

/**
 * Canonical durable boundary for employer-side state.
 * Every state-changing operation replays against the latest durable snapshot and
 * is persisted before acknowledgement, preventing stale-instance overwrite.
 */
export class DurableEmployerPlatform {
  readonly platform: EmployerPlatform;

  private constructor(platform: EmployerPlatform, private readonly persistence: EmployerPersistenceAdapter) {
    this.platform = platform;
  }

  static async create(persistence: EmployerPersistenceAdapter = employerPersistenceFromEnv()) {
    const snapshot = await persistence.load();
    return new DurableEmployerPlatform(new EmployerPlatform(snapshot), persistence);
  }

  private async mutate<T>(operation:(working:EmployerPlatform)=>T):Promise<T>{
    let result!:T;
    const apply=(current:ReturnType<EmployerPlatform['snapshot']>|undefined)=>{
      const working=new EmployerPlatform(current);
      result=operation(working);
      return working.snapshot();
    };
    const next=this.persistence.mutate?await this.persistence.mutate(apply):apply(this.platform.snapshot());
    if(!this.persistence.mutate)await this.persistence.save(next);
    this.platform.restore(next);
    return result;
  }

  async createOrganization(name: string, ownerAccountId: string) {
    return this.mutate(working=>working.createOrganization(name, ownerAccountId));
  }

  async addMember(orgId: string, actorAccountId: string, accountId: string, role: Exclude<EmployerRole, 'owner'>) {
    return this.mutate(working=>working.addMember(orgId, actorAccountId, accountId, role));
  }

  async createJob(orgId: string,actorAccountId: string,input: Omit<EmployerJob, 'id' | 'organizationId' | 'createdBy' | 'createdAt' | 'updatedAt'>) {
    return this.mutate(working=>working.createJob(orgId, actorAccountId, input));
  }

  async setCandidateConsent(consent: CandidateSourcingConsent) {
    return this.mutate(working=>working.setCandidateConsent(consent));
  }

  organization(orgId: string) { return this.platform.organization(orgId); }
  listJobs(orgId: string, actorAccountId: string) { return this.platform.listJobs(orgId, actorAccountId); }
  candidateConsent(candidateId: string) { return this.platform.candidateConsent(candidateId); }
  canOrganizationSourceCandidate(candidateId: string, orgId: string) { return this.platform.canOrganizationSourceCandidate(candidateId, orgId); }
  structuredInterview(jobId: string, orgId: string, actorAccountId: string) { return this.platform.structuredInterview(jobId, orgId, actorAccountId); }
  async evidenceSubstitution(jobId: string, requirementId: string, evidence: CapabilityEvidence[], orgId: string, actorAccountId: string) { return this.mutate(working=>working.evidenceSubstitution(jobId, requirementId, evidence, orgId, actorAccountId)); }
  async factInferenceAudit(orgId: string, actorAccountId: string, input: { fact: string; inference: string; evidence: CapabilityEvidence[]; confidence?: number }) { return this.mutate(working=>working.factInferenceAudit(orgId, actorAccountId, input)); }
  async rejectionReasonAudit(jobId: string, orgId: string, actorAccountId: string, reason: string, evidence: CapabilityEvidence[]) { return this.mutate(working=>working.rejectionReasonAudit(jobId, orgId, actorAccountId, reason, evidence)); }
  async counterfactualReview(orgId: string, actorAccountId: string, input: { decisionWithProxy: DecisionType; decisionWithoutProxy: DecisionType; proxyLabel: string }) { return this.mutate(working=>working.counterfactualReview(orgId, actorAccountId, input)); }
  async blindEvidenceReview(orgId: string, actorAccountId: string, input: { evidence: CapabilityEvidence[]; identityFields?: Record<string, unknown>; pedigreeFields?: Record<string, unknown> }) { return this.mutate(working=>working.blindEvidenceReview(orgId, actorAccountId, input)); }
  hiringSignalQuality(orgId: string, actorAccountId: string, observations: HiringOutcomeObservation[]) { return this.platform.hiringSignalQuality(orgId, actorAccountId, observations); }
  fairnessAuditTrail(orgId: string, actorAccountId: string) { return this.platform.fairnessAuditTrail(orgId, actorAccountId); }
  snapshot() { return this.platform.snapshot(); }

  async close() {
    await this.persistence.save(this.platform.snapshot());
    await this.persistence.close?.();
  }
}
