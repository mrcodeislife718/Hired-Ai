import type { CandidateProfile, Evidence, Opportunity, RelationshipRecord } from './domain.js';
import { normalize, unique } from './utils.js';
import { decomposeRequirements, synthesizeEvidenceGraph, toUniversalEvidence, type UniversalEvidence } from './universal-career-intelligence.js';

export type CareerMotion = 'start' | 'reenter' | 'transition' | 'advance' | 'leadership' | 'executive' | 'independent';
export type CareerBarrierKind = 'credential' | 'experience' | 'evidence' | 'positioning' | 'network' | 'interview' | 'market' | 'location' | 'compensation' | 'timing' | 'other';
export type SearchFailureMode = 'targeting' | 'qualification' | 'evidence' | 'positioning' | 'distribution' | 'screening' | 'interview' | 'offer' | 'market' | 'insufficient-data';

export interface CareerBarrier {
  kind: CareerBarrierKind;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'blocking';
  proofNeeded?: string;
  action: string;
}

export interface CareerLaunchPlan {
  motion: CareerMotion;
  targetRoles: string[];
  strongestAssets: string[];
  barriers: CareerBarrier[];
  firstProofActions: string[];
  relationshipActions: string[];
  applicationReadiness: number;
  nextBestActions: string[];
}

export interface TransitionBridge {
  targetRole: string;
  transferableCapabilities: Array<{ capability:string; strength:number; evidenceIds:string[] }>;
  hardGates: string[];
  evidenceGaps: string[];
  translationRules: string[];
  proofPlan: string[];
  readiness: number;
}

export interface AdvancementPlan {
  currentValueSignals: string[];
  nextLevelSignals: string[];
  missingPromotionEvidence: string[];
  scopeExpansionActions: string[];
  compensationActions: string[];
  internalMobilityActions: string[];
  externalLeverageActions: string[];
  promotionPacket: string[];
}

export interface CareerResiliencePlan {
  evidenceFreshnessScore: number;
  relationshipCoverageScore: number;
  optionValueScore: number;
  bargainingPowerScore: number;
  concentrationRisks: string[];
  resilienceActions: string[];
}

export interface FunnelObservation {
  applications: number;
  screens: number;
  interviews: number;
  offers: number;
  accepted?: number;
  warmPathApplications?: number;
  warmPathScreens?: number;
  recentRejections?: string[];
}

export interface FunnelDiagnosis {
  primaryFailureMode: SearchFailureMode;
  confidence: number;
  observations: string[];
  correctiveActions: string[];
  doNotDo: string[];
}

export interface CareerHealthScore {
  total: number;
  dimensions: {
    roleClarity: number;
    evidence: number;
    marketability: number;
    relationships: number;
    interviewReadiness: number;
    compensationLeverage: number;
    optionality: number;
  };
  weakestDimension: keyof CareerHealthScore['dimensions'];
  strongestDimension: keyof CareerHealthScore['dimensions'];
}

export interface CareerAdvantagePlan {
  objective: string;
  motion: CareerMotion;
  health: CareerHealthScore;
  launch: CareerLaunchPlan;
  transitions: TransitionBridge[];
  advancement: AdvancementPlan;
  resilience: CareerResiliencePlan;
  funnel?: FunnelDiagnosis;
  opportunityFrontier: Array<{ opportunityId:string; title:string; company:string; score:number; reason:string }>;
  operatingRules: string[];
}

const clamp = (n:number) => Math.max(0, Math.min(100, Math.round(n)));
const tokens = (value:string) => new Set(normalize(value).split(/\s+/).filter(Boolean));
function overlap(a:string,b:string) {
  const left=tokens(a), right=tokens(b); if(!right.size) return 0;
  let hits=0; for(const t of right) if(left.has(t)) hits++;
  return hits/right.size;
}
function evidenceText(evidence: UniversalEvidence[]) { return evidence.map(e=>`${e.capability} ${e.claim} ${(e.tags??[]).join(' ')}`).join(' '); }

