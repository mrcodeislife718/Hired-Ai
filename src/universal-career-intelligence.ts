import type { CandidateProfile, Evidence, Opportunity, RelationshipRecord } from './domain.js';
import { normalize, unique } from './utils.js';

export type EvidenceKind = 'work' | 'portfolio' | 'credential' | 'education' | 'reference' | 'assessment' | 'artifact' | 'publication' | 'award' | 'volunteer' | 'project' | 'other';
export type RequirementClass = 'hard' | 'soft' | 'wishlist' | 'implied' | 'success-criterion' | 'boilerplate';
export type QuestionClass = 'factual' | 'eliminatory' | 'competency' | 'motivation' | 'compensation' | 'logistics' | 'behavioral' | 'positioning';
export type ObjectionTreatment = 'eliminate-with-evidence' | 'neutralize-with-framing' | 'address-proactively' | 'leave-unraised';

export interface UniversalEvidence {
  id: string;
  label: string;
  kind: EvidenceKind;
  capability: string;
  claim: string;
  source?: string;
  url?: string;
  strength: number;
  verified: boolean;
  tags?: string[];
}

export interface DecomposedRequirement {
  text: string;
  classification: RequirementClass;
  weight: number;
  rationale: string;
}

export interface RequirementDecomposition {
  opportunityId: string;
  requirements: DecomposedRequirement[];
  businessProblems: string[];
  likelyInterviewFilters: string[];
  successCriteria: string[];
  boilerplate: string[];
  coreHiringProblem: string;
}

export interface SynthesizedCapability {
  capability: string;
  evidenceIds: string[];
  strength: number;
  provenance: string[];
  rationale: string;
}

export interface ApplicationEvidencePackage {
  opportunityId: string;
  immutableClaims: Array<{ claim:string; evidenceIds:string[]; confidence:number }>;
  requirementMap: RequirementDecomposition;
  synthesizedCapabilities: SynthesizedCapability[];
  proofIndex: UniversalEvidence[];
  generatedAt: string;
}

export interface AttentionPlan {
  first5Seconds: string[];
  first20Seconds: string[];
  first2Minutes: string[];
  rule: string;
}

export interface EmployerDecisionModel {
  evaluators: Array<{ evaluator:string; priorities:string[]; risks:string[]; evidenceToReduceUncertainty:string[] }>;
  likelyDecisionSequence: string[];
}

export interface CompetitorArchetype {
  name: string;
  strengths: string[];
  likelyWeaknesses: string[];
  candidateAdvantages: string[];
  candidateRisks: string[];
}

export interface PredictedObjection {
  objection: string;
  confidence: number;
  treatment: ObjectionTreatment;
  evidenceIds: string[];
  responseStrategy: string;
}

export interface InterviewStory {
  id: string;
  title: string;
  tags: string[];
  situation: string;
  task: string;
  action: string;
  result: string;
  evidenceIds: string[];
  confidence: number;
}

export interface ApplicationExperiment {
  id: string;
  opportunityId: string;
  variant: string;
  dimensions: Record<string,string>;
  outcome?: 'no-response'|'screen'|'interview'|'offer'|'rejection';
  at: string;
}

export interface PersonalConversionModel {
  sampleSize: number;
  screenProbability: number;
  interviewProbabilityGivenScreen: number;
  offerProbabilityGivenInterview: number;
  confidence: number;
  warning?: string;
}

export interface ExpectedValueInput {
  compensationValue: number;
  careerUpside: number;
  fulfillment: number;
  networkValue: number;
  optionValue: number;
  applicationCost: number;
  relocationCost: number;
  riskCost: number;
}

export interface TimingSignal {
  urgencyScore: number;
  freshnessScore: number;
  congestionScore: number;
  recommendation: 'apply-now'|'apply-soon'|'verify-first'|'deprioritize';
  reasons: string[];
}

export interface RelationshipPath {
  people: string[];
  channels: string[];
  credibilityScore: number;
  frictionScore: number;
  rationale: string;
}

export interface EvidenceGapClosure {
  requirement: string;
  proposedProof: string;
  proofKind: EvidenceKind;
  effort: number;
  expectedImpact: number;
  priority: number;
}

export interface CompiledCareerArtifacts {
  resumeBrief: string[];
  coverLetterBrief: string[];
  outreachBrief: string[];
  applicationAnswerFacts: string[];
  interviewNarrative: string[];
  proofIndex: Array<{ label:string; source?:string; url?:string; claim:string }>;
  followUpBrief: string[];
  consistencyRule: string;
}

