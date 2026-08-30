import { analyzeHiringBias, type BiasGuidance, type HiringAudience } from './hiring-bias-intelligence.js';

export type EvidenceKind = 'skill'|'work-sample'|'assessment'|'outcome'|'reference'|'credential'|'project'|'experience'|'education'|'recency'|'trajectory';
export type DecisionType = 'recommend'|'advance'|'hold'|'reject'|'challenge';

export interface CapabilityEvidence {
  id: string;
  kind: EvidenceKind;
  capability: string;
  statement: string;
  verified: boolean;
  source?: string;
  observedAt?: string;
  confidence?: number;
}

export interface HiringRequirement {
  id: string;
  label: string;
  capability: string;
  type: 'hard-gate'|'experience-proxy'|'preferred'|'outcome'|'skill';
  years?: number;
  requiredCredential?: boolean;
  legalOrSafetyCritical?: boolean;
  rationale?: string;
}

export interface CandidateRiskMap {
  audience: HiringAudience;
  risks: Array<{
    signal: string;
    severity: 'watch'|'material';
    observedFact: string;
    unsupportedInference: string;
    mitigation: string[];
  }>;
  recommendedProof: string[];
}

export function buildCandidateRiskMap(message: string): CandidateRiskMap {
  const analysis = analyzeHiringBias(message, 'candidate');
  return {
    audience: 'candidate',
    risks: analysis.signals.map(signal=>({
      signal:signal.signal,
      severity:signal.severity,
      observedFact:signal.observedFact,
      unsupportedInference:signal.unsupportedInference,
      mitigation:[
        signal.jobRelevantAlternative,
        'Keep context brief and factual; lead with current role-relevant proof.',
        'Prefer evidence-rich applications, warm paths, references, work samples, and assessments where relevant.'
      ]
    })),
    recommendedProof: analysis.detected ? [
      'recent role-relevant work samples',
      'verified skills or assessments',
      'measurable outcomes',
      'references or validators',
      'projects or shipped work',
      'evidence of recency and trajectory'
    ] : []
  };
}

export interface EvidenceSubstitutionResult {
  requirement: HiringRequirement;
  substitutable: boolean;
  hardGate: boolean;
  matchedEvidence: CapabilityEvidence[];
  missingEvidence: string[];
  explanation: string;
}

export function evaluateEvidenceSubstitution(requirement: HiringRequirement, evidence: CapabilityEvidence[]): EvidenceSubstitutionResult {
  const hardGate = requirement.type === 'hard-gate' || Boolean(requirement.requiredCredential) || Boolean(requirement.legalOrSafetyCritical);
  const matches = evidence.filter(item=>item.capability.toLowerCase()===requirement.capability.toLowerCase() && item.verified);
  if (hardGate) return {
    requirement, substitutable:false, hardGate:true, matchedEvidence:matches,
    missingEvidence: matches.length ? [] : [requirement.label],
    explanation:'This requirement is treated as a genuine gate and is not bypassed through proxy substitution.'
  };
  const directKinds = new Set<EvidenceKind>(['skill','work-sample','assessment','outcome','reference','project','experience','recency','trajectory']);
  const direct = matches.filter(item=>directKinds.has(item.kind));
  return {
    requirement,
    substitutable: requirement.type === 'experience-proxy' && direct.length>0,
    hardGate:false,
    matchedEvidence:direct,
    missingEvidence:direct.length?[]:[`Direct evidence of ${requirement.capability}`],
    explanation: requirement.type === 'experience-proxy'
      ? (direct.length ? 'The tenure proxy can be challenged with verified direct evidence of the capability it is intended to predict.' : 'The tenure proxy should not be waived blindly; gather direct evidence of the capability first.')
      : 'Evaluate this requirement directly using role-relevant evidence.'
  };
}

export interface StructuredInterviewQuestion {
  capability: string;
  question: string;
  evidenceExpected: string[];
  anchors: { strong:string; acceptable:string; weak:string };
}

export function buildStructuredInterview(requirements: HiringRequirement[]): StructuredInterviewQuestion[] {
  return requirements
    .filter(r=>r.type!=='preferred')
    .map(r=>({
      capability:r.capability,
      question:`Tell me about a specific time you demonstrated ${r.capability}. What was the situation, what did you personally do, and what evidence shows the result?`,
      evidenceExpected:['specific context','candidate-owned actions','role-relevant reasoning','observable result','verifiable detail where available'],
      anchors:{
        strong:'Specific, role-relevant example with clear ownership, sound judgment, measurable or independently checkable result, and credible follow-up detail.',
        acceptable:'Relevant example with credible ownership and result, but limited measurement or verification.',
        weak:'Vague, hypothetical, prestige-based, team-only, or unsupported answer that does not establish the capability.'
      }
    }));
}

