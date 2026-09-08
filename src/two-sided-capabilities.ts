export type ProductAudience = 'candidate' | 'employer';
export type CandidateAccessTier = 'free' | 'career' | 'pro' | 'concierge';
export type EmployerAccessTier = 'free' | 'starter' | 'pro' | 'enterprise';
export type AccessTier = CandidateAccessTier | EmployerAccessTier;
export type CapabilityClass = 'core' | 'intelligence' | 'workflow' | 'automation' | 'collaboration' | 'governance' | 'enterprise' | 'service';

export interface ProductCapability {
  id: string;
  audience: ProductAudience;
  name: string;
  description: string;
  minimumTier: AccessTier;
  class: CapabilityClass;
  trustCritical?: boolean;
  usageBoundary?: string;
}

const candidateRank: Record<CandidateAccessTier, number> = { free:0, career:1, pro:2, concierge:3 };
const employerRank: Record<EmployerAccessTier, number> = { free:0, starter:1, pro:2, enterprise:3 };

export const productCapabilities: readonly ProductCapability[] = [
  {id:'candidate-conversation',audience:'candidate',name:'Conversational career onboarding',description:'Outcome-first onboarding that progressively builds the Career Twin and useful career assets.',minimumTier:'free',class:'core'},
  {id:'candidate-career-record',audience:'candidate',name:'Career Twin and canonical career record',description:'Durable goals, constraints, preferences, evidence, unknowns and career history with provenance.',minimumTier:'free',class:'core',trustCritical:true},
  {id:'candidate-master-docs',audience:'candidate',name:'Core career documentation',description:'Career brief, master resume, professional profile, evidence index and accomplishment bank from one factual record.',minimumTier:'free',class:'core'},
  {id:'candidate-opportunity-discovery',audience:'candidate',name:'Opportunity discovery and matching',description:'Find and rank relevant opportunities using evidence, constraints, freshness and career value.',minimumTier:'free',class:'intelligence'},
  {id:'candidate-basic-readiness',audience:'candidate',name:'Role readiness and evidence coverage',description:'Explain supported strengths, material gaps, hard gates and what is missing from the resume versus the candidate.',minimumTier:'free',class:'intelligence',trustCritical:true},
  {id:'candidate-basic-interview',audience:'candidate',name:'Interview practice',description:'Evidence-grounded practice for likely interview questions and role requirements.',minimumTier:'free',class:'workflow'},
  {id:'candidate-tracker',audience:'candidate',name:'Application and opportunity tracking',description:'Track saved roles, applications, stages and outcomes without requiring a paid plan.',minimumTier:'free',class:'workflow'},
  {id:'candidate-privacy-controls',audience:'candidate',name:'Sharing, export and deletion controls',description:'Control employer discoverability and data sharing; export and delete personal career state.',minimumTier:'free',class:'governance',trustCritical:true},
  {id:'candidate-targeted-docs',audience:'candidate',name:'Targeted career document portfolio',description:'Role-specific resume variants, story alignment, stale-document detection and synchronized regeneration.',minimumTier:'career',class:'intelligence'},
  {id:'candidate-company-comp',audience:'candidate',name:'Company, role and compensation intelligence',description:'Evaluate employers, compensation, role quality and career tradeoffs.',minimumTier:'career',class:'intelligence'},
  {id:'candidate-professional-presence',audience:'candidate',name:'Professional presence and networking plan',description:'Profession-appropriate profile, portfolio, relationship and networking guidance.',minimumTier:'career',class:'workflow'},
  {id:'candidate-development',audience:'candidate',name:'Career development planning',description:'Prioritize the smallest high-value evidence, credential, practice or experience move that expands opportunity access.',minimumTier:'career',class:'intelligence'},
  {id:'candidate-competitive-selection',audience:'candidate',name:'Competitive selection intelligence',description:'Hiring-manager, recruiter and ATS perspectives with requirement-to-evidence mapping and shortlist simulation.',minimumTier:'pro',class:'intelligence'},
  {id:'candidate-acquisition-orchestration',audience:'candidate',name:'Governed acquisition orchestration',description:'Prepare role-specific applications, outreach and follow-ups from the same factual claim set with approval gates.',minimumTier:'pro',class:'automation'},
  {id:'candidate-advanced-interview',audience:'candidate',name:'Advanced interview simulation',description:'Multi-stage recruiter, behavioral, technical, role and objection simulation with evidence-backed story continuity.',minimumTier:'pro',class:'workflow'},
  {id:'candidate-negotiation',audience:'candidate',name:'Offer and negotiation intelligence',description:'Compare offers, total compensation and career tradeoffs; prepare truthful negotiation strategy.',minimumTier:'pro',class:'intelligence'},
  {id:'candidate-funnel-learning',audience:'candidate',name:'Career acquisition funnel and outcome learning',description:'Diagnose the stage that is failing and learn from applications, screens, interviews, offers and post-hire outcomes.',minimumTier:'pro',class:'intelligence'},
  {id:'candidate-human-review',audience:'candidate',name:'High-stakes human review',description:'Human review for consequential resumes, transitions, interviews, executive positioning and offers.',minimumTier:'concierge',class:'service'},

  {id:'employer-conversation',audience:'employer',name:'Conversational employer onboarding',description:'Turn a hiring goal or rough job description into a structured Hiring Twin and useful hiring brief.',minimumTier:'free',class:'core'},
  {id:'employer-role-calibration',audience:'employer',name:'Role calibration and hiring brief',description:'Separate real must-haves from trainable and preferred capabilities, define success outcomes and surface unrealistic requirements.',minimumTier:'free',class:'intelligence'},
  {id:'employer-basic-pipeline',audience:'employer',name:'Owned hiring pipeline',description:'Maintain role and candidate-stage state inside the employer account instead of receiving only a delivered shortlist.',minimumTier:'free',class:'workflow'},
  {id:'employer-consented-preview',audience:'employer',name:'Consented candidate match preview',description:'Preview evidence-backed candidate matches only where candidate visibility and organization access permit it.',minimumTier:'free',class:'intelligence',trustCritical:true},
  {id:'employer-scorecard',audience:'employer',name:'Structured scorecard and interview kit',description:'Generate job-relevant evaluation criteria and structured interview questions from actual role requirements.',minimumTier:'free',class:'workflow'},
  {id:'employer-explanations',audience:'employer',name:'Evidence and ranking explanations',description:'Show why a candidate is recommended, which evidence supports each requirement and what remains unknown.',minimumTier:'free',class:'governance',trustCritical:true},
  {id:'employer-data-controls',audience:'employer',name:'Employer data ownership and export',description:'Keep organization hiring state tenant-isolated, exportable and governed by role-based permissions.',minimumTier:'free',class:'governance',trustCritical:true},
  {id:'employer-sourcing',audience:'employer',name:'Expanded sourcing and direct introductions',description:'Search a broader consented talent pool and coordinate attributable direct candidate introductions.',minimumTier:'starter',class:'workflow'},
  {id:'employer-multirole',audience:'employer',name:'Multi-role hiring operations',description:'Run multiple active searches with shared structured scorecards and hiring-team state.',minimumTier:'starter',class:'workflow'},
  {id:'employer-verified-assessments',audience:'employer',name:'Verified role-relevant assessments',description:'Use work samples, scenarios, technical, writing, analysis and structured interview assessments with integrity digests.',minimumTier:'starter',class:'workflow'},
  {id:'employer-collaboration',audience:'employer',name:'Hiring-team collaboration',description:'Recruiter, hiring-manager and stakeholder collaboration under explicit RBAC.',minimumTier:'starter',class:'collaboration'},
  {id:'employer-ai-interviewer',audience:'employer',name:'AI interviewer and custom assessments',description:'Run structured, job-relevant AI interview and assessment workflows without personality-proxy scoring.',minimumTier:'pro',class:'automation'},
  {id:'employer-continuous-sourcing',audience:'employer',name:'Continuous sourcing and match watches',description:'Continuously surface new consented candidates when role-relevant evidence changes or talent enters the network.',minimumTier:'pro',class:'automation'},
  {id:'employer-pipeline-automation',audience:'employer',name:'Pipeline and scheduling automation',description:'Coordinate approved outreach, scheduling, reminders, stage aging and next actions while preserving human decision authority.',minimumTier:'pro',class:'automation'},
  {id:'employer-private-pools',audience:'employer',name:'Private talent pools',description:'Maintain organization-owned candidate pools, prior finalists and relationship context subject to lawful retention and consent.',minimumTier:'pro',class:'workflow'},
  {id:'employer-outcome-analytics',audience:'employer',name:'Hiring outcome intelligence',description:'Measure source quality, stage conversion, offer acceptance, signal quality and later retention/performance where lawful and consented.',minimumTier:'pro',class:'intelligence'},
  {id:'employer-enterprise-integrations',audience:'employer',name:'ATS, HRIS and identity integrations',description:'Integrate Hired AI with enterprise recruiting, HR and identity systems through scoped, auditable connector boundaries.',minimumTier:'enterprise',class:'enterprise'},
  {id:'employer-enterprise-governance',audience:'employer',name:'Enterprise governance',description:'SSO, advanced RBAC, audit logs, retention controls, private controls, SLAs and enterprise security policy.',minimumTier:'enterprise',class:'enterprise'},
  {id:'employer-internal-mobility',audience:'employer',name:'Internal talent mobility and workforce intelligence',description:'Match existing employees to internal roles and development paths and analyze workforce capability supply.',minimumTier:'enterprise',class:'enterprise'},
  {id:'employer-api',audience:'employer',name:'Talent intelligence API',description:'Use evidence matching, readiness, assessment and hiring-quality primitives in approved enterprise systems.',minimumTier:'enterprise',class:'enterprise'}
] as const;