export interface NegotiationPlanV2 {
  reservationValue: number;
  targetValue: number;
  walkAwayValue: number;
  nonSalaryPriorities: string[];
  sequence: string[];
  downsideRisks: string[];
}

export interface RejectionDiagnosis {
  likelyCauses: Array<{ cause:string; probability:number; evidence:string[] }>;
  unknownProbability: number;
  nextAction: string;
}

export interface CalibratedLearningDecision {
  shouldChangeStrategy: boolean;
  confidence: number;
  explorationRate: number;
  reason: string;
}

export interface CareerPathScenario {
  name: string;
  steps: string[];
  expectedCompensation: number;
  probability: number;
  timeMonths: number;
  learningCost: number;
  optionality: number;
  fulfillment: number;
  evidenceRequirements: string[];
}

const tokens = (value: string) => new Set(normalize(value).split(/\s+/).filter(Boolean));
const similarity = (a: string, b: string) => {
  const left = tokens(a); const right = tokens(b); if (!right.size) return 0;
  let hits = 0; for (const token of right) if (left.has(token)) hits++;
  return hits / right.size;
};
const clamp01 = (n:number) => Math.max(0,Math.min(1,n));
const pct = (n:number) => Math.round(clamp01(n)*100);

export function toUniversalEvidence(evidence: Evidence[]): UniversalEvidence[] {
  return evidence.map(e => ({
    id:e.id,
    label:e.repository || e.skill,
    kind:e.verification === 'artifact' ? 'artifact' : e.verification === 'ci' ? 'assessment' : 'project',
    capability:e.skill,
    claim:e.claim,
    source:e.repository,
    url:e.url,
    strength:e.strength,
    verified:e.verification !== 'manual',
    tags:[e.skill]
  }));
}

export function decomposeRequirements(opportunity: Opportunity): RequirementDecomposition {
  const explicit = unique([...opportunity.job.requirements,...opportunity.job.preferred]);
  const preferredSet = new Set(opportunity.job.preferred.map(normalize));
  const requirements = explicit.map(text => {
    const n = normalize(text);
    const mandatory = /\b(required|must|license|licensed|certified|certification|clearance|degree|years?|minimum)\b/i.test(text);
    const preferred = preferredSet.has(n) || /\b(preferred|plus|bonus|nice to have)\b/i.test(text);
    const success = /\b(success|deliver|increase|reduce|improve|grow|retain|sell|manage|lead|serve|care|operate|teach|support|produce|maintain)\b/i.test(text);
    const classification: RequirementClass = mandatory ? 'hard' : preferred ? 'wishlist' : success ? 'success-criterion' : 'soft';
    return { text, classification, weight: mandatory?1:preferred?0.45:success?0.8:0.65, rationale: mandatory?'explicit gate or credential signal':preferred?'preference rather than hard gate':success?'describes work/outcome likely tied to success':'general capability signal' };
  });
  const descriptionSentences = opportunity.job.description.split(/[.!?]\s+/).map(s=>s.trim()).filter(Boolean);
  const boilerplate = descriptionSentences.filter(s=>/equal opportunity|accommodation|benefits|privacy|background check|company is an|we are proud/i.test(s));
  const businessProblems = descriptionSentences.filter(s=>/responsible|help|improve|grow|reduce|deliver|manage|support|build|care|serve|increase|lead|operate|maintain|teach|sell/i.test(s) && !boilerplate.includes(s)).slice(0,6);
  const successCriteria = requirements.filter(r=>r.classification==='success-criterion'||r.classification==='hard').sort((a,b)=>b.weight-a.weight).slice(0,6).map(r=>r.text);
  const likelyInterviewFilters = requirements.filter(r=>r.classification==='hard'||r.classification==='soft').slice(0,6).map(r=>r.text);
  const coreHiringProblem = businessProblems[0] ?? successCriteria[0] ?? `successfully perform the ${opportunity.job.title} role at ${opportunity.job.company}`;
  return { opportunityId:opportunity.id, requirements, businessProblems, likelyInterviewFilters, successCriteria, boilerplate, coreHiringProblem };
}

