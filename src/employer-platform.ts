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
import { evaluateAssessment, type AssessmentDefinition, type AssessmentMode, type AssessmentObservation, type AssessmentResult } from './verified-assessments.js';

export type EmployerRole = 'owner' | 'admin' | 'recruiter' | 'hiring-manager' | 'viewer';
export type CandidateVisibility = 'private' | 'matched-employers' | 'discoverable';
export type EmployerCandidateStage = 'sourced'|'contacted'|'screen'|'assessment'|'interview'|'finalist'|'offer'|'hired'|'rejected'|'withdrawn';
export type EmployerCandidateSource = 'marketplace'|'inbound-application'|'employer-pool'|'external-authorized';
export type EmployerCandidateConsentBasis = 'candidate-sharing-consent'|'candidate-application'|'employer-lawful-source';
export type EmployerCandidateAccessStatus = 'active'|'consent-withdrawn';
export type EmployerSubscriptionPlan = 'free'|'starter'|'pro'|'enterprise';
export type EmployerSubscriptionStatus = 'inactive'|'active'|'past_due'|'canceled';
export type EmployerAssessmentStatus = 'current'|'stale';
export type EmployerOutcomeCheckpoint = 'hire'|'day-30'|'day-90'|'day-365'|'separation';

export interface EmployerSubscription {
  plan: EmployerSubscriptionPlan;
  status: EmployerSubscriptionStatus;
  customerRef?: string;
  subscriptionRef?: string;
  sourceEventCreatedAt?: number;
  updatedAt: string;
}

export interface EmployerMember { accountId: string; role: EmployerRole; joinedAt: string; }
export interface EmployerOrganization { id: string; name: string; createdAt: string; members: EmployerMember[]; subscription: EmployerSubscription; }

export interface EmployerJob {
  id: string;
  organizationId: string;
  version: number;
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

export interface EmployerCandidateStageEvent { stage: EmployerCandidateStage; at: string; actorAccountId: string; reason?: string; jobVersion?: number; }

export interface EmployerCandidatePipelineRecord {
  id: string;
  organizationId: string;
  jobId: string;
  jobVersionAtEntry: number;
  terminalJobVersion?: number;
  candidateId: string;
  source: EmployerCandidateSource;
  consentBasis: EmployerCandidateConsentBasis;
  accessStatus: EmployerCandidateAccessStatus;
  accessRevokedAt?: string;
  stage: EmployerCandidateStage;
  stageHistory: EmployerCandidateStageEvent[];
  evidenceDigest?: string;
  assessmentIds: string[];
  notes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EmployerAssessmentRecord {
  id: string;
  organizationId: string;
  jobId: string;
  jobVersion: number;
  status: EmployerAssessmentStatus;
  staleAt?: string;
  pipelineRecordId: string;
  candidateId: string;
  definition: AssessmentDefinition;
  result: AssessmentResult;
  createdBy: string;
  createdAt: string;
}

export interface EmployerHiringOutcomeRecord {
  id: string;
  organizationId: string;
  jobId: string;
  jobVersion: number;
  pipelineRecordId: string;
  candidateId: string;
  checkpoint: EmployerOutcomeCheckpoint;
  terminalStage: 'hired'|'rejected'|'withdrawn';
  assessmentIds: string[];
  offerAccepted?: boolean;
  performanceScore?: number;
  managerSatisfaction?: number;
  candidateSatisfaction?: number;
  retentionDays?: number;
  wouldHireAgain?: boolean;
  notes?: string;
  at: string;
  recordedBy: string;
}

export interface EmployerPlatformSnapshot {
  organizations: EmployerOrganization[];
  jobs: EmployerJob[];
  consent: CandidateSourcingConsent[];
  pipeline?: EmployerCandidatePipelineRecord[];
  assessments?: EmployerAssessmentRecord[];
  outcomes?: EmployerHiringOutcomeRecord[];
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
  sourced:new Set(['contacted','screen','rejected','withdrawn']),contacted:new Set(['screen','rejected','withdrawn']),screen:new Set(['assessment','interview','rejected','withdrawn']),assessment:new Set(['interview','finalist','rejected','withdrawn']),interview:new Set(['assessment','finalist','rejected','withdrawn']),finalist:new Set(['offer','rejected','withdrawn']),offer:new Set(['hired','rejected','withdrawn']),hired:new Set(),rejected:new Set(),withdrawn:new Set()
};

function normalizeOrganization(org:EmployerOrganization):EmployerOrganization{const now=new Date().toISOString();return {...structuredClone(org),subscription:org.subscription??{plan:'free',status:'inactive',updatedAt:now}};}
function normalizeJob(job:EmployerJob):EmployerJob{return {...structuredClone(job),version:Number.isInteger(job.version)&&job.version>0?job.version:1};}
function normalizePipelineRecord(record:EmployerCandidatePipelineRecord):EmployerCandidatePipelineRecord{return {...structuredClone(record),accessStatus:record.accessStatus??'active',jobVersionAtEntry:Number.isInteger(record.jobVersionAtEntry)&&record.jobVersionAtEntry>0?record.jobVersionAtEntry:1};}
function normalizeAssessment(record:EmployerAssessmentRecord):EmployerAssessmentRecord{return {...structuredClone(record),jobVersion:Number.isInteger(record.jobVersion)&&record.jobVersion>0?record.jobVersion:1,status:record.status??'current'};}
function score(value:number|undefined,label:string){if(value===undefined)return undefined;if(!Number.isFinite(value)||value<0||value>100)throw new Error(`${label} must be between 0 and 100`);return Math.round(value);}

function requirementsFor(job:EmployerJob):HiringRequirement[]{const hard=job.mustHaves.map((label,index)=>({id:`${job.id}:must:${index}`,label,capability:label,type:'skill' as const}));const preferred=job.preferred.map((label,index)=>({id:`${job.id}:preferred:${index}`,label,capability:label,type:'preferred' as const}));const outcomes=job.successOutcomes.map((label,index)=>({id:`${job.id}:outcome:${index}`,label,capability:label,type:'outcome' as const}));return [...hard,...preferred,...outcomes];}

export class EmployerPlatform {
  private readonly organizations = new Map<string, EmployerOrganization>();
  private readonly jobs = new Map<string, EmployerJob>();
  private readonly consent = new Map<string, CandidateSourcingConsent>();
  private readonly pipeline = new Map<string, EmployerCandidatePipelineRecord>();
  private readonly assessments = new Map<string, EmployerAssessmentRecord>();
  private readonly outcomes = new Map<string, EmployerHiringOutcomeRecord>();
  private readonly fairness = new Map<string, FairnessAuditTrail>();

