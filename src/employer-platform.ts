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
export type EmployerCandidateStage = 'sourced'|'contacted'|'screen'|'assessment'|'interview'|'finalist'|'offer'|'hired'|'rejected'|'withdrawn';
export type EmployerCandidateSource = 'marketplace'|'inbound-application'|'employer-pool'|'external-authorized';
export type EmployerCandidateConsentBasis = 'candidate-sharing-consent'|'candidate-application'|'employer-lawful-source';

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

export interface EmployerCandidateStageEvent {
  stage: EmployerCandidateStage;
  at: string;
  actorAccountId: string;
  reason?: string;
}

export interface EmployerCandidatePipelineRecord {
  id: string;
  organizationId: string;
  jobId: string;
  candidateId: string;
  source: EmployerCandidateSource;
  consentBasis: EmployerCandidateConsentBasis;
  stage: EmployerCandidateStage;
  stageHistory: EmployerCandidateStageEvent[];
  evidenceDigest?: string;
  assessmentIds: string[];
  notes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EmployerPlatformSnapshot {
  organizations: EmployerOrganization[];
  jobs: EmployerJob[];
  consent: CandidateSourcingConsent[];
  pipeline?: EmployerCandidatePipelineRecord[];
  fairness: Array<{organizationId:string;events:FairnessAuditEvent[]}>;
}

const permissions: Record<EmployerRole, Set<string>> = {
  owner: new Set(['org:manage','members:manage','job:write','candidate:source','candidate:view','candidate:write','analytics:view']),
  admin: new Set(['members:manage','job:write','candidate:source','candidate:view','candidate:write','analytics:view']),
  recruiter: new Set(['job:write','candidate:source','candidate:view','candidate:write','analytics:view']),
  'hiring-manager': new Set(['job:write','candidate:view','candidate:write','analytics:view']),
  viewer: new Set(['analytics:view'])
};

const terminalStages = new Set<EmployerCandidateStage>(['hired','rejected','withdrawn']);
const allowedTransitions: Record<EmployerCandidateStage, Set<EmployerCandidateStage>> = {
  sourced:new Set(['contacted','screen','rejected','withdrawn']),
  contacted:new Set(['screen','rejected','withdrawn']),
  screen:new Set(['assessment','interview','rejected','withdrawn']),
  assessment:new Set(['interview','finalist','rejected','withdrawn']),
  interview:new Set(['assessment','finalist','rejected','withdrawn']),
  finalist:new Set(['offer','rejected','withdrawn']),
  offer:new Set(['hired','rejected','withdrawn']),
  hired:new Set(),rejected:new Set(),withdrawn:new Set()
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
  private readonly pipeline = new Map<string, EmployerCandidatePipelineRecord>();
  private readonly fairness = new Map<string, FairnessAuditTrail>();

  constructor(snapshot?:EmployerPlatformSnapshot){if(snapshot)this.restore(snapshot);}

  restore(snapshot:EmployerPlatformSnapshot){
    this.organizations.clear();this.jobs.clear();this.consent.clear();this.pipeline.clear();this.fairness.clear();
    for(const org of snapshot.organizations??[]){this.organizations.set(org.id,structuredClone(org));this.fairness.set(org.id,new FairnessAuditTrail());}
    for(const job of snapshot.jobs??[])this.jobs.set(job.id,structuredClone(job));
    for(const consent of snapshot.consent??[])this.consent.set(consent.candidateId,structuredClone(consent));
    for(const record of snapshot.pipeline??[])this.pipeline.set(record.id,structuredClone(record));
    for(const entry of snapshot.fairness??[]){
      const trail=this.fairness.get(entry.organizationId)??new FairnessAuditTrail();
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
      pipeline:[...this.pipeline.values()].map(value=>structuredClone(value)),
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

  addCandidateToPipeline(jobId:string,orgId:string,actorAccountId:string,input:{candidateId:string;source:EmployerCandidateSource;consentBasis:EmployerCandidateConsentBasis;evidenceDigest?:string;notes?:string[]}){
    this.assertPermission(orgId,actorAccountId,'candidate:source');
    const job=this.jobs.get(jobId);if(!job||job.organizationId!==orgId)throw new Error('job not found');
    if(!input.candidateId.trim())throw new Error('candidateId required');
    if(input.source==='marketplace'&&!this.canOrganizationSourceCandidate(input.candidateId,orgId))throw new Error('candidate marketplace sourcing consent required');
    if(input.source==='marketplace'&&input.consentBasis!=='candidate-sharing-consent')throw new Error('marketplace candidate requires candidate-sharing-consent basis');
    if(input.source==='inbound-application'&&input.consentBasis!=='candidate-application')throw new Error('inbound application requires candidate-application consent basis');
    const existing=[...this.pipeline.values()].find(record=>record.jobId===jobId&&record.candidateId===input.candidateId);
    if(existing)return structuredClone(existing);
    const now=new Date().toISOString();
    const record:EmployerCandidatePipelineRecord={
      id:id('pipeline_candidate'),organizationId:orgId,jobId,candidateId:input.candidateId,source:input.source,consentBasis:input.consentBasis,stage:'sourced',
      stageHistory:[{stage:'sourced',at:now,actorAccountId,reason:`Added from ${input.source}`}],evidenceDigest:input.evidenceDigest,assessmentIds:[],notes:[...(input.notes??[])],createdAt:now,updatedAt:now
    };
    this.pipeline.set(record.id,record);
    return structuredClone(record);
  }

  listPipeline(jobId:string,orgId:string,actorAccountId:string){
    this.assertPermission(orgId,actorAccountId,'candidate:view');
    const job=this.jobs.get(jobId);if(!job||job.organizationId!==orgId)throw new Error('job not found');
    return [...this.pipeline.values()].filter(record=>record.jobId===jobId&&record.organizationId===orgId).map(record=>structuredClone(record));
  }

  transitionCandidate(recordId:string,orgId:string,actorAccountId:string,stage:EmployerCandidateStage,reason?:string){
    this.assertPermission(orgId,actorAccountId,'candidate:write');
    const record=this.pipeline.get(recordId);if(!record||record.organizationId!==orgId)throw new Error('pipeline candidate not found');
    if(record.stage===stage)return structuredClone(record);
    if(terminalStages.has(record.stage))throw new Error(`pipeline candidate is already terminal: ${record.stage}`);
    if(!allowedTransitions[record.stage].has(stage))throw new Error(`invalid candidate stage transition: ${record.stage} -> ${stage}`);
    if(stage==='rejected'&&!reason?.trim())throw new Error('rejection transition requires a reason');
    const now=new Date().toISOString();
    record.stage=stage;record.updatedAt=now;record.stageHistory.push({stage,at:now,actorAccountId,reason:reason?.trim()||undefined});
    this.pipeline.set(record.id,record);
    return structuredClone(record);
  }

  attachPipelineAssessment(recordId:string,orgId:string,actorAccountId:string,assessmentId:string){
    this.assertPermission(orgId,actorAccountId,'candidate:write');
    const record=this.pipeline.get(recordId);if(!record||record.organizationId!==orgId)throw new Error('pipeline candidate not found');
    if(!assessmentId.trim())throw new Error('assessmentId required');
    if(!record.assessmentIds.includes(assessmentId))record.assessmentIds.push(assessmentId);
    record.updatedAt=new Date().toISOString();this.pipeline.set(record.id,record);return structuredClone(record);
  }

  addPipelineNote(recordId:string,orgId:string,actorAccountId:string,note:string){
    this.assertPermission(orgId,actorAccountId,'candidate:write');
    const record=this.pipeline.get(recordId);if(!record||record.organizationId!==orgId)throw new Error('pipeline candidate not found');
    if(!note.trim())throw new Error('note required');
    record.notes.push(note.trim());record.updatedAt=new Date().toISOString();this.pipeline.set(record.id,record);return structuredClone(record);
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