export function synthesizeEvidenceGraph(evidence: UniversalEvidence[], targetCapabilities: string[]): SynthesizedCapability[] {
  return targetCapabilities.map(capability => {
    const matched = evidence.map(e=>({e,sim:Math.max(similarity(`${e.capability} ${e.claim} ${(e.tags??[]).join(' ')}`,capability), similarity(e.capability,capability))}))
      .filter(x=>x.sim>=0.2).sort((a,b)=>(b.sim*b.e.strength)-(a.sim*a.e.strength));
    const combined = 1 - matched.slice(0,5).reduce((remaining,m)=>remaining*(1-clamp01(m.e.strength*m.sim*(m.e.verified?1:0.8))),1);
    return {
      capability,
      evidenceIds:matched.map(m=>m.e.id),
      strength:Math.round(combined*100)/100,
      provenance:matched.map(m=>m.e.source ?? m.e.label),
      rationale:matched.length>1 ? `${matched.length} independent evidence signals jointly support this capability.` : matched.length===1 ? 'One evidence signal directly or adjacently supports this capability.' : 'No current evidence supports this capability.'
    };
  }).sort((a,b)=>b.strength-a.strength);
}

export function compileApplicationEvidencePackage(profile: CandidateProfile, evidence: UniversalEvidence[], opportunity: Opportunity): ApplicationEvidencePackage {
  const requirementMap = decomposeRequirements(opportunity);
  const target = requirementMap.requirements.filter(r=>r.classification!=='boilerplate').map(r=>r.text);
  const synthesizedCapabilities = synthesizeEvidenceGraph(evidence,target);
  const immutableClaims = synthesizedCapabilities.filter(c=>c.strength>0).map(c=>({ claim:`${c.capability}: ${c.rationale}`, evidenceIds:c.evidenceIds, confidence:pct(c.strength) }));
  const proofIds = new Set(immutableClaims.flatMap(c=>c.evidenceIds));
  const proofIndex = evidence.filter(e=>proofIds.has(e.id)).sort((a,b)=>b.strength-a.strength);
  return { opportunityId:opportunity.id, immutableClaims, requirementMap, synthesizedCapabilities, proofIndex, generatedAt:new Date().toISOString() };
}

export function optimizeAttention(pkg: ApplicationEvidencePackage): AttentionPlan {
  const ranked = [...pkg.immutableClaims].sort((a,b)=>b.confidence-a.confidence).map(c=>c.claim);
  return {
    first5Seconds:ranked.slice(0,2),
    first20Seconds:ranked.slice(0,5),
    first2Minutes:ranked.slice(0,10),
    rule:'Maximize relevant evidence density per unit of evaluator attention; never hide a fact whose omission would make a claim materially misleading.'
  };
}

export function modelEmployerDecision(opportunity: Opportunity, decomposition = decomposeRequirements(opportunity)): EmployerDecisionModel {
  const hard = decomposition.requirements.filter(r=>r.classification==='hard').map(r=>r.text);
  const success = decomposition.successCriteria;
  return {
    evaluators:[
      { evaluator:'recruiter-or-initial-screener', priorities:[...hard,'basic role and logistics alignment'].slice(0,6), risks:['obvious hard-gate mismatch','unclear narrative','compensation/location mismatch'], evidenceToReduceUncertainty:['clear qualification evidence','concise role-aligned summary','verified logistics'] },
      { evaluator:'hiring-manager-or-functional-lead', priorities:[...success,'evidence of performing comparable work'].slice(0,6), risks:['weak outcome evidence','unclear ownership','poor context fit'], evidenceToReduceUncertainty:['relevant work examples','decision rationale','results and references where available'] },
      { evaluator:'role-specialist-or-peer', priorities:decomposition.likelyInterviewFilters, risks:['insufficient depth','inability to explain work','weak judgment'], evidenceToReduceUncertainty:['specific examples','work samples','role simulations','structured stories'] },
      { evaluator:'business-or-executive-stakeholder', priorities:[decomposition.coreHiringProblem,'risk reduction','time to value'], risks:['unclear business value','retention risk','poor cross-functional fit'], evidenceToReduceUncertainty:['impact narrative','reliability','adaptability','motivation'] }
    ],
    likelyDecisionSequence:['gate','credible fit','role performance evidence','risk reduction','comparative preference','offer decision']
  };
}