export function inferCareerMotion(input:{ message?:string; profile:CandidateProfile; hasCurrentRole?:boolean }): CareerMotion {
  const text=normalize(input.message??'');
  if(/first job|start my career|starting my career|no experience|entry level|graduate|apprentice/.test(text)) return 'start';
  if(/return to work|reenter|re-enter|career break|after a break|laid off|layoff|unemployed/.test(text)) return 'reenter';
  if(/career change|switch career|transition|move into|pivot/.test(text)) return 'transition';
  if(/director|vice president|vp|c-suite|executive/.test(text)) return 'executive';
  if(/manager|leadership|lead role|supervisor|people manager/.test(text)) return 'leadership';
  if(/freelance|consulting|self employed|independent|contract business/.test(text)) return 'independent';
  if(/promotion|advance|next level|senior|staff|principal|raise|more responsibility/.test(text)) return 'advance';
  return input.hasCurrentRole ? 'advance' : 'start';
}

export function buildCareerHealth(profile:CandidateProfile, evidence:UniversalEvidence[], relationships:RelationshipRecord[] = [], interviewStoryCount=0): CareerHealthScore {
  const roleClarity=clamp((profile.constraints.preferredTitles.length?55:15)+(profile.headline.trim()?20:0)+(profile.constraints.targetLocations.length?10:0)+(profile.constraints.allowedWorkModes.length?10:0));
  const verified=evidence.filter(e=>e.verified).length;
  const strong=evidence.filter(e=>e.strength>=0.75).length;
  const evidenceScore=clamp(Math.min(100,evidence.length*7+verified*7+strong*5));
  const marketability=clamp((profile.skills.length*5)+(strong*7)+(profile.constraints.preferredTitles.length*8));
  const relationshipsScore=clamp(relationships.length*9 + relationships.filter(r=>r.confidence>=0.7).length*7 + relationships.filter(r=>r.interactionCount>0).length*6);
  const interviewReadiness=clamp(interviewStoryCount*10 + strong*4 + Math.min(25,evidence.length*2));
  const compensationLeverage=clamp((profile.constraints.minBaseSalary?25:10)+strong*7+Math.min(30,relationships.length*3));
  const distinctKinds=new Set(evidence.map(e=>e.kind)).size;
  const optionality=clamp(profile.constraints.preferredTitles.length*10 + distinctKinds*8 + Math.min(35,profile.skills.length*3));
  const dimensions={roleClarity,evidence:evidenceScore,marketability,relationships:relationshipsScore,interviewReadiness,compensationLeverage,optionality};
  const entries=Object.entries(dimensions) as Array<[keyof typeof dimensions,number]>;
  entries.sort((a,b)=>a[1]-b[1]);
  return { total:clamp(entries.reduce((sum,[,v])=>sum+v,0)/entries.length), dimensions, weakestDimension:entries[0][0], strongestDimension:entries[entries.length-1][0] };
}

function requirementSupport(requirement:string,evidence:UniversalEvidence[],profile:CandidateProfile) {
  const ev=Math.max(0,...evidence.map(e=>overlap(`${e.capability} ${e.claim}`,requirement)*e.strength*(e.verified?1:0.85)));
  const profileSignal=overlap(`${profile.headline} ${profile.skills.join(' ')}`,requirement)*0.65;
  return Math.max(ev,profileSignal);
}