export interface CompetitiveDesignControl {
  id: string;
  protectsAgainst: string;
  architecture: string;
}

export const competitiveDesignControls: readonly CompetitiveDesignControl[] = [
  {id:'consent-first-sharing',protectsAgainst:'opaque candidate profile sharing and trust erosion',architecture:'candidate visibility is deny-by-default; organization allow/block controls and field-level sharing preferences remain authoritative'},
  {id:'owned-employer-system',protectsAgainst:'outsourced-shortlist dependence and loss of employer workflow ownership',architecture:'employers retain durable role, pipeline, evidence, interview, outcome and export state inside their tenant'},
  {id:'open-source-diversification',protectsAgainst:'small proprietary-network density in specialized markets',architecture:'matching can combine the consented Hired AI network with authorized external opportunity, evidence, ATS and sourcing connectors'},
  {id:'evidence-over-keywords',protectsAgainst:'keyword matching and AI-generated application inflation',architecture:'material requirements map to attributable evidence, verified assessments and explicit unknowns before ranking'},
  {id:'human-judgment-escalation',protectsAgainst:'automation losing nuance in high-stakes or ambiguous hiring decisions',architecture:'AI prepares evidence and recommendations while consequential reject, offer and hire decisions remain human-authorized; human review can be added where valuable'},
  {id:'ranking-firewall',protectsAgainst:'paid access corrupting organic matching',architecture:'subscriptions, success fees and promotion cannot purchase higher organic readiness, fit or employer-quality scores'},
  {id:'adversarial-boundaries',protectsAgainst:'prompt injection, connector abuse and unauthorized external action',architecture:'durable truth stores, scoped connectors, approval-gated identity actions, verified delivery, rate limits and audit trails stay outside model discretion'},
  {id:'bias-resistant-evaluation',protectsAgainst:'weak proxies and unstructured hiring judgments',architecture:'structured requirements, evidence substitution, blind evidence review, fact/inference separation, counterfactual checks and fairness audit trails'},
  {id:'mutual-quality',protectsAgainst:'optimizing only employer conversion or only candidate placement',architecture:'candidate readiness and fulfillment fit are distinct from employer quality; durable-match outcomes feed both sides'},
  {id:'portable-state',protectsAgainst:'platform lock-in',architecture:'candidate and employer core state is exportable; paid tiers buy capability rather than ownership of the user’s underlying facts'}
] as const;