  constructor(snapshot?:EmployerPlatformSnapshot){if(snapshot)this.restore(snapshot);}
  restore(snapshot:EmployerPlatformSnapshot){
    this.organizations.clear();this.jobs.clear();this.consent.clear();this.pipeline.clear();this.assessments.clear();this.outcomes.clear();this.fairness.clear();
    for(const raw of snapshot.organizations??[]){const org=normalizeOrganization(raw);this.organizations.set(org.id,org);this.fairness.set(org.id,new FairnessAuditTrail());}
    for(const raw of snapshot.jobs??[]){const job=normalizeJob(raw);this.jobs.set(job.id,job);}
    for(const consent of snapshot.consent??[])this.consent.set(consent.candidateId,structuredClone(consent));
    for(const record of snapshot.pipeline??[])this.pipeline.set(record.id,normalizePipelineRecord(record));
    for(const raw of snapshot.assessments??[]){const record=normalizeAssessment(raw);this.assessments.set(record.id,record);}
    for(const outcome of snapshot.outcomes??[])this.outcomes.set(outcome.id,structuredClone(outcome));
    for(const entry of snapshot.fairness??[]){const trail=this.fairness.get(entry.organizationId)??new FairnessAuditTrail();const target=(trail as unknown as {events:FairnessAuditEvent[]}).events;target.push(...structuredClone(entry.events??[]));this.fairness.set(entry.organizationId,trail);}
    return this.snapshot();
  }
  snapshot():EmployerPlatformSnapshot{return {organizations:[...this.organizations.values()].map(value=>structuredClone(value)),jobs:[...this.jobs.values()].map(value=>structuredClone(value)),consent:[...this.consent.values()].map(value=>structuredClone(value)),pipeline:[...this.pipeline.values()].map(value=>structuredClone(value)),assessments:[...this.assessments.values()].map(value=>structuredClone(value)),outcomes:[...this.outcomes.values()].map(value=>structuredClone(value)),fairness:[...this.fairness.entries()].map(([organizationId,trail])=>({organizationId,events:trail.list()}))};}