export function buildLaunchPlan(input:{ profile:CandidateProfile; evidence:UniversalEvidence[]; opportunities?:Opportunity[]; relationships?:RelationshipRecord[]; motion:CareerMotion }): CareerLaunchPlan {
  const { profile,evidence,motion }=input;
  const strongest=[...evidence].sort((a,b)=>b.strength-a.strength).slice(0,6).map(e=>`${e.capability}: ${e.claim}`);
  const targetRoles=unique([
    ...profile.constraints.preferredTitles,
    ...(input.opportunities??[]).filter(o=>!o.hardRejected).sort((a,b)=>b.score.total-a.score.total).slice(0,5).map(o=>o.job.title)
  ]).slice(0,8);
  const barriers:CareerBarrier[]=[];
  if(!targetRoles.length) barriers.push({kind:'positioning',description:'No target role family is defined yet.',severity:'blocking',action:'Define a primary role, one adjacent role, and the outcomes you want from the next move.'});
  if(evidence.length<3) barriers.push({kind:'evidence',description:'The career record does not yet contain enough proof to support strong positioning.',severity:'high',proofNeeded:'At least three concrete, attributable proof records from work, education, credentials, references, outcomes, artifacts, or other legitimate sources.',action:'Capture the strongest real work, results, credentials, responsibilities, references, or work samples before scaling applications.'});
  if(!(input.relationships??[]).length) barriers.push({kind:'network',description:'There are no relationship paths in the current career graph.',severity:'medium',action:'Build targeted recruiter, hiring-manager, peer, alumni, community, customer, instructor, union, association, or referral paths appropriate to the profession.'});
  for(const opp of (input.opportunities??[]).filter(o=>!o.hardRejected).slice(0,8)) {
    const decomp=decomposeRequirements(opp);
    for(const gate of decomp.requirements.filter(r=>r.classification==='hard')) {
      const support=requirementSupport(gate.text,evidence,profile);
      if(support<0.2 && /license|licensed|certif|clearance|degree|registration|permit|authorization/i.test(gate.text)) {
        barriers.push({kind:'credential',description:`Potential hard gate for ${opp.job.title}: ${gate.text}`,severity:'blocking',proofNeeded:gate.text,action:'Verify whether the requirement is legally or employer-mandated. Do not position around a missing mandatory credential.'});
      }
    }
  }
  const firstProofActions=[
    evidence.length<3 ? 'Add concrete proof records until the strongest claims are attributable and interview-defensible.' : 'Refresh the strongest proof records so dates, scope, outcomes, and source links are current.',
    'Build one role-specific proof narrative that shows capability, context, action, and outcome without relying on unsupported metrics.',
    'Identify the smallest missing proof that would unlock the highest-value target role.'
  ];
  const relationshipActions=[
    'Map people who can validate, refer, hire, advise, or provide accurate market information for the target role.',
    'Prioritize warm, credible paths before relying on cold applications alone.',
    'Track relationship quality, relevance, last interaction, and appropriate follow-up timing.'
  ];
  const applicationReadiness=clamp(100 - barriers.reduce((sum,b)=>sum+(b.severity==='blocking'?35:b.severity==='high'?20:b.severity==='medium'?10:5),0));
  const motionAction:Record<CareerMotion,string>={
    start:'Target roles where demonstrated potential and transferable proof can substitute for long work history, while treating mandatory credentials as hard gates.',
    reenter:'Reconstruct current capability and recent proof so a career gap does not become the entire narrative.',
    transition:'Translate prior capability into the target profession’s language and close only the gaps that materially affect hiring.',
    advance:'Prove next-level scope, impact, judgment, and ownership before asking the market to infer them.',
    leadership:'Build evidence of team leverage, decision quality, coaching, conflict handling, operational ownership, and outcomes through others.',
    executive:'Lead with enterprise outcomes, strategy, allocation decisions, organizational leverage, governance, and durable business results.',
    independent:'Package capability around buyer outcomes, proof, trust, pricing logic, repeatability, and relationship-driven demand.'
  };
  return { motion,targetRoles,strongestAssets:strongest,barriers,firstProofActions,relationshipActions,applicationReadiness,nextBestActions:[motionAction[motion],...firstProofActions.slice(0,2),...relationshipActions.slice(0,1)] };
}