export interface FactInferenceAudit {
  fact: string;
  inference: string;
  evidence: CapabilityEvidence[];
  confidence: number;
  supported: boolean;
  challenge?: string;
}

export function auditFactInference(input:{fact:string;inference:string;evidence:CapabilityEvidence[];confidence?:number}):FactInferenceAudit {
  const verified=input.evidence.filter(e=>e.verified);
  const confidence=Math.max(0,Math.min(1,input.confidence??(verified.length?0.65:0.2)));
  const supported=verified.length>0 && confidence>=0.5;
  return {
    fact:input.fact,
    inference:input.inference,
    evidence:verified,
    confidence,
    supported,
    challenge:supported?undefined:'The inference is not sufficiently supported by verified job-relevant evidence. Separate the observed fact from the conclusion and gather a more direct measure.'
  };
}

export interface RejectionReasonCheck {
  valid: boolean;
  reason: string;
  unsupportedProxy: boolean;
  missingCapability?: string;
  requiredImprovement?: string;
}

export function checkRejectionReason(reason:string, requirements:HiringRequirement[], evidence:CapabilityEvidence[]):RejectionReasonCheck {
  const lower=reason.toLowerCase();
  const proxy=/not enough experience|years of experience|employment gap|job hopping|laid off|no degree|prestige|pedigree/.test(lower);
  if(proxy){
    const requirement=requirements.find(r=>lower.includes(r.capability.toLowerCase())||r.type==='experience-proxy');
    if(requirement){
      const substitution=evaluateEvidenceSubstitution(requirement,evidence);
      if(substitution.substitutable) return {valid:false,reason,unsupportedProxy:true,missingCapability:requirement.capability,requiredImprovement:`Name the actual capability deficiency and the direct evidence supporting it rather than rejecting on ${requirement.label}.`};
    }
    return {valid:false,reason,unsupportedProxy:true,requiredImprovement:'Replace the proxy rationale with a specific job-relevant capability or hard-gate deficiency supported by evidence.'};
  }
  const capability=requirements.find(r=>lower.includes(r.capability.toLowerCase()));
  return {valid:Boolean(capability),reason,unsupportedProxy:false,missingCapability:capability?.capability,requiredImprovement:capability?undefined:'Tie the rejection reason to a specific requirement, observed evidence, and decision threshold.'};
}

export interface CounterfactualReview {
  question:string;
  inconsistent:boolean;
  explanation:string;
}

export function counterfactualCandidateReview(input:{decisionWithProxy:DecisionType;decisionWithoutProxy:DecisionType;proxyLabel:string}):CounterfactualReview {
  const inconsistent=input.decisionWithProxy!==input.decisionWithoutProxy;
  return {
    question:`If the same job-relevant evidence came from a candidate without the ${input.proxyLabel} signal, would the decision change?`,
    inconsistent,
    explanation:inconsistent?'The decision changes when only the proxy changes. Review whether the proxy has a defensible, job-relevant predictive purpose.':'The decision is stable under this counterfactual check.'
  };
}

export interface BlindEvidencePacket {
  evidence: CapabilityEvidence[];
  removedFields: string[];
}

export function buildBlindEvidencePacket(input:{evidence:CapabilityEvidence[];identityFields?:Record<string,unknown>;pedigreeFields?:Record<string,unknown>}):BlindEvidencePacket {
  const removedFields=[...Object.keys(input.identityFields??{}),...Object.keys(input.pedigreeFields??{})];
  return {evidence:input.evidence.map(e=>({...e,source:undefined})),removedFields};
}