export function simulateCompetitors(profile: CandidateProfile, opportunity: Opportunity, evidence: UniversalEvidence[]): CompetitorArchetype[] {
  const reqs = decomposeRequirements(opportunity).requirements.map(r=>r.text);
  const candidateText = `${profile.headline} ${profile.skills.join(' ')} ${evidence.map(e=>`${e.capability} ${e.claim}`).join(' ')}`;
  const archetypes = [
    { name:'direct-domain specialist', strengths:['deep experience in the exact function or industry'], likelyWeaknesses:['may have narrower transferable range'] },
    { name:'highly credentialed candidate', strengths:['formal credentials and recognizable signals'], likelyWeaknesses:['credentials may exceed demonstrated applied evidence'] },
    { name:'experienced generalist', strengths:['broad operating history and adaptability'], likelyWeaknesses:['less direct specialization'] },
    { name:'internal-or-networked candidate', strengths:['organizational context and trusted relationships'], likelyWeaknesses:['may not have the strongest external evidence'] },
    { name:'high-potential adjacent candidate', strengths:['transferable capability and learning speed'], likelyWeaknesses:['less direct experience'] }
  ];
  return archetypes.map(a=>{
    const directHits = reqs.filter(r=>similarity(candidateText,r)>=0.2).length;
    const candidateAdvantages = [directHits>0 && `${directHits} requirement areas have candidate evidence`, evidence.some(e=>e.verified&&e.strength>=0.8) && 'candidate has strong verified proof', profile.skills.length>=6 && 'candidate offers broad transferable capability'].filter(Boolean) as string[];
    return {...a,candidateAdvantages,candidateRisks:reqs.filter(r=>similarity(candidateText,r)<0.1).slice(0,3).map(r=>`limited visible proof for ${r}`)};
  });
}

export function predictObjections(profile: CandidateProfile, opportunity: Opportunity, evidence: UniversalEvidence[]): PredictedObjection[] {
  const decomposition = decomposeRequirements(opportunity);
  const source = `${profile.headline} ${profile.skills.join(' ')} ${evidence.map(e=>`${e.capability} ${e.claim}`).join(' ')}`;
  return decomposition.requirements.map(r=>{
    const support = Math.max(...evidence.map(e=>similarity(`${e.capability} ${e.claim}`,r.text)*e.strength), similarity(source,r.text)*0.5,0);
    if (support>=0.65) return { objection:`concern about ${r.text}`, confidence:Math.round((1-support)*100), treatment:'eliminate-with-evidence' as const, evidenceIds:evidence.filter(e=>similarity(`${e.capability} ${e.claim}`,r.text)>=0.2).map(e=>e.id), responseStrategy:'lead with the strongest directly relevant proof' };
    if (support>=0.25) return { objection:`limited direct proof for ${r.text}`, confidence:70, treatment:'neutralize-with-framing' as const, evidenceIds:evidence.filter(e=>similarity(`${e.capability} ${e.claim}`,r.text)>=0.1).map(e=>e.id), responseStrategy:'use adjacent or transferable evidence and explain the ramp path accurately' };
    const proactive = r.classification==='hard';
    return { objection:`missing visible proof for ${r.text}`, confidence:proactive?90:55, treatment:proactive?'address-proactively':'leave-unraised', evidenceIds:[], responseStrategy:proactive?'state the gap accurately and provide the strongest legitimate alternative proof or closure plan':'do not volunteer a low-value weakness unless asked' };
  }).filter(o=>o.confidence>=20).sort((a,b)=>b.confidence-a.confidence);
}

export class InterviewStoryBank {
  private stories: InterviewStory[] = [];
  add(story: InterviewStory) { if(this.stories.some(s=>s.id===story.id)) throw new Error('duplicate story'); this.stories.push(structuredClone(story)); return story; }
  all() { return this.stories.map(s=>structuredClone(s)); }
  retrieve(tags:string[], evidenceIds:string[]=[]): InterviewStory[] {
    const wanted = new Set(tags.map(normalize)); const ev = new Set(evidenceIds);
    return this.stories.map(story=>({story,score:story.tags.filter(t=>wanted.has(normalize(t))).length*3 + story.evidenceIds.filter(id=>ev.has(id)).length*2 + story.confidence/100})).sort((a,b)=>b.score-a.score).map(x=>structuredClone(x.story));
  }
}