export function buildTransitionBridge(profile:CandidateProfile,evidence:UniversalEvidence[],targetRole:string,opportunities:Opportunity[]=[]): TransitionBridge {
  const related=opportunities.filter(o=>normalize(o.job.title).includes(normalize(targetRole))||normalize(targetRole).includes(normalize(o.job.title)));
  const reqs=unique(related.flatMap(o=>decomposeRequirements(o).requirements.map(r=>r.text)));
  const targetCapabilities=reqs.length?reqs:[targetRole];
  const synthesized=synthesizeEvidenceGraph(evidence,targetCapabilities);
  const transferableCapabilities=synthesized.filter(s=>s.strength>=0.2).slice(0,10).map(s=>({capability:s.capability,strength:s.strength,evidenceIds:s.evidenceIds}));
  const hardGates=unique(related.flatMap(o=>decomposeRequirements(o).requirements.filter(r=>r.classification==='hard').map(r=>r.text)));
  const missingHard=hardGates.filter(g=>requirementSupport(g,evidence,profile)<0.2);
  const evidenceGaps=synthesized.filter(s=>s.strength<0.2).slice(0,8).map(s=>s.capability);
  const readiness=clamp((transferableCapabilities.reduce((s,c)=>s+c.strength,0)/Math.max(1,targetCapabilities.length))*100 - missingHard.length*20);
  return {
    targetRole,
    transferableCapabilities,
    hardGates:missingHard,
    evidenceGaps,
    translationRules:[
      'Translate prior work into the target role’s outcomes and responsibilities without changing the underlying facts.',
      'Prefer demonstrated adjacent capability over generic claims of being a fast learner.',
      'Separate mandatory credentials from trainable employer preferences.',
      'Use proof from work, education, volunteering, military service, caregiving, portfolios, references, certifications, assessments, or other legitimate sources according to the profession.'
    ],
    proofPlan:evidenceGaps.slice(0,5).map(g=>`Create or capture the smallest legitimate proof that demonstrates ${g} in a context relevant to ${targetRole}.`),
    readiness
  };
}

export function buildAdvancementPlan(profile:CandidateProfile,evidence:UniversalEvidence[],opportunities:Opportunity[]=[]): AdvancementPlan {
  const strongest=[...evidence].sort((a,b)=>b.strength-a.strength).slice(0,8);
  const currentValueSignals=strongest.map(e=>`${e.capability}: ${e.claim}`);
  const nextLevelSignals=unique(opportunities.filter(o=>!o.hardRejected).sort((a,b)=>b.score.total-a.score.total).slice(0,8).flatMap(o=>decomposeRequirements(o).successCriteria)).slice(0,10);
  const source=evidenceText(evidence);
  const missingPromotionEvidence=nextLevelSignals.filter(signal=>overlap(source,signal)<0.18).slice(0,8);
  return {
    currentValueSignals,
    nextLevelSignals,
    missingPromotionEvidence,
    scopeExpansionActions:[
      'Choose one next-level responsibility that can be demonstrated in the current role before title change.',
      'Capture decisions, scope, stakeholders, difficulty, reliability, and outcomes as the work happens.',
      'Build evidence of leverage: improving systems, people, customers, quality, safety, throughput, revenue, cost, learning, or risk as appropriate to the profession.'
    ],
    compensationActions:[
      'Separate market value, internal pay structure, and negotiation leverage instead of relying on one salary number.',
      'Track comparable roles, actual interview demand, competing opportunities, expanded scope, and documented results.',
      'Negotiate total value: base pay, schedule, location, bonus, equity where applicable, benefits, title, scope, learning, flexibility, and advancement path.'
    ],
    internalMobilityActions:[
      'Identify roles inside the current organization where existing trust and context reduce transition friction.',
      'Map decision makers and evidence required for promotion or transfer before the formal process starts.',
      'Create a promotion packet that makes next-level performance legible rather than relying on manager memory.'
    ],
    externalLeverageActions:[
      'Keep external market evidence current even when not actively leaving.',
      'Maintain relationships outside the current employer so optionality does not collapse.',
      'Benchmark the next role against compensation, fulfillment, growth, stability, and long-term option value.'
    ],
    promotionPacket:[
      `Current positioning: ${profile.headline}`,
      ...strongest.slice(0,5).map(e=>`Proof: ${e.claim}`),
      ...missingPromotionEvidence.slice(0,3).map(g=>`Evidence to add: ${g}`)
    ]
  };
}

