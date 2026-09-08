import { createHash } from 'node:crypto';
import type { EmployerJob } from './employer-platform.js';

export type HiringCoverage = 'strong' | 'moderate' | 'weak' | 'missing';
export type HiringDecisionSignal = 'advance' | 'review' | 'hold' | 'do-not-advance';

export interface EmployerCandidateEvidence {
  id: string;
  candidateId: string;
  capability: string;
  claim: string;
  source: string;
  strength: number;
  verified: boolean;
}

export interface EmployerAssessmentSignal {
  candidateId: string;
  assessmentId: string;
  score: number;
  passed: boolean;
  integrityDigest: string;
}

export interface EmployerCandidateInput {
  candidateId: string;
  displayName?: string;
  consented: boolean;
  interested?: boolean;
  available?: boolean;
  compensationMinimum?: number;
  evidence: EmployerCandidateEvidence[];
  assessments?: EmployerAssessmentSignal[];
}

export interface RoleCalibration {
  qualityScore: number;
  strengths: string[];
  risks: string[];
  questions: string[];
  calibratedRequirements: Array<{label:string;kind:'must-have'|'trainable'|'preferred'|'outcome'}>;
}

export interface CandidateRequirementCoverage {
  requirement: string;
  kind: 'must-have' | 'trainable' | 'preferred' | 'outcome';
  coverage: HiringCoverage;
  evidenceIds: string[];
  explanation: string;
}

export interface EmployerCandidateEvaluation {
  candidateId: string;
  displayName?: string;
  eligible: boolean;
  decisionSignal: HiringDecisionSignal;
  score: number;
  coverage: CandidateRequirementCoverage[];
  assessmentScore?: number;
  positives: string[];
  risks: string[];
  unknowns: string[];
  provenanceDigest: string;
}

export interface EmployerHiringPlan {
  role: EmployerJob;
  calibration: RoleCalibration;
  shortlist: EmployerCandidateEvaluation[];
  excluded: EmployerCandidateEvaluation[];
  interviewPlan: Array<{stage:string;purpose:string;questions:string[]}>;
  nextActions: string[];
  decisionBoundary: string;
}

const norm=(value:string)=>value.trim().toLowerCase();
const clamp=(value:number)=>Math.max(0,Math.min(100,Math.round(value)));
const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

function includesCapability(evidence:EmployerCandidateEvidence,requirement:string){
  const req=norm(requirement);
  return norm(evidence.capability)===req || norm(evidence.capability).includes(req) || norm(evidence.claim).includes(req);
}

export function calibrateEmployerRole(job:EmployerJob):RoleCalibration {
  const strengths:string[]=[];const risks:string[]=[];const questions:string[]=[];
  if(job.responsibilities.length)strengths.push('real responsibilities are defined');
  if(job.successOutcomes.length)strengths.push('success outcomes are defined separately from credentials and keywords');
  if(job.trainable.length)strengths.push('the role explicitly distinguishes trainable capabilities from hard gates');
  if(job.salaryMin!==undefined||job.salaryMax!==undefined)strengths.push('compensation expectations are represented');
  else {risks.push('compensation range is unknown');questions.push('What compensation range is actually approved for this role?');}
  if(!job.teamContext.length){risks.push('team and working context are underspecified');questions.push('What team, manager, pace, autonomy and working conditions will the hire actually experience?');}
  if(job.mustHaves.length>8)risks.push('the must-have list is unusually large and may be collapsing preferences into hard gates');
  if(job.mustHaves.length && !job.trainable.length)risks.push('nothing is marked trainable; challenge whether every requirement is truly necessary on day one');
  if(!job.successOutcomes.length)risks.push('the role lacks observable success outcomes');
  const calibratedRequirements=[
    ...job.mustHaves.map(label=>({label,kind:'must-have' as const})),
    ...job.trainable.map(label=>({label,kind:'trainable' as const})),
    ...job.preferred.map(label=>({label,kind:'preferred' as const})),
    ...job.successOutcomes.map(label=>({label,kind:'outcome' as const}))
  ];
  const qualityScore=clamp(100-risks.length*14-Math.max(0,job.mustHaves.length-8)*3);
  return {qualityScore,strengths,risks,questions,calibratedRequirements};
}

function coverageFor(requirement:{label:string;kind:CandidateRequirementCoverage['kind']},evidence:EmployerCandidateEvidence[]):CandidateRequirementCoverage {
  const matched=evidence.filter(item=>includesCapability(item,requirement.label));
  const verified=matched.filter(item=>item.verified);
  const strongest=Math.max(0,...matched.map(item=>clamp(item.strength)));
  const coverage:HiringCoverage = verified.some(item=>item.strength>=80)?'strong'
    : matched.some(item=>item.strength>=65)?'moderate'
      : matched.length?'weak':'missing';
  return {
    requirement:requirement.label,
    kind:requirement.kind,
    coverage,
    evidenceIds:matched.map(item=>item.id),
    explanation:matched.length
      ? `${matched.length} attributable evidence item(s) support this requirement; strongest evidence score ${strongest}/100${verified.length?` with ${verified.length} verified item(s)`:''}.`
      : 'No attributable evidence supplied for this requirement.'
  };
}