  createOrganization(name:string,ownerAccountId:string){if(!name.trim()||!ownerAccountId)throw new Error('organization name and owner required');const now=new Date().toISOString();const org:EmployerOrganization={id:id('org'),name:name.trim(),createdAt:now,members:[{accountId:ownerAccountId,role:'owner',joinedAt:now}],subscription:{plan:'free',status:'inactive',updatedAt:now}};this.organizations.set(org.id,org);this.fairness.set(org.id,new FairnessAuditTrail());return structuredClone(org);}
  organization(orgId:string){const org=this.organizations.get(orgId);return org?structuredClone(org):undefined;}
  organizationAccessTier(orgId:string):EmployerSubscriptionPlan{const org=this.organizations.get(orgId);if(!org)throw new Error('organization not found');return org.subscription.status==='active'?org.subscription.plan:'free';}
  setOrganizationSubscription(orgId:string,plan:EmployerSubscriptionPlan,status:EmployerSubscriptionStatus,{customerRef,subscriptionRef,eventCreatedAt}:{customerRef?:string;subscriptionRef?:string;eventCreatedAt?:number}={}){const org=this.organizations.get(orgId);if(!org)throw new Error('organization not found');if(Number.isSafeInteger(eventCreatedAt)&&Number(eventCreatedAt)<Number(org.subscription.sourceEventCreatedAt??0))return structuredClone(org);if(customerRef){const owner=[...this.organizations.values()].find(candidate=>candidate.id!==orgId&&candidate.subscription.customerRef===customerRef);if(owner)throw new Error('Stripe customer is already linked to another employer organization');if(org.subscription.customerRef&&org.subscription.customerRef!==customerRef)throw new Error('Stripe customer does not match this employer organization');}if(org.subscription.subscriptionRef&&subscriptionRef&&org.subscription.subscriptionRef!==subscriptionRef)throw new Error('Stripe subscription does not match this employer organization');const updatedAt=new Date().toISOString();org.subscription={plan,status,customerRef:customerRef??org.subscription.customerRef,subscriptionRef:subscriptionRef??org.subscription.subscriptionRef,sourceEventCreatedAt:Number.isSafeInteger(eventCreatedAt)?eventCreatedAt:org.subscription.sourceEventCreatedAt,updatedAt};this.organizations.set(org.id,org);return structuredClone(org);}
  private roleFor(orgId:string,accountId:string){return this.organizations.get(orgId)?.members.find(member=>member.accountId===accountId)?.role;}
  assertPermission(orgId:string,accountId:string,permission:string){const role=this.roleFor(orgId,accountId);if(!role||!permissions[role].has(permission))throw new Error(`permission denied: ${permission}`);return role;}
  addMember(orgId:string,actorAccountId:string,accountId:string,role:Exclude<EmployerRole,'owner'>){this.assertPermission(orgId,actorAccountId,'members:manage');const org=this.organizations.get(orgId)!;const existing=org.members.find(member=>member.accountId===accountId);if(existing)existing.role=role;else org.members.push({accountId,role,joinedAt:new Date().toISOString()});return structuredClone(org);}

  createJob(orgId:string,actorAccountId:string,input:Omit<EmployerJob,'id'|'organizationId'|'version'|'createdBy'|'createdAt'|'updatedAt'>){this.assertPermission(orgId,actorAccountId,'job:write');if(!input.title.trim())throw new Error('job title required');if(!input.responsibilities.length||!input.successOutcomes.length)throw new Error('real responsibilities and success outcomes are required');const now=new Date().toISOString();const job:EmployerJob={...structuredClone(input),id:id('employer_job'),organizationId:orgId,version:1,createdBy:actorAccountId,createdAt:now,updatedAt:now};this.jobs.set(job.id,job);return structuredClone(job);}
  updateJob(jobId:string,orgId:string,actorAccountId:string,patch:Partial<Omit<EmployerJob,'id'|'organizationId'|'version'|'createdBy'|'createdAt'|'updatedAt'>>){this.assertPermission(orgId,actorAccountId,'job:write');const job=this.jobs.get(jobId);if(!job||job.organizationId!==orgId)throw new Error('job not found');const next={...job,...structuredClone(patch),id:job.id,organizationId:orgId,createdBy:job.createdBy,createdAt:job.createdAt,version:job.version+1,updatedAt:new Date().toISOString()};if(!next.title.trim())throw new Error('job title required');if(!next.responsibilities.length||!next.successOutcomes.length)throw new Error('real responsibilities and success outcomes are required');this.jobs.set(job.id,next);for(const assessment of this.assessments.values())if(assessment.jobId===job.id&&assessment.status==='current'&&assessment.jobVersion<next.version){assessment.status='stale';assessment.staleAt=next.updatedAt;this.assessments.set(assessment.id,assessment);}this.fairness.get(orgId)?.record({actor:actorAccountId,action:'employer-role-version-updated',evidenceIds:[],rationale:`Role ${job.id} advanced from version ${job.version} to ${next.version}; prior assessments are stale for current-role decisions.`});return structuredClone(next);}
  listJobs(orgId:string,actorAccountId:string):EmployerJob[]{this.assertPermission(orgId,actorAccountId,'analytics:view');return [...this.jobs.values()].filter(job=>job.organizationId===orgId).map(job=>structuredClone(job));}