export function diagnoseFunnel(observation:FunnelObservation): FunnelDiagnosis {
  const {applications,screens,interviews,offers}=observation;
  if(applications<8) return {primaryFailureMode:'insufficient-data',confidence:35,observations:['There are not enough recent applications to infer a stable failure pattern.'],correctiveActions:['Keep applications selective and record source, role, evidence version, positioning variant, outreach path, and outcome.'],doNotDo:['Do not rewrite the entire strategy from a tiny sample.']};
  const screenRate=screens/Math.max(1,applications);
  const interviewRate=interviews/Math.max(1,screens);
  const offerRate=offers/Math.max(1,interviews);
  const warmRate=(observation.warmPathScreens??0)/Math.max(1,observation.warmPathApplications??0);
  if(screenRate<0.1) {
    const distribution=(observation.warmPathApplications??0)<Math.max(2,applications*0.15);
    return {primaryFailureMode:distribution?'distribution':'positioning',confidence:72,observations:[`Application-to-screen rate is ${Math.round(screenRate*100)}%.`,distribution?'Warm-path usage is low relative to application volume.':'Warm-path use exists, so targeting/evidence/positioning deserve closer inspection.',warmRate>screenRate&&observation.warmPathApplications?`Warm-path screen conversion (${Math.round(warmRate*100)}%) exceeds overall conversion.`:''],correctiveActions:[distribution?'Increase credible recruiter, peer, referral, alumni, professional-association, or hiring-manager paths.':'Audit target-role selection, top-third resume evidence, hard gates, and role-specific positioning.','Compare successful and unsuccessful application variants before increasing volume.'],doNotDo:['Do not respond to weak conversion by sending indiscriminate applications.']};
  }
  if(screens>=4&&interviewRate<0.35) return {primaryFailureMode:'screening',confidence:75,observations:[`Screen-to-interview conversion is ${Math.round(interviewRate*100)}%.`],correctiveActions:['Tighten career story, role motivation, compensation/logistics answers, and proof selection.','Practice concise evidence-backed answers to the actual initial-screen filters.'],doNotDo:['Do not assume the resume is the main problem when recruiters are already screening you.']};
  if(interviews>=3&&offerRate<0.25) return {primaryFailureMode:'interview',confidence:78,observations:[`Interview-to-offer conversion is ${Math.round(offerRate*100)}%.`],correctiveActions:['Classify losses by interview stage and competency.','Retrieve stronger evidence-backed stories and role simulations for repeated weak areas.','Evaluate whether some interviews are for roles beyond current readiness.'],doNotDo:['Do not keep changing the resume if the primary loss happens after interviews begin.']};
  if(offers>0) return {primaryFailureMode:'offer',confidence:62,observations:['The funnel is reaching offers.'],correctiveActions:['Optimize offer quality, negotiation, acceptance decisions, and long-term fit rather than maximizing more interviews.'],doNotDo:['Do not treat offer count alone as success; evaluate compensation, role quality, growth, stability, and satisfaction.']};
  return {primaryFailureMode:'market',confidence:50,observations:['No single funnel stage is clearly failing from the current sample.'],correctiveActions:['Segment outcomes by role family, employer type, source, timing, geography, compensation, and positioning variant.','Preserve uncertainty until a stronger causal pattern emerges.'],doNotDo:['Do not force a diagnosis when the data does not support one.']};
}

export function buildResiliencePlan(profile:CandidateProfile,evidence:UniversalEvidence[],relationships:RelationshipRecord[]=[]): CareerResiliencePlan {
  const now=Date.now();
  const dated=evidence.flatMap(e=>{const match=e.claim.match(/\b(20\d{2})\b/g);return match?.map(y=>Number(y))??[];});
  const newest=dated.length?Math.max(...dated):new Date().getUTCFullYear();
  const freshness=clamp(100-Math.max(0,new Date(now).getUTCFullYear()-newest)*18);
  const relationshipCoverage=clamp(relationships.length*8+new Set(relationships.map(r=>r.relationshipType)).size*9);
  const optionValue=clamp(profile.constraints.preferredTitles.length*12+new Set(evidence.map(e=>e.capability)).size*5+new Set(evidence.map(e=>e.kind)).size*8);
  const bargaining=clamp(evidence.filter(e=>e.verified&&e.strength>=0.75).length*9+relationships.filter(r=>r.confidence>=0.7).length*5+(profile.constraints.minBaseSalary?15:0));
  const concentrationRisks:string[]=[];
  if(new Set(evidence.map(e=>e.kind)).size<=1) concentrationRisks.push('Career proof is concentrated in one evidence type.');
  if(relationships.length<5) concentrationRisks.push('Professional relationship coverage is thin.');
  if(profile.constraints.preferredTitles.length<=1) concentrationRisks.push('Career optionality is concentrated in one title path.');
  return {evidenceFreshnessScore:freshness,relationshipCoverageScore:relationshipCoverage,optionValueScore:optionValue,bargainingPowerScore:bargaining,concentrationRisks,resilienceActions:[
    'Keep proof current even when not job searching.',
    'Maintain relationships across employers, peers, recruiters, mentors, customers, associations, and adjacent functions appropriate to the profession.',
    'Preserve at least one credible adjacent career path so a single employer or role family cannot trap the user.',
    'Continuously convert real work into durable evidence that survives manager changes, layoffs, reorganizations, and career transitions.'
  ]};
}

