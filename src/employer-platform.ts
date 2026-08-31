import { id } from './utils.js';
import {
  FairnessAuditTrail,
  auditFactInference,
  buildBlindEvidencePacket,
  buildStructuredInterview,
  checkRejectionReason,
  counterfactualCandidateReview,
  evaluateEvidenceSubstitution,
  summarizeHiringSignalQuality,
  type CapabilityEvidence,
  type HiringOutcomeObservation,
  type HiringRequirement,
  type DecisionType,
  type FairnessAuditEvent
} from './bias-resistant-hiring.js';

export type EmployerRole = 'owner' | 'admin' | 'recruiter' | 'hiring-manager' | 'viewer';
export type CandidateVisibility = 'private' | 'matched-employers' | 'discoverable';

export interface EmployerMember { accountId: string; role: EmployerRole; joinedAt: string; }
export interface EmployerOrganization { id: string; name: string; createdAt: string; members: EmployerMember[]; }

export interface EmployerJob {
  id: string;
  organizationId: string;
  title: string;
  location: string;
  workMode: 'onsite' | 'hybrid' | 'remote';
  salaryMin?: number;
  salaryMax?: number;
  responsibilities: string[];
  mustHaves: string[];
  trainable: string[];
  preferred: string[];
  teamContext: string[];
  successOutcomes: string[];
  status: 'draft' | 'open' | 'paused' | 'closed';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CandidateSourcingConsent {
  candidateId: string;
  visibility: CandidateVisibility;
  allowedOrganizationIds: string[];
  blockedOrganizationIds: string[];
  shareCompensationTarget: boolean;
  shareCareerPreferences: boolean;
  updatedAt: string;
}

export interface EmployerPlatformSnapshot {
  organizations: EmployerOrganization[];
  jobs: EmployerJob[];
  consent: CandidateSourcingConsent[];
  fairness: Array<{organizationId:string;events:FairnessAuditEvent[]}>;
}

const permissions: Record<EmployerRole, Set<string>> = {
  owner: new Set(['org:manage','members:manage','job:write','candidate:source','candidate:view','analytics:view']),
  admin: new Set(['members:manage','job:write','candidate:source','candidate:view','analytics:view']),
  recruiter: new Set(['job:write','candidate:source','candidate:view','analytics:view']),
  'hiring-manager': new Set(['job:write','candidate:view','analytics:view']),
  viewer: new Set(['analytics:view'])
};

function requirementsFor(job:EmployerJob):HiringRequirement[]{
  const hard=job.mustHaves.map((label,index)=>({id:`${job.id}:must:${index}`,label,capability:label,type:'skill' as const}));
  const preferred=job.preferred.map((label,index)=>({id:`${job.id}:preferred:${index}`,label,capability:label,type:'preferred' as const}));
  const outcomes=job.successOutcomes.map((label,index)=>({id:`${job.id}:outcome:${index}`,label,capability:label,type:'outcome' as const}));
  return [...hard,...preferred,...outcomes];
}

export class EmployerPlatform {
  private readonly organizations = new Map<string, EmployerOrganization>();
  private readonly jobs = new Map<string, EmployerJob>();
  private readonly consent = new Map<string, CandidateSourcingConsent>();
  private readonly fairness = new Map<string, FairnessAuditTrail>();

  constructor(snapshot?:EmployerPlatformSnapshot){if(snapshot)this.restore(snapshot);}

  restore(snapshot:EmployerPlatformSnapshot){
    this.organizations.clear();this.jobs.clear();this.consent.clear();this.fairness.clear();
    for(const org of snapshot.organizations??[]){this.organizations.set(org.id,structuredClone(org));this.fairness.set(org.id,new FairnessAuditTrail());}
    for(const job of snapshot.jobs??[])this.jobs.set(job.id,structuredClone(job));
    for(const consent of snapshot.consent??[])this.consent.set(consent.candidateId,structuredClone(consent));
    for(const entry of snapshot.fairness??[]){
      const trail=this.fairness.get(entry.organizationId)??new FairnessAuditTrail();
      // Preserve historical timestamps during recovery without exposing mutation publicly.
      const target=(trail as unknown as {events:FairnessAuditEvent[]}).events;
      target.push(...structuredClone(entry.events??[]));
      this.fairness.set(entry.organizationId,trail);
    }
    return this.snapshot();
  }