export function counterfactualApplicationOptimizer(experiments: ApplicationExperiment[]) {
  const byVariant = new Map<string,ApplicationExperiment[]>();
  experiments.forEach(e=>byVariant.set(e.variant,[...(byVariant.get(e.variant)??[]),e]));
  const score=(outcome?:ApplicationExperiment['outcome'])=>outcome==='offer'?4:outcome==='interview'?3:outcome==='screen'?2:outcome==='rejection'?0.5:0;
  const variants=[...byVariant.entries()].map(([variant,items])=>({variant,sampleSize:items.length,meanOutcome:items.reduce((s,i)=>s+score(i.outcome),0)/Math.max(1,items.length)})).sort((a,b)=>b.meanOutcome-a.meanOutcome);
  return { variants, counterfactualQuestions:['Would changing targeting improve conversion?','Would changing evidence order improve evaluator recognition?','Would changing outreach path improve response?','Would changing application timing improve response?','Would a different truthful positioning strength improve conversion?'], warning:'Treat counterfactual conclusions as hypotheses unless sample size and controls are adequate.' };
}

export function buildPersonalConversionModel(experiments: ApplicationExperiment[]): PersonalConversionModel {
  const n=experiments.length; const screens=experiments.filter(e=>['screen','interview','offer'].includes(e.outcome??'')).length; const interviews=experiments.filter(e=>['interview','offer'].includes(e.outcome??'')).length; const offers=experiments.filter(e=>e.outcome==='offer').length;
  const confidence=clamp01(n/30);
  return { sampleSize:n, screenProbability:(screens+1)/(n+2), interviewProbabilityGivenScreen:(interviews+1)/(screens+2), offerProbabilityGivenInterview:(offers+1)/(interviews+2), confidence, warning:n<10?'Low sample size: use for exploration, not major strategy changes.':undefined };
}

export function opportunityExpectedValue(model: PersonalConversionModel, input: ExpectedValueInput) {
  const economic = input.compensationValue*0.35 + input.careerUpside*0.2 + input.fulfillment*0.2 + input.networkValue*0.1 + input.optionValue*0.15;
  const acquisitionProbability = model.screenProbability*model.interviewProbabilityGivenScreen*model.offerProbabilityGivenInterview;
  const costs=input.applicationCost+input.relocationCost+input.riskCost;
  return { expectedValue:Math.round((economic*acquisitionProbability-costs)*100)/100, acquisitionProbability:Math.round(acquisitionProbability*10000)/10000, economicValue:economic, costs };
}

export function timingIntelligence(opportunity: Opportunity, now=new Date()): TimingSignal {
  const ageDays=Math.max(0,(now.getTime()-new Date(opportunity.job.postedAt).getTime())/86_400_000);
  const freshnessScore=Math.max(0,100-Math.round(ageDays*4));
  const congestionScore=Math.min(100,opportunity.job.applicantCount??0);
  const urgencyScore=Math.round(freshnessScore*0.65 + Math.max(0,100-congestionScore)*0.35);
  const recommendation=ageDays>45?'verify-first':urgencyScore>=70?'apply-now':urgencyScore>=45?'apply-soon':'deprioritize';
  return { urgencyScore,freshnessScore,congestionScore,recommendation,reasons:[`${Math.round(ageDays)} days since posting`,opportunity.job.applicantCount!==undefined?`${opportunity.job.applicantCount} reported applicants`:'applicant congestion unknown',ageDays>45?'posting may be stale; verify before investing heavily':'posting is within a plausible active window'] };
}

export function optimizeRelationshipPaths(relationships: RelationshipRecord[], company?:string): RelationshipPath[] {
  return relationships.filter(r=>!company||normalize(r.company??'')===normalize(company)).map(r=>({ people:[r.name??r.role??'unknown contact'],channels:r.channels,credibilityScore:Math.round((r.confidence*70 + Math.min(30,r.interactionCount*5))*100)/100,frictionScore:r.interactionCount?20:55,rationale:r.interactionCount?'existing interaction lowers outreach friction':'new relationship; establish relevance before asking' })).sort((a,b)=>(b.credibilityScore-b.frictionScore)-(a.credibilityScore-a.frictionScore));
}

export function closeEvidenceGaps(pkg: ApplicationEvidencePackage): EvidenceGapClosure[] {
  return pkg.synthesizedCapabilities.filter(c=>c.strength<0.55).map((c,index)=>{
    const req=pkg.requirementMap.requirements.find(r=>r.text===c.capability);
    const hard=req?.classification==='hard';
    const proofKind:EvidenceKind = /license|certif|degree|clearance/i.test(c.capability)?'credential':'work';
    const proposedProof = proofKind==='credential' ? `obtain or verify the required credential for ${c.capability}` : `produce the smallest credible work sample, reference, assessment, documented result, or portfolio artifact that demonstrates ${c.capability}`;
    const effort=hard?65:40; const expectedImpact=hard?95:70;
    return { requirement:c.capability,proposedProof,proofKind,effort,expectedImpact,priority:Math.round((expectedImpact/Math.max(1,effort))*100)-index };
  }).sort((a,b)=>b.priority-a.priority);
}

