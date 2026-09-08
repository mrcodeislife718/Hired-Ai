import type { CapabilityEvidence, DecisionType, HiringOutcomeObservation } from './bias-resistant-hiring.js';
import type { AssessmentDefinition, AssessmentMode, AssessmentObservation } from './verified-assessments.js';
import { employerPersistenceFromEnv, type EmployerPersistenceAdapter } from './employer-persistence.js';
import {
  EmployerPlatform,
  type CandidateSourcingConsent,
  type EmployerCandidateConsentBasis,
  type EmployerCandidateSource,
  type EmployerCandidateStage,
  type EmployerJob,
  type EmployerRole,
  type EmployerSubscriptionPlan,
  type EmployerSubscriptionStatus
} from './employer-platform.js';

/** Canonical durable boundary for employer-side state. */
export class DurableEmployerPlatform {
  readonly platform: EmployerPlatform;
  private constructor(platform: EmployerPlatform, private readonly persistence: EmployerPersistenceAdapter) { this.platform = platform; }
  static async create(persistence: EmployerPersistenceAdapter = employerPersistenceFromEnv()) { const snapshot = await persistence.load(); return new DurableEmployerPlatform(new EmployerPlatform(snapshot), persistence); }
  private async mutate<T>(operation:(working:EmployerPlatform)=>T):Promise<T>{let result!:T;const apply=(current:ReturnType<EmployerPlatform['snapshot']>|undefined)=>{const working=new EmployerPlatform(current);result=operation(working);return working.snapshot();};const next=this.persistence.mutate?await this.persistence.mutate(apply):apply(this.platform.snapshot());if(!this.persistence.mutate)await this.persistence.save(next);this.platform.restore(next);return result;}

  async createOrganization(name:string,ownerAccountId:string){return this.mutate(working=>working.createOrganization(name,ownerAccountId));}
  async addMember(orgId:string,actorAccountId:string,accountId:string,role:Exclude<EmployerRole,'owner'>){return this.mutate(working=>working.addMember(orgId,actorAccountId,accountId,role));}
  async createJob(orgId:string,actorAccountId:string,input:Omit<EmployerJob,'id'|'organizationId'|'createdBy'|'createdAt'|'updatedAt'>){return this.mutate(working=>working.createJob(orgId,actorAccountId,input));}
  async setCandidateConsent(consent:CandidateSourcingConsent){return this.mutate(working=>working.setCandidateConsent(consent));}
  async setOrganizationSubscription(orgId:string,plan:EmployerSubscriptionPlan,status:EmployerSubscriptionStatus,refs:{customerRef?:string;subscriptionRef?:string;eventCreatedAt?:number}={}){return this.mutate(working=>working.setOrganizationSubscription(orgId,plan,status,refs));}
  async addCandidateToPipeline(jobId:string,orgId:string,actorAccountId:string,input:{candidateId:string;source:EmployerCandidateSource;consentBasis:EmployerCandidateConsentBasis;evidenceDigest?:string;notes?:string[]}){return this.mutate(working=>working.addCandidateToPipeline(jobId,orgId,actorAccountId,input));}
  async transitionCandidate(recordId:string,orgId:string,actorAccountId:string,stage:EmployerCandidateStage,reason?:string){return this.mutate(working=>working.transitionCandidate(recordId,orgId,actorAccountId,stage,reason));}
  async governedRejection(recordId:string,orgId:string,actorAccountId:string,input:{reason:string;evidence:CapabilityEvidence[]}){return this.mutate(working=>working.governedRejection(recordId,orgId,actorAccountId,input));}
  async evaluatePipelineAssessment(recordId:string,orgId:string,actorAccountId:string,input:{definition:AssessmentDefinition;observations:AssessmentObservation[];mode?:AssessmentMode}){return this.mutate(working=>working.evaluatePipelineAssessment(recordId,orgId,actorAccountId,input));}
  async attachPipelineAssessment(recordId:string,orgId:string,actorAccountId:string,assessmentId:string){return this.mutate(working=>working.attachPipelineAssessment(recordId,orgId,actorAccountId,assessmentId));}
  async addPipelineNote(recordId:string,orgId:string,actorAccountId:string,note:string){return this.mutate(working=>working.addPipelineNote(recordId,orgId,actorAccountId,note));}

  organization(orgId:string){return this.platform.organization(orgId);}
  organizationAccessTier(orgId:string){return this.platform.organizationAccessTier(orgId);}
  listJobs(orgId:string,actorAccountId:string){return this.platform.listJobs(orgId,actorAccountId);}
  candidateConsent(candidateId:string){return this.platform.candidateConsent(candidateId);}
  canOrganizationSourceCandidate(candidateId:string,orgId:string){return this.platform.canOrganizationSourceCandidate(candidateId,orgId);}
  listPipeline(jobId:string,orgId:string,actorAccountId:string){return this.platform.listPipeline(jobId,orgId,actorAccountId);}
  assessmentRecord(assessmentRecordId:string,orgId:string,actorAccountId:string){return this.platform.assessmentRecord(assessmentRecordId,orgId,actorAccountId);}
  structuredInterview(jobId:string,orgId:string,actorAccountId:string){return this.platform.structuredInterview(jobId,orgId,actorAccountId);}
  async evidenceSubstitution(jobId:string,requirementId:string,evidence:CapabilityEvidence[],orgId:string,actorAccountId:string){return this.mutate(working=>working.evidenceSubstitution(jobId,requirementId,evidence,orgId,actorAccountId));}
  async factInferenceAudit(orgId:string,actorAccountId:string,input:{fact:string;inference:string;evidence:CapabilityEvidence[];confidence?:number}){return this.mutate(working=>working.factInferenceAudit(orgId,actorAccountId,input));}
  async rejectionReasonAudit(jobId:string,orgId:string,actorAccountId:string,reason:string,evidence:CapabilityEvidence[]){return this.mutate(working=>working.rejectionReasonAudit(jobId,orgId,actorAccountId,reason,evidence));}
  async counterfactualReview(orgId:string,actorAccountId:string,input:{decisionWithProxy:DecisionType;decisionWithoutProxy:DecisionType;proxyLabel:string}){return this.mutate(working=>working.counterfactualReview(orgId,actorAccountId,input));}
  async blindEvidenceReview(orgId:string,actorAccountId:string,input:{evidence:CapabilityEvidence[];identityFields?:Record<string,unknown>;pedigreeFields?:Record<string,unknown>}){return this.mutate(working=>working.blindEvidenceReview(orgId,actorAccountId,input));}
  hiringSignalQuality(orgId:string,actorAccountId:string,observations:HiringOutcomeObservation[]){return this.platform.hiringSignalQuality(orgId,actorAccountId,observations);}
  fairnessAuditTrail(orgId:string,actorAccountId:string){return this.platform.fairnessAuditTrail(orgId,actorAccountId);}
  snapshot(){return this.platform.snapshot();}
  async close(){await this.persistence.save(this.platform.snapshot());await this.persistence.close?.();}
}