export function buildOpportunityFrontier(profile:CandidateProfile,evidence:UniversalEvidence[],opportunities:Opportunity[]) {
  return opportunities.filter(o=>!o.hardRejected).map(o=>{
    const decomp=decomposeRequirements(o);
    const coverage=decomp.requirements.length?decomp.requirements.reduce((s,r)=>s+requirementSupport(r.text,evidence,profile)*r.weight,0)/decomp.requirements.reduce((s,r)=>s+r.weight,0):0.5;
    const upside=(o.score.careerUpside+o.score.compensation+o.score.interviewProbability)/300;
    const score=clamp(coverage*55+upside*35+Math.min(10,o.score.freshness/10));
    return {opportunityId:o.id,title:o.job.title,company:o.job.company,score,reason:`career-proof coverage ${Math.round(coverage*100)}%; existing opportunity score ${o.score.total}/100`};
  }).sort((a,b)=>b.score-a.score).slice(0,12);
}

export function buildCareerAdvantagePlan(input:{
  profile:CandidateProfile;
  evidence:Evidence[]|UniversalEvidence[];
  opportunities?:Opportunity[];
  relationships?:RelationshipRecord[];
  message?:string;
  interviewStoryCount?:number;
  funnel?:FunnelObservation;
  hasCurrentRole?:boolean;
}): CareerAdvantagePlan {
  const evidence:UniversalEvidence[]=(input.evidence as UniversalEvidence[]).every(e=>'kind' in e)?input.evidence as UniversalEvidence[]:toUniversalEvidence(input.evidence as Evidence[]);
  const opportunities=input.opportunities??[];
  const relationships=input.relationships??[];
  const motion=inferCareerMotion({message:input.message,profile:input.profile,hasCurrentRole:input.hasCurrentRole});
  const health=buildCareerHealth(input.profile,evidence,relationships,input.interviewStoryCount??0);
  const launch=buildLaunchPlan({profile:input.profile,evidence,opportunities,relationships,motion});
  const targetRoles=unique([...input.profile.constraints.preferredTitles,...opportunities.filter(o=>!o.hardRejected).slice(0,5).map(o=>o.job.title)]).slice(0,5);
  const transitions=(motion==='transition'||motion==='start'||motion==='reenter')?targetRoles.map(role=>buildTransitionBridge(input.profile,evidence,role,opportunities)).sort((a,b)=>b.readiness-a.readiness):[];
  const advancement=buildAdvancementPlan(input.profile,evidence,opportunities);
  const resilience=buildResiliencePlan(input.profile,evidence,relationships);
  const frontier=buildOpportunityFrontier(input.profile,evidence,opportunities);
  return {
    objective:'maximize durable career mobility: help the user enter, transition, win, advance, negotiate, and preserve future options using evidence appropriate to the profession',
    motion,health,launch,transitions,advancement,resilience,funnel:input.funnel?diagnoseFunnel(input.funnel):undefined,opportunityFrontier:frontier,
    operatingRules:[
      'Treat every profession and industry as first-class; choose evidence and hiring logic appropriate to the role.',
      'Separate legal or mandatory credential gates from preferences that can be addressed with adjacent evidence or learning.',
      'Optimize for interviews, offers, compensation, fulfillment, advancement, retention, and future option value—not application volume.',
      'Use strongest-defensible candidate advocacy without manufacturing employers, titles, credentials, tools, scope, metrics, outcomes, or experience.',
      'Diagnose the failing stage before changing strategy.',
      'Prefer the smallest high-value proof action over generic skill accumulation.',
      'Keep every recommendation explainable, attributable, and reversible when new evidence changes the picture.'
    ]
  };
}