export function compileRoleSpecificProof(pkg: ApplicationEvidencePackage) {
  const score=(e:UniversalEvidence)=>Math.max(...pkg.requirementMap.requirements.map(r=>similarity(`${e.capability} ${e.claim}`,r.text)*r.weight),0)*e.strength*(e.verified?1.1:1);
  return [...pkg.proofIndex].map(e=>({e,score:score(e)})).sort((a,b)=>b.score-a.score).map(({e,score},index)=>({ rank:index+1,label:e.label,claim:e.claim,source:e.source,url:e.url,relevance:Math.round(score*100) }));
}

export function classifyApplicationQuestion(question:string): QuestionClass {
  if(/salary|compensation|pay|rate/i.test(question)) return 'compensation';
  if(/authorized|sponsor|location|relocat|schedule|shift|travel|start date/i.test(question)) return 'logistics';
  if(/license|certif|degree|years of|clearance|eligible/i.test(question)) return 'eliminatory';
  if(/tell me about a time|conflict|failure|challenge|leadership/i.test(question)) return 'behavioral';
  if(/why (this|our)|interest|motivat/i.test(question)) return 'motivation';
  if(/describe|experience|skill|how would|approach/i.test(question)) return 'competency';
  if(/name|email|phone|address/i.test(question)) return 'factual';
  return 'positioning';
}

export function answerApplicationQuestion(question:string,pkg:ApplicationEvidencePackage) {
  const kind=classifyApplicationQuestion(question);
  const relevant=[...pkg.immutableClaims].sort((a,b)=>Math.max(similarity(a.claim,question),a.confidence/100)-Math.max(similarity(b.claim,question),b.confidence/100)).reverse().slice(0,3);
  return { kind, facts:relevant, instruction:'Answer directly, then use only facts from the immutable application evidence package. For factual or eliminatory questions, never embellish the underlying fact.' };
}

export function negotiationIntelligenceV2(input:{minimum:number;target:number;currentOffer:number;nonSalaryPriorities?:string[];competingValues?:number[];downsideRisks?:string[]}):NegotiationPlanV2 {
  const competing=Math.max(0,...(input.competingValues??[])); const reservationValue=Math.max(input.minimum,Math.min(input.currentOffer,competing||input.currentOffer));
  return { reservationValue,targetValue:Math.max(input.target,input.currentOffer),walkAwayValue:input.minimum,nonSalaryPriorities:input.nonSalaryPriorities??['role scope','schedule/work arrangement','growth','benefits','time off','start date'],sequence:['confirm scope and level','clarify the complete package','anchor on evidence-backed value and priorities','negotiate the highest-value terms first','trade lower-priority terms strategically','confirm final terms in writing'],downsideRisks:input.downsideRisks??[] };
}

export function diagnoseRejection(input:{stage?:string;notes?:string;opportunity?:Opportunity;knownGapCount?:number}):RejectionDiagnosis {
  const causes:Array<{cause:string;probability:number;evidence:string[]}>=[];
  if(input.stage==='application') causes.push({cause:'targeting-or-application-materials',probability:0.35,evidence:['rejection occurred before a live evaluation']});
  if(input.stage==='screen') causes.push({cause:'narrative-logistics-or-initial-fit',probability:0.35,evidence:['rejection followed initial screen']});
  if(input.stage==='interview') causes.push({cause:'role-performance-evidence-or-interview-execution',probability:0.4,evidence:['rejection followed deeper evaluation']});
  if((input.knownGapCount??0)>0) causes.push({cause:'readiness-gap',probability:Math.min(0.45,0.1*(input.knownGapCount??0)),evidence:[`${input.knownGapCount} known gaps existed`]});
  const known=causes.reduce((s,c)=>s+c.probability,0); const unknownProbability=Math.max(0.2,1-Math.min(0.8,known));
  return { likelyCauses:causes,unknownProbability,nextAction:'Record facts from the stage, request feedback when appropriate, update only hypotheses supported by repeated evidence, and preserve an explicit unknown cause when evidence is insufficient.' };
}