  setCandidateConsent(consent:CandidateSourcingConsent){if(!consent.candidateId)throw new Error('candidateId required');const next={...structuredClone(consent),updatedAt:new Date().toISOString()};this.consent.set(consent.candidateId,next);const revokedAt=next.updatedAt;for(const record of this.pipeline.values()){if(record.candidateId!==next.candidateId||record.source!=='marketplace'||record.accessStatus==='consent-withdrawn')continue;if(this.canOrganizationSourceCandidate(record.candidateId,record.organizationId))continue;record.accessStatus='consent-withdrawn';record.accessRevokedAt=revokedAt;record.updatedAt=revokedAt;if(!terminalStages.has(record.stage)){record.stage='withdrawn';record.terminalJobVersion=this.jobs.get(record.jobId)?.version??record.jobVersionAtEntry;record.stageHistory.push({stage:'withdrawn',at:revokedAt,actorAccountId:'candidate-consent',reason:'Candidate marketplace sourcing consent withdrawn.',jobVersion:record.terminalJobVersion});}this.pipeline.set(record.id,record);}return structuredClone(next);}
  candidateConsent(candidateId:string){const value=this.consent.get(candidateId);return value?structuredClone(value):undefined;}
  canOrganizationSourceCandidate(candidateId:string,orgId:string){const consent=this.consent.get(candidateId);if(!consent||consent.visibility==='private')return false;if(consent.blockedOrganizationIds.includes(orgId))return false;if(consent.visibility==='discoverable')return true;return consent.allowedOrganizationIds.includes(orgId);}

