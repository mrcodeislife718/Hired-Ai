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
 * Mutations are persisted before they are acknowledged to callers.
 */
export class DurableEmployerPlatform {
  readonly platform: EmployerPlatform;

  private constructor(
    platform: EmployerPlatform,
    private readonly persistence: EmployerPersistenceAdapter
  ) {
    this.platform = platform;
  }

  static async create(persistence: EmployerPersistenceAdapter = employerPersistenceFromEnv()) {
    const snapshot = await persistence.load();
    return new DurableEmployerPlatform(new EmployerPlatform(snapshot), persistence);
  }

  private async commit<T>(value: T) {
    await this.persistence.save(this.platform.snapshot());
    return value;
  }

  async createOrganization(name: string, ownerAccountId: string) {
    return this.commit(this.platform.createOrganization(name, ownerAccountId));
  }

  async addMember(orgId: string, actorAccountId: string, accountId: string, role: Exclude<EmployerRole, 'owner'>) {
    return this.commit(this.platform.addMember(orgId, actorAccountId, accountId, role));
  }

  async createJob(
    orgId: string,
    actorAccountId: string,
    input: Omit<EmployerJob, 'id' | 'organizationId' | 'createdBy' | 'createdAt' | 'updatedAt'>
  ) {
    return this.commit(this.platform.createJob(orgId, actorAccountId, input));
  }

  async setCandidateConsent(consent: CandidateSourcingConsent) {
    return this.commit(this.platform.setCandidateConsent(consent));
  }

  organization(orgId: string) { return this.platform.organization(orgId); }
  listJobs(orgId: string, actorAccountId: string) { return this.platform.listJobs(orgId, actorAccountId); }
  candidateConsent(candidateId: string) { return this.platform.candidateConsent(candidateId); }
  canOrganizationSourceCandidate(candidateId: string, orgId: string) { return this.platform.canOrganizationSourceCandidate(candidateId, orgId); }
  structuredInterview(jobId: string, orgId: string, actorAccountId: string) { return this.platform.structuredInterview(jobId, orgId, actorAccountId); }
  evidenceSubstitution(jobId: string, requirementId: string, evidence: CapabilityEvidence[], orgId: string, actorAccountId: string) { return this.platform.evidenceSubstitution(jobId, requirementId, evidence, orgId, actorAccountId); }
  factInferenceAudit(orgId: string, actorAccountId: string, input: { fact: string; inference: string; evidence: CapabilityEvidence[]; confidence?: number }) { return this.platform.factInferenceAudit(orgId, actorAccountId, input); }
  rejectionReasonAudit(jobId: string, orgId: string, actorAccountId: string, reason: string, evidence: CapabilityEvidence[]) { return this.platform.rejectionReasonAudit(jobId, orgId, actorAccountId, reason, evidence); }
  counterfactualReview(orgId: string, actorAccountId: string, input: { decisionWithProxy: DecisionType; decisionWithoutProxy: DecisionType; proxyLabel: string }) { return this.platform.counterfactualReview(orgId, actorAccountId, input); }
  blindEvidenceReview(orgId: string, actorAccountId: string, input: { evidence: CapabilityEvidence[]; identityFields?: Record<string, unknown>; pedigreeFields?: Record<string, unknown> }) { return this.platform.blindEvidenceReview(orgId, actorAccountId, input); }
  hiringSignalQuality(orgId: string, actorAccountId: string, observations: HiringOutcomeObservation[]) { return this.platform.hiringSignalQuality(orgId, actorAccountId, observations); }
  fairnessAuditTrail(orgId: string, actorAccountId: string) { return this.platform.fairnessAuditTrail(orgId, actorAccountId); }
  snapshot() { return this.platform.snapshot(); }

  async close() {
    await this.persistence.save(this.platform.snapshot());
    await this.persistence.close?.();
  }
}