export type RecoveryClassification='unknown'|'evidence-gap'|'presentation-problem'|'role-mismatch'|'process-issue'|'possible-proxy-risk'|'genuine-qualification-gap';
export function classifyCandidateRecovery(input:{reason?:string;bias?:BiasGuidance;requirements?:HiringRequirement[];evidence?:CapabilityEvidence[]}):{classification:RecoveryClassification;nextActions:string[]} {
  const reason=(input.reason??'').toLowerCase();
  if(input.bias?.detected && /gap|layoff|degree|experience|job hop|pedigree/.test(reason)) return {classification:'possible-proxy-risk',nextActions:['Do not treat the rejection as proof of low capability.','Strengthen direct role-relevant evidence and warm-path access.','Retarget toward employers whose evaluation process uses direct evidence.']};
  if(/not qualified|license|credential|required certification/.test(reason)) return {classification:'genuine-qualification-gap',nextActions:['Confirm whether the gate is genuinely mandatory.','Close the credential or qualification gap before reapplying where practical.']};
  if(/resume|application|communicat|story|unclear/.test(reason)) return {classification:'presentation-problem',nextActions:['Improve evidence ordering and clarity.','Make the strongest role-relevant proof easier to verify.']};
  if(/role fit|overqualified|underqualified|different profile/.test(reason)) return {classification:'role-mismatch',nextActions:['Recheck target selection.','Prioritize roles with a tighter evidence-to-requirement match.']};
  if(/process|position closed|hiring freeze|reorg|budget/.test(reason)) return {classification:'process-issue',nextActions:['Do not downgrade capability based on the process outcome.','Preserve the relationship and redirect effort.']};
  if(/missing|lack|no evidence|could not demonstrate/.test(reason)) return {classification:'evidence-gap',nextActions:['Identify the exact missing capability evidence.','Build the smallest credible proof artifact.']};
  return {classification:'unknown',nextActions:['Do not infer failure from an unexplained rejection.','Seek concrete feedback where available.','Use funnel evidence across multiple applications before changing strategy.']};
}

export interface HiringOutcomeObservation {
  signal:string;
  signalValue:string|number|boolean;
  hired:boolean;
  performance30?:number;
  performance90?:number;
  performance365?:number;
  satisfaction30?:number;
  satisfaction90?:number;
  satisfaction365?:number;
}

export function summarizeHiringSignalQuality(observations:HiringOutcomeObservation[]) {
  const grouped=new Map<string,HiringOutcomeObservation[]>();
  for(const o of observations){const key=`${o.signal}:${String(o.signalValue)}`;const list=grouped.get(key)??[];list.push(o);grouped.set(key,list);}
  return [...grouped.entries()].map(([key,items])=>{
    const hired=items.filter(i=>i.hired);
    const values=hired.flatMap(i=>[i.performance30,i.performance90,i.performance365].filter((v):v is number=>typeof v==='number'));
    const satisfaction=hired.flatMap(i=>[i.satisfaction30,i.satisfaction90,i.satisfaction365].filter((v):v is number=>typeof v==='number'));
    return {
      signal:key,
      sampleSize:items.length,
      hireRate:items.length?hired.length/items.length:0,
      meanPerformance:values.length?values.reduce((a,b)=>a+b,0)/values.length:undefined,
      meanSatisfaction:satisfaction.length?satisfaction.reduce((a,b)=>a+b,0)/satisfaction.length:undefined
    };
  });
}

export interface FairnessAuditEvent {
  at:string;
  actor:string;
  action:string;
  requirement?:string;
  fact?:string;
  inference?:string;
  evidenceIds:string[];
  confidence?:number;
  decision?:DecisionType;
  rationale:string;
}

export class FairnessAuditTrail {
  private readonly events:FairnessAuditEvent[]=[];
  record(event:Omit<FairnessAuditEvent,'at'>){const next={...event,at:new Date().toISOString()};this.events.push(next);return structuredClone(next);}
  list(){return structuredClone(this.events);}
}

export interface BiasResistantDecisionInput {
  message:string;
  audience?:HiringAudience;
  requirements?:HiringRequirement[];
  evidence?:CapabilityEvidence[];
  rejectionReason?:string;
}

export function buildBiasResistantDecisionSupport(input:BiasResistantDecisionInput){
  const bias=analyzeHiringBias(input.message,input.audience);
  const requirements=input.requirements??[];
  const evidence=input.evidence??[];
  return {
    bias,
    candidateRiskMap:bias.audience==='candidate'||bias.audience==='unknown'?buildCandidateRiskMap(input.message):undefined,
    substitutions:requirements.map(r=>evaluateEvidenceSubstitution(r,evidence)),
    structuredInterview:requirements.length?buildStructuredInterview(requirements):[],
    rejectionCheck:input.rejectionReason?checkRejectionReason(input.rejectionReason,requirements,evidence):undefined,
    principle:'job requirement → capability → evidence → confidence → decision → later outcome'
  };
}