  addCandidateToPipeline(jobId:string,orgId:string,actorAccountId:string,input:{candidateId:string;source:EmployerCandidateSource;consentBasis:EmployerCandidateConsentBasis;evidenceDigest?:string;notes?:string[]}){this.assertPermission(orgId,actorAccountId,'candidate:source');const job=this.jobs.get(jobId);if(!job||job.organizationId!==orgId)throw new Error('job not found');if(!input.candidateId.trim())throw new Error('candidateId required');if(input.source==='marketplace'&&!this.canOrganizationSourceCandidate(input.candidateId,orgId))throw new Error('candidate marketplace sourcing consent required');if(input.source==='marketplace'&&input.consentBasis!=='candidate-sharing-consent')throw new Error('marketplace candidate requires candidate-sharing-consent basis');if(input.source==='inbound-application'&&input.consentBasis!=='candidate-application')throw new Error('inbound application requires candidate-application consent basis');const existing=[...this.pipeline.values()].find(record=>record.jobId===jobId&&record.candidateId===input.candidateId&&record.accessStatus==='active');if(existing)return structuredClone(existing);const now=new Date().toISOString();const record:EmployerCandidatePipelineRecord={id:id('pipeline_candidate'),organizationId:orgId,jobId,jobVersionAtEntry:job.version,candidateId:input.candidateId,source:input.source,consentBasis:input.consentBasis,accessStatus:'active',stage:'sourced',stageHistory:[{stage:'sourced',at:now,actorAccountId,reason:`Added from ${input.source}`,jobVersion:job.version}],evidenceDigest:input.evidenceDigest,assessmentIds:[],notes:[...(input.notes??[])],createdAt:now,updatedAt:now};this.pipeline.set(record.id,record);return structuredClone(record);}
  listPipeline(jobId:string,orgId:string,actorAccountId:string){this.assertPermission(orgId,actorAccountId,'candidate:view');const job=this.jobs.get(jobId);if(!job||job.organizationId!==orgId)throw new Error('job not found');return [...this.pipeline.values()].filter(record=>record.jobId===jobId&&record.organizationId===orgId).map(record=>{const copy=structuredClone(record);if(copy.accessStatus==='consent-withdrawn'){copy.evidenceDigest=undefined;copy.assessmentIds=[];copy.notes=[];}return copy;});}
  transitionCandidate(recordId:string,orgId:string,actorAccountId:string,stage:EmployerCandidateStage,reason?:string){this.assertPermission(orgId,actorAccountId,'candidate:write');const record=this.pipeline.get(recordId);if(!record||record.organizationId!==orgId)throw new Error('pipeline candidate not found');if(record.accessStatus==='consent-withdrawn')throw new Error('candidate access was withdrawn; active pipeline actions are disabled');if(record.stage===stage)return structuredClone(record);if(terminalStages.has(record.stage))throw new Error(`pipeline candidate is already terminal: ${record.stage}`);if(!allowedTransitions[record.stage].has(stage))throw new Error(`invalid candidate stage transition: ${record.stage} -> ${stage}`);if(stage==='rejected'&&!reason?.trim())throw new Error('rejection transition requires a reason');const job=this.jobs.get(record.jobId);if(!job)throw new Error('job not found');if(stage==='finalist'||stage==='offer'||stage==='hired'){const stale=record.assessmentIds.map(assessmentId=>this.assessments.get(assessmentId)).filter((assessment):assessment is EmployerAssessmentRecord=>Boolean(assessment)).some(assessment=>assessment.status==='stale'||assessment.jobVersion!==job.version);if(stale)throw new Error('stale assessment blocks finalist, offer, or hire decision; reassess against the current role version');}const now=new Date().toISOString();record.stage=stage;record.updatedAt=now;if(terminalStages.has(stage))record.terminalJobVersion=job.version;record.stageHistory.push({stage,at:now,actorAccountId,reason:reason?.trim()||undefined,jobVersion:job.version});this.pipeline.set(record.id,record);return structuredClone(record);}
  governedRejection(recordId:string,orgId:string,actorAccountId:string,input:{reason:string;evidence:CapabilityEvidence[]}){this.assertPermission(orgId,actorAccountId,'candidate:write');const record=this.pipeline.get(recordId);if(!record||record.organizationId!==orgId)throw new Error('pipeline candidate not found');if(record.accessStatus==='consent-withdrawn')throw new Error('candidate access was withdrawn; active pipeline actions are disabled');const job=this.jobs.get(record.jobId);if(!job)throw new Error('job not found');const check=checkRejectionReason(input.reason,requirementsFor(job),input.evidence);this.fairness.get(orgId)?.record({actor:actorAccountId,action:'governed-rejection',evidenceIds:input.evidence.map(item=>item.id),decision:check.valid?'reject':'challenge',rationale:check.valid?input.reason:(check.requiredImprovement??input.reason)});if(!check.valid)throw new Error(`rejection reason failed fairness gate: ${check.requiredImprovement??'job-relevant evidence required'}`);return this.transitionCandidate(recordId,orgId,actorAccountId,'rejected',input.reason);}