export function evaluateEmployerCandidate(job:EmployerJob,input:EmployerCandidateInput):EmployerCandidateEvaluation {
  const calibration=calibrateEmployerRole(job);
  const coverage=calibration.calibratedRequirements.map(requirement=>coverageFor(requirement,input.evidence));
  const hard=coverage.filter(item=>item.kind==='must-have');
  const hardMissing=hard.filter(item=>item.coverage==='missing');
  const hardWeak=hard.filter(item=>item.coverage==='weak');
  const verifiedEvidence=input.evidence.filter(item=>item.verified);
  const assessments=(input.assessments??[]).filter(item=>item.candidateId===input.candidateId);
  const assessmentScore=assessments.length?Math.round(assessments.reduce((sum,item)=>sum+item.score,0)/assessments.length):undefined;
  const coveragePoints=coverage.reduce((sum,item)=>sum+({strong:100,moderate:72,weak:42,missing:0}[item.coverage]),0)/(coverage.length||1);
  const evidenceTrust=input.evidence.length?Math.round((verifiedEvidence.length/input.evidence.length)*100):0;
  const score=clamp(coveragePoints*.62+evidenceTrust*.18+(assessmentScore??65)*.2);
  const unknowns:string[]=[];const positives:string[]=[];const risks:string[]=[];
  if(!input.consented)risks.push('candidate has not consented to this employer sourcing context');
  if(input.interested===false)risks.push('candidate has indicated they are not interested');
  if(input.available===false)risks.push('candidate is not currently available');
  if(job.salaryMax!==undefined&&input.compensationMinimum!==undefined&&input.compensationMinimum>job.salaryMax)risks.push('candidate compensation floor exceeds the current role maximum');
  if(hardMissing.length)risks.push(`${hardMissing.length} must-have requirement(s) have no supplied evidence`);
  if(hardWeak.length)risks.push(`${hardWeak.length} must-have requirement(s) have only weak evidence`);
  if(!input.evidence.length)unknowns.push('no candidate capability evidence supplied');
  if(!assessments.length)unknowns.push('no role-relevant verified assessment supplied');
  if(input.interested===undefined)unknowns.push('candidate interest has not been confirmed');
  if(input.available===undefined)unknowns.push('candidate availability has not been confirmed');
  if(!hardMissing.length)positives.push('no must-have requirement is completely unsupported by the supplied evidence');
  if(verifiedEvidence.length)positives.push(`${verifiedEvidence.length} evidence item(s) are marked verified`);
  if(assessmentScore!==undefined)positives.push(`role-relevant assessment average is ${assessmentScore}/100`);
  const eligible=input.consented&&input.interested!==false&&input.available!==false&&hardMissing.length===0;
  const decisionSignal:HiringDecisionSignal=!eligible?'do-not-advance':score>=82?'advance':score>=62?'review':'hold';
  const provenanceDigest=digest({candidateId:input.candidateId,jobId:job.id,evidence:input.evidence.map(e=>({id:e.id,verified:e.verified,strength:e.strength})),assessments});
  return {candidateId:input.candidateId,displayName:input.displayName,eligible,decisionSignal,score,coverage,assessmentScore,positives,risks,unknowns,provenanceDigest};
}

export function buildEmployerHiringPlan(job:EmployerJob,candidates:EmployerCandidateInput[],shortlistSize=5):EmployerHiringPlan {
  const calibration=calibrateEmployerRole(job);
  const evaluations=candidates.map(candidate=>evaluateEmployerCandidate(job,candidate));
  const ranked=evaluations.filter(item=>item.eligible).sort((a,b)=>b.score-a.score||a.candidateId.localeCompare(b.candidateId));
  const shortlist=ranked.slice(0,Math.max(1,shortlistSize));
  const excluded=evaluations.filter(item=>!shortlist.some(shortlisted=>shortlisted.candidateId===item.candidateId));
  const mustQuestions=job.mustHaves.slice(0,6).map(requirement=>`Tell us about a specific situation that demonstrates ${requirement}. What did you personally do, what evidence supports it, and what happened?`);
  const outcomeQuestions=job.successOutcomes.slice(0,4).map(outcome=>`How would you approach delivering this outcome: ${outcome}? What would you measure and what risks would you watch?`);
  const interviewPlan=[
    {stage:'evidence review',purpose:'confirm hard gates and resolve material evidence unknowns before consuming interview time',questions:calibration.questions},
    {stage:'structured capability interview',purpose:'test role-relevant capabilities consistently across candidates',questions:mustQuestions},
    {stage:'work and outcome simulation',purpose:'evaluate how the candidate reasons about the actual work and success outcomes',questions:outcomeQuestions},
    {stage:'mutual fit and candidate questions',purpose:'let both sides verify working conditions, expectations, growth, compensation and constraints',questions:['What conditions help you do your best work?','Which parts of this role would you want clarified before deciding whether it is right for you?']}
  ];
  const nextActions:string[]=[];
  if(calibration.risks.length)nextActions.push('resolve role-calibration risks before expanding sourcing volume');
  if(!candidates.length)nextActions.push('source consented candidates from internal and authorized external talent sources');
  if(shortlist.length)nextActions.push('review requirement-level evidence and unknowns for the strongest candidates before scheduling interviews');
  if(shortlist.some(item=>item.unknowns.includes('no role-relevant verified assessment supplied')))nextActions.push('use a role-relevant work sample or structured assessment where it will reduce real hiring uncertainty');
  nextActions.push('record interview evidence, reasons for advancement or rejection, offer outcome and later quality signals so the hiring system can be recalibrated');
  return {
    role:structuredClone(job),calibration,shortlist,excluded,interviewPlan,nextActions,
    decisionBoundary:'Maya may calibrate, source, assess, explain and recommend. Consequential reject, offer and hire decisions remain authorized human decisions and must not use protected traits or unsupported proxy inference.'
  };
}