  snapshot():EmployerPlatformSnapshot{
    return {
      organizations:[...this.organizations.values()].map(value=>structuredClone(value)),
      jobs:[...this.jobs.values()].map(value=>structuredClone(value)),
      consent:[...this.consent.values()].map(value=>structuredClone(value)),
      fairness:[...this.fairness.entries()].map(([organizationId,trail])=>({organizationId,events:trail.list()}))
    };
  }

  createOrganization(name: string, ownerAccountId: string) {
    if (!name.trim() || !ownerAccountId) throw new Error('organization name and owner required');
    const now = new Date().toISOString();
    const org: EmployerOrganization = { id:id('org'), name:name.trim(), createdAt:now, members:[{ accountId:ownerAccountId, role:'owner', joinedAt:now }] };
    this.organizations.set(org.id, org);
    this.fairness.set(org.id,new FairnessAuditTrail());
    return structuredClone(org);
  }

  organization(orgId: string) { const org=this.organizations.get(orgId); return org ? structuredClone(org) : undefined; }

  private roleFor(orgId: string, accountId: string) { return this.organizations.get(orgId)?.members.find(member => member.accountId === accountId)?.role; }
  assertPermission(orgId: string, accountId: string, permission: string) {
    const role = this.roleFor(orgId, accountId);
    if (!role || !permissions[role].has(permission)) throw new Error(`permission denied: ${permission}`);
    return role;
  }

  addMember(orgId: string, actorAccountId: string, accountId: string, role: Exclude<EmployerRole,'owner'>) {
    this.assertPermission(orgId, actorAccountId, 'members:manage');
    const org = this.organizations.get(orgId)!;
    const existing = org.members.find(member => member.accountId === accountId);
    if (existing) existing.role = role;
    else org.members.push({ accountId, role, joinedAt:new Date().toISOString() });
    return structuredClone(org);
  }

  createJob(orgId: string, actorAccountId: string, input: Omit<EmployerJob,'id'|'organizationId'|'createdBy'|'createdAt'|'updatedAt'>) {
    this.assertPermission(orgId, actorAccountId, 'job:write');
    if (!input.title.trim()) throw new Error('job title required');
    if (!input.responsibilities.length || !input.successOutcomes.length) throw new Error('real responsibilities and success outcomes are required');
    const now = new Date().toISOString();
    const job: EmployerJob = { ...structuredClone(input), id:id('employer_job'), organizationId:orgId, createdBy:actorAccountId, createdAt:now, updatedAt:now };
    this.jobs.set(job.id, job);
    return structuredClone(job);
  }

  listJobs(orgId: string, actorAccountId: string): EmployerJob[] {
    this.assertPermission(orgId, actorAccountId, 'analytics:view');
    return [...this.jobs.values()].filter(job => job.organizationId === orgId).map(job => structuredClone(job));
  }

  setCandidateConsent(consent: CandidateSourcingConsent) {
    if (!consent.candidateId) throw new Error('candidateId required');
    const next = { ...structuredClone(consent), updatedAt:new Date().toISOString() };
    this.consent.set(consent.candidateId, next);
    return structuredClone(next);
  }

  candidateConsent(candidateId: string) { const value=this.consent.get(candidateId); return value ? structuredClone(value) : undefined; }

  canOrganizationSourceCandidate(candidateId: string, orgId: string) {
    const consent = this.consent.get(candidateId);
    if (!consent || consent.visibility === 'private') return false;
    if (consent.blockedOrganizationIds.includes(orgId)) return false;
    if (consent.visibility === 'discoverable') return true;
    return consent.allowedOrganizationIds.includes(orgId);
  }