  evaluatePipelineAssessment(recordId:string,orgId:string,actorAccountId:string,input:{definition:AssessmentDefinition;observations:AssessmentObservation[];mode?:AssessmentMode}){this.assertPermission(orgId,actorAccountId,'candidate:write');const pipeline=this.pipeline.get(recordId);if(!pipeline||pipeline.organizationId!==orgId)throw new Error('pipeline candidate not found');if(pipeline.accessStatus==='consent-withdrawn')throw new Error('candidate access was withdrawn; assessments are disabled');const job=this.jobs.get(pipeline.jobId);if(!job)throw new Error('job not found');if(!input.definition.profession.trim())throw new Error('assessment profession required');const result=evaluateAssessment(input.definition,pipeline.candidateId,input.mode??'employer-requested',input.observations);const createdAt=new Date().toISOString();const record:EmployerAssessmentRecord={id:id('assessment_record'),organizationId:orgId,jobId:job.id,jobVersion:job.version,status:'current',pipelineRecordId:pipeline.id,candidateId:pipeline.candidateId,definition:structuredClone(input.definition),result,createdBy:actorAccountId,createdAt};this.assessments.set(record.id,record);if(!pipeline.assessmentIds.includes(record.id))pipeline.assessmentIds.push(record.id);pipeline.updatedAt=createdAt;this.pipeline.set(pipeline.id,pipeline);this.fairness.get(orgId)?.record({actor:actorAccountId,action:'verified-assessment-recorded',evidenceIds:[],decision:result.passed?'advance':undefined,rationale:`Assessment ${input.definition.title} scored ${result.score}/100 against role version ${job.version} with integrity digest ${result.integrityDigest}.`});return structuredClone(record);}
  assessmentRecord(assessmentRecordId:string,orgId:string,actorAccountId:string){this.assertPermission(orgId,actorAccountId,'candidate:view');const record=this.assessments.get(assessmentRecordId);if(!record||record.organizationId!==orgId)throw new Error('assessment record not found');return structuredClone(record);}
  attachPipelineAssessment(recordId:string,orgId:string,actorAccountId:string,assessmentId:string){this.assertPermission(orgId,actorAccountId,'candidate:write');const record=this.pipeline.get(recordId);if(!record||record.organizationId!==orgId)throw new Error('pipeline candidate not found');if(record.accessStatus==='consent-withdrawn')throw new Error('candidate access was withdrawn; assessments are disabled');if(!assessmentId.trim())throw new Error('assessmentId required');if(!record.assessmentIds.includes(assessmentId))record.assessmentIds.push(assessmentId);record.updatedAt=new Date().toISOString();this.pipeline.set(record.id,record);return structuredClone(record);}
  addPipelineNote(recordId:string,orgId:string,actorAccountId:string,note:string){this.assertPermission(orgId,actorAccountId,'candidate:write');const record=this.pipeline.get(recordId);if(!record||record.organizationId!==orgId)throw new Error('pipeline candidate not found');if(record.accessStatus==='consent-withdrawn')throw new Error('candidate access was withdrawn; notes are disabled');if(!note.trim())throw new Error('note required');record.notes.push(note.trim());record.updatedAt=new Date().toISOString();this.pipeline.set(record.id,record);return structuredClone(record);}

  recordHiringOutcome(recordId:string,orgId:string,actorAccountId:string,input:{checkpoint:EmployerOutcomeCheckpoint;offerAccepted?:boolean;performanceScore?:number;managerSatisfaction?:number;candidateSatisfaction?:number;retentionDays?:number;wouldHireAgain?:boolean;notes?:string;at?:string}){this.assertPermission(orgId,actorAccountId,'analytics:view');const pipeline=this.pipeline.get(recordId);if(!pipeline||pipeline.organizationId!==orgId)throw new Error('pipeline candidate not found');if(!terminalStages.has(pipeline.stage))throw new Error('hiring outcome requires a terminal candidate decision');const terminalStage=pipeline.stage as 'hired'|'rejected'|'withdrawn';if(input.checkpoint!=='hire'&&terminalStage!=='hired')throw new Error('post-hire checkpoints require a hired candidate');if(input.retentionDays!==undefined&&(!Number.isInteger(input.retentionDays)||input.retentionDays<0))throw new Error('retentionDays must be a non-negative integer');const at=input.at??new Date().toISOString();if(Number.isNaN(Date.parse(at)))throw new Error('valid outcome timestamp required');const jobVersion=pipeline.terminalJobVersion??pipeline.jobVersionAtEntry;const assessmentIds=pipeline.assessmentIds.filter(assessmentId=>this.assessments.get(assessmentId)?.jobVersion===jobVersion);const existing=[...this.outcomes.values()].find(outcome=>outcome.pipelineRecordId===pipeline.id&&outcome.checkpoint===input.checkpoint);const record:EmployerHiringOutcomeRecord={id:existing?.id??id('employer_outcome'),organizationId:orgId,jobId:pipeline.jobId,jobVersion,pipelineRecordId:pipeline.id,candidateId:pipeline.candidateId,checkpoint:input.checkpoint,terminalStage,assessmentIds,offerAccepted:input.offerAccepted,performanceScore:score(input.performanceScore,'performanceScore'),managerSatisfaction:score(input.managerSatisfaction,'managerSatisfaction'),candidateSatisfaction:score(input.candidateSatisfaction,'candidateSatisfaction'),retentionDays:input.retentionDays,wouldHireAgain:input.wouldHireAgain,notes:input.notes?.trim()||undefined,at,recordedBy:actorAccountId};this.outcomes.set(record.id,record);return structuredClone(record);}
  hiringOutcomes(orgId:string,actorAccountId:string,jobId?:string){this.assertPermission(orgId,actorAccountId,'analytics:view');return [...this.outcomes.values()].filter(outcome=>outcome.organizationId===orgId&&(!jobId||outcome.jobId===jobId)).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)).map(outcome=>structuredClone(outcome));}