export function calibrateLearning(sampleSize:number,observedDelta:number):CalibratedLearningDecision {
  const confidence=clamp01(sampleSize/30)*clamp01(Math.abs(observedDelta)/0.2);
  const shouldChangeStrategy=sampleSize>=10&&confidence>=0.55;
  return {shouldChangeStrategy,confidence,explorationRate:Math.max(0.1,0.5-confidence*0.4),reason:shouldChangeStrategy?'Sample size and observed effect are sufficient for a bounded strategy adjustment.':'Keep learning, but do not overfit strategy to sparse or weak evidence.'};
}

export function simulateCareerPaths(paths:Array<Omit<CareerPathScenario,'probability'> & {evidenceCoverage:number;marketSignal:number}>):CareerPathScenario[] {
  return paths.map(p=>({ ...p, probability:clamp01(p.evidenceCoverage*0.6+p.marketSignal*0.4) })).sort((a,b)=>((b.expectedCompensation*b.probability)+(b.optionality*100)+(b.fulfillment*100)-b.learningCost)-((a.expectedCompensation*a.probability)+(a.optionality*100)+(a.fulfillment*100)-a.learningCost));
}

export function compileCareerArtifacts(pkg:ApplicationEvidencePackage):CompiledCareerArtifacts {
  const attention=optimizeAttention(pkg); const proof=compileRoleSpecificProof(pkg);
  return {
    resumeBrief:[...attention.first20Seconds],
    coverLetterBrief:[pkg.requirementMap.coreHiringProblem,...attention.first5Seconds],
    outreachBrief:[...attention.first5Seconds],
    applicationAnswerFacts:pkg.immutableClaims.map(c=>c.claim),
    interviewNarrative:[pkg.requirementMap.coreHiringProblem,...attention.first2Minutes],
    proofIndex:proof.map(p=>({label:p.label,source:p.source,url:p.url,claim:p.claim})),
    followUpBrief:[`Reinforce the strongest evidence tied to: ${pkg.requirementMap.coreHiringProblem}`],
    consistencyRule:'All candidate-facing and employer-facing artifacts compile from the same immutable claim set so wording may change but material facts cannot contradict one another.'
  };
}

export interface UniversalCareerIntelligenceResult {
  decomposition: RequirementDecomposition;
  package: ApplicationEvidencePackage;
  attention: AttentionPlan;
  employerDecision: EmployerDecisionModel;
  competitors: CompetitorArchetype[];
  objections: PredictedObjection[];
  timing: TimingSignal;
  gapClosures: EvidenceGapClosure[];
  proofPortfolio: ReturnType<typeof compileRoleSpecificProof>;
  artifacts: CompiledCareerArtifacts;
}

export function buildUniversalCareerIntelligence(profile:CandidateProfile,evidence:UniversalEvidence[],opportunity:Opportunity):UniversalCareerIntelligenceResult {
  const decomposition=decomposeRequirements(opportunity);
  const pkg=compileApplicationEvidencePackage(profile,evidence,opportunity);
  return {
    decomposition,
    package:pkg,
    attention:optimizeAttention(pkg),
    employerDecision:modelEmployerDecision(opportunity,decomposition),
    competitors:simulateCompetitors(profile,opportunity,evidence),
    objections:predictObjections(profile,opportunity,evidence),
    timing:timingIntelligence(opportunity),
    gapClosures:closeEvidenceGaps(pkg),
    proofPortfolio:compileRoleSpecificProof(pkg),
    artifacts:compileCareerArtifacts(pkg)
  };
}

export const MAYA_UNIVERSALITY_RULES = Object.freeze([
  'Never assume software, engineering, technology, office work, or any single industry is the default career context.',
  'Treat healthcare, skilled trades, education, retail, hospitality, finance, public service, logistics, manufacturing, creative work, sales, legal, scientific, technical, and other professions as first-class career domains.',
  'Use profession-appropriate evidence: employment records, references, work samples, licenses, certifications, education, portfolios, assessments, publications, awards, customer outcomes, operational records, projects, or other legitimate proof.',
  'Do not recommend a portfolio or GitHub artifact when the profession is better proven by another evidence type.',
  'Keep credential and legal requirements hard when the occupation genuinely requires them; positioning cannot substitute for a required license, clearance, certification, or authorization.',
  'Optimize for maximum defensible candidate value across industries, not keyword similarity to technology roles.'
]);