function rank(audience: ProductAudience, tier: AccessTier) {
  if (audience === 'candidate') {
    if (!(tier in candidateRank)) throw new Error(`invalid candidate tier: ${tier}`);
    return candidateRank[tier as CandidateAccessTier];
  }
  if (!(tier in employerRank)) throw new Error(`invalid employer tier: ${tier}`);
  return employerRank[tier as EmployerAccessTier];
}

export function canUseCapability(audience: ProductAudience, tier: AccessTier, capabilityId: string) {
  const capability = productCapabilities.find(item => item.id === capabilityId && item.audience === audience);
  if (!capability) return false;
  return rank(audience, tier) >= rank(audience, capability.minimumTier);
}

export function capabilitiesFor(audience: ProductAudience, tier: AccessTier) {
  rank(audience, tier);
  return productCapabilities.filter(item => item.audience === audience && canUseCapability(audience, tier, item.id));
}

export function lockedCapabilitiesFor(audience: ProductAudience, tier: AccessTier) {
  rank(audience, tier);
  return productCapabilities.filter(item => item.audience === audience && !canUseCapability(audience, tier, item.id));
}

export function validateCapabilityArchitecture() {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const capability of productCapabilities) {
    if (ids.has(capability.id)) problems.push(`duplicate capability id: ${capability.id}`);
    ids.add(capability.id);
    try { rank(capability.audience, capability.minimumTier); } catch (error) { problems.push((error as Error).message); }
    if (capability.trustCritical && capability.minimumTier !== 'free') problems.push(`${capability.id}: trust-critical capability must remain free`);
  }
  for (const audience of ['candidate','employer'] as const) {
    const free = capabilitiesFor(audience,'free');
    if (!free.length) problems.push(`${audience}: free tier must deliver standalone value`);
    if (!free.some(item => item.trustCritical)) problems.push(`${audience}: free tier must include trust controls`);
  }
  return {valid:problems.length===0,problems};
}