  structuredInterview(jobId:string,orgId:string,actorAccountId:string){this.assertPermission(orgId,actorAccountId,'candidate:view');const job=this.jobs.get(jobId);if(!job||job.organizationId!==orgId)throw new Error('job not found');return buildStructuredInterview(requirementsFor(job));}
  evidenceSubstitution(jobId:string,requirementId:string,evidence:CapabilityEvidence[],orgId:string,actorAccountId:string){this.assertPermission(orgId,actorAccountId,'candidate:view');const job=this.jobs.get(jobId);if(!job||job.organizationId!==orgId)throw new Error('job not found');const requirement=requirementsFor(job).find(r=>r.id===requirementId);if(!requirement)throw new Error('requirement not found');const result=evaluateEvidenceSubstitution(requirement,evidence);this.fairness.get(orgId)?.record({actor:actorAccountId,action:'evidence-substitution-review',requirement:requirement.label,evidenceIds:evidence.map(e=>e.id),rationale:result.explanation});return result;}
  factInferenceAudit(orgId:string,actorAccountId:string,input:{fact:string;inference:string;evidence:CapabilityEvidence[];confidence?:number}){this.assertPermission(orgId,actorAccountId,'candidate:view');const result=auditFactInference(input);this.fairness.get(orgId)?.record({actor:actorAccountId,action:'fact-inference-audit',fact:result.fact,inference:result.inference,evidenceIds:result.evidence.map(e=>e.id),confidence:result.confidence,rationale:result.challenge??'Inference supported by supplied verified evidence.'});return result;}
  rejectionReasonAudit(jobId:string,orgId:string,actorAccountId:string,reason:string,evidence:CapabilityEvidence[]){this.assertPermission(orgId,actorAccountId,'candidate:view');const job=this.jobs.get(jobId);if(!job||job.organizationId!==orgId)throw new Error('job not found');const result=checkRejectionReason(reason,requirementsFor(job),evidence);this.fairness.get(orgId)?.record({actor:actorAccountId,action:'rejection-reason-audit',evidenceIds:evidence.map(e=>e.id),decision:result.valid?'reject':'challenge',rationale:result.requiredImprovement??reason});return result;}
  counterfactualReview(orgId:string,actorAccountId:string,input:{decisionWithProxy:DecisionType;decisionWithoutProxy:DecisionType;proxyLabel:string}){this.assertPermission(orgId,actorAccountId,'candidate:view');const result=counterfactualCandidateReview(input);this.fairness.get(orgId)?.record({actor:actorAccountId,action:'counterfactual-review',evidenceIds:[],decision:result.inconsistent?'challenge':input.decisionWithoutProxy,rationale:result.explanation});return result;}
  blindEvidenceReview(orgId:string,actorAccountId:string,input:{evidence:CapabilityEvidence[];identityFields?:Record<string,unknown>;pedigreeFields?:Record<string,unknown>}){this.assertPermission(orgId,actorAccountId,'candidate:view');const result=buildBlindEvidencePacket(input);this.fairness.get(orgId)?.record({actor:actorAccountId,action:'blind-evidence-packet',evidenceIds:result.evidence.map(e=>e.id),rationale:`Removed ${result.removedFields.length} unnecessary identity/pedigree fields from initial evidence review.`});return result;}
  hiringSignalQuality(orgId:string,actorAccountId:string,observations:HiringOutcomeObservation[]){this.assertPermission(orgId,actorAccountId,'analytics:view');return summarizeHiringSignalQuality(observations);}
  fairnessAuditTrail(orgId:string,actorAccountId:string){this.assertPermission(orgId,actorAccountId,'analytics:view');return this.fairness.get(orgId)?.list()??[];}
}