  structuredInterview(jobId:string,orgId:string,actorAccountId:string){
    this.assertPermission(orgId,actorAccountId,'candidate:view');
    const job=this.jobs.get(jobId);if(!job||job.organizationId!==orgId)throw new Error('job not found');
    return buildStructuredInterview(requirementsFor(job));
  }

  evidenceSubstitution(jobId:string,requirementId:string,evidence:CapabilityEvidence[],orgId:string,actorAccountId:string){
    this.assertPermission(orgId,actorAccountId,'candidate:view');
    const job=this.jobs.get(jobId);if(!job||job.organizationId!==orgId)throw new Error('job not found');
    const requirement=requirementsFor(job).find(r=>r.id===requirementId);if(!requirement)throw new Error('requirement not found');
    const result=evaluateEvidenceSubstitution(requirement,evidence);
    this.fairness.get(orgId)?.record({actor:actorAccountId,action:'evidence-substitution-review',requirement:requirement.label,evidenceIds:evidence.map(e=>e.id),rationale:result.explanation});
    return result;
  }

  factInferenceAudit(orgId:string,actorAccountId:string,input:{fact:string;inference:string;evidence:CapabilityEvidence[];confidence?:number}){
    this.assertPermission(orgId,actorAccountId,'candidate:view');
    const result=auditFactInference(input);
    this.fairness.get(orgId)?.record({actor:actorAccountId,action:'fact-inference-audit',fact:result.fact,inference:result.inference,evidenceIds:result.evidence.map(e=>e.id),confidence:result.confidence,rationale:result.challenge??'Inference supported by supplied verified evidence.'});
    return result;
  }

  rejectionReasonAudit(jobId:string,orgId:string,actorAccountId:string,reason:string,evidence:CapabilityEvidence[]){
    this.assertPermission(orgId,actorAccountId,'candidate:view');
    const job=this.jobs.get(jobId);if(!job||job.organizationId!==orgId)throw new Error('job not found');
    const result=checkRejectionReason(reason,requirementsFor(job),evidence);
    this.fairness.get(orgId)?.record({actor:actorAccountId,action:'rejection-reason-audit',evidenceIds:evidence.map(e=>e.id),decision:result.valid?'reject':'challenge',rationale:result.requiredImprovement??reason});
    return result;
  }

  counterfactualReview(orgId:string,actorAccountId:string,input:{decisionWithProxy:DecisionType;decisionWithoutProxy:DecisionType;proxyLabel:string}){
    this.assertPermission(orgId,actorAccountId,'candidate:view');
    const result=counterfactualCandidateReview(input);
    this.fairness.get(orgId)?.record({actor:actorAccountId,action:'counterfactual-review',evidenceIds:[],decision:result.inconsistent?'challenge':input.decisionWithoutProxy,rationale:result.explanation});
    return result;
  }

  blindEvidenceReview(orgId:string,actorAccountId:string,input:{evidence:CapabilityEvidence[];identityFields?:Record<string,unknown>;pedigreeFields?:Record<string,unknown>}){
    this.assertPermission(orgId,actorAccountId,'candidate:view');
    const result=buildBlindEvidencePacket(input);
    this.fairness.get(orgId)?.record({actor:actorAccountId,action:'blind-evidence-packet',evidenceIds:result.evidence.map(e=>e.id),rationale:`Removed ${result.removedFields.length} unnecessary identity/pedigree fields from initial evidence review.`});
    return result;
  }

  hiringSignalQuality(orgId:string,actorAccountId:string,observations:HiringOutcomeObservation[]){
    this.assertPermission(orgId,actorAccountId,'analytics:view');
    return summarizeHiringSignalQuality(observations);
  }

  fairnessAuditTrail(orgId:string,actorAccountId:string){
    this.assertPermission(orgId,actorAccountId,'analytics:view');
    return this.fairness.get(orgId)?.list()??[];
  }
}
