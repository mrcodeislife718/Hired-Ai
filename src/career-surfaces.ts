import type { CandidateProfile, Evidence, Opportunity } from './domain.js';

export type CareerSurfaceId =
  | 'career-profile' | 'job-search' | 'job-alerts' | 'saved-jobs' | 'application-tracker'
  | 'resume-studio' | 'cover-letters' | 'company-research' | 'salary-intelligence' | 'career-exploration'
  | 'messages' | 'interview-practice' | 'offer-negotiation' | 'github-career' | 'social-career'
  | 'networking' | 'career-development' | 'employer-matching' | 'employer-screening' | 'employer-sourcing'
  | 'employer-dashboard' | 'employer-brand' | 'hiring-collaboration' | 'internal-mobility' | 'outcome-followup';

export interface CareerSurface {
  id: CareerSurfaceId;
  side: 'candidate' | 'employer' | 'both';
  baseline: string;
  mayaAdvantage: string;
  trustRule: string;
}

export const careerSurfaces: CareerSurface[] = [
  { id:'career-profile', side:'candidate', baseline:'Profile, skills, experience, education, certifications and preferences.', mayaAdvantage:'Career Twin with provenance, confidence, goals, dislikes, fulfillment preferences and evolving trajectory.', trustRule:'User-confirmed facts stay distinct from inference.' },
  { id:'job-search', side:'candidate', baseline:'Natural-language and filtered job discovery.', mayaAdvantage:'Freshness-verified, evidence-backed, fulfillment-aware selective opportunity ranking.', trustRule:'No paid boost can alter organic fit.' },
  { id:'job-alerts', side:'candidate', baseline:'Alerts for new matching jobs.', mayaAdvantage:'Alert only when an opportunity meaningfully beats the user’s current option set or satisfies explicit watch criteria.', trustRule:'No engagement spam.' },
  { id:'saved-jobs', side:'candidate', baseline:'Save jobs for later.', mayaAdvantage:'Save with reason, confidence, next action, expiry/freshness and comparison to alternatives.', trustRule:'Stale jobs degrade automatically.' },
  { id:'application-tracker', side:'candidate', baseline:'Track applied jobs and statuses.', mayaAdvantage:'Track resume version, evidence used, outreach path, follow-up, interview stages and causal outcome signals.', trustRule:'Never claim an external action succeeded without confirmation.' },
  { id:'resume-studio', side:'candidate', baseline:'Build and tailor resumes.', mayaAdvantage:'Free ATS-safe professional resume plus paid evidence-aware targeted variants and premium templates.', trustRule:'Never invent qualifications, metrics or awards.' },
  { id:'cover-letters', side:'candidate', baseline:'Application messaging support.', mayaAdvantage:'Evidence-grounded, employer-specific letters that add context without parroting postings.', trustRule:'Every material claim must be attributable.' },
  { id:'company-research', side:'candidate', baseline:'Reviews, salaries, company pages and role context.', mayaAdvantage:'Employer quality, role reality, management/pace/autonomy unknowns, hiring behavior and mutual-fit risks.', trustRule:'Separate sourced facts from inference and unknowns.' },
  { id:'salary-intelligence', side:'candidate', baseline:'Salary ranges and pay insights.', mayaAdvantage:'Personalized total-compensation target, market range, opportunity cost and negotiation strategy.', trustRule:'Ranges carry source/freshness/confidence.' },
  { id:'career-exploration', side:'candidate', baseline:'Explore roles and career paths.', mayaAdvantage:'Model transitions against demonstrated capabilities, fulfillment, compensation, learning cost and long-term trajectory.', trustRule:'Do not recommend aspirational paths as immediately attainable without evidence.' },
  { id:'messages', side:'both', baseline:'Candidate-employer messaging.', mayaAdvantage:'Context-aware drafts, response prioritization, follow-up timing and conversation memory.', trustRule:'Identity-bearing sends require authorization.' },
  { id:'interview-practice', side:'candidate', baseline:'Practice interviews and get tips.', mayaAdvantage:'Role-specific recruiter, behavioral, technical, system-design and gap-handling drills with iterative scoring.', trustRule:'Feedback must distinguish observed answer quality from speculative employer preference.' },
  { id:'offer-negotiation', side:'candidate', baseline:'Negotiation tips.', mayaAdvantage:'Offer comparison, BATNA, market evidence, compensation components, fulfillment tradeoffs and personalized negotiation plan.', trustRule:'Never fabricate competing offers or leverage.' },
  { id:'github-career', side:'candidate', baseline:'No equivalent core job-board surface.', mayaAdvantage:'Audit repository organization, pinned work, README clarity, proof, demos, CI, screenshots and recruiter-facing evidence.', trustRule:'Production claims must be verified.' },
  { id:'social-career', side:'candidate', baseline:'Limited profile visibility and messaging.', mayaAdvantage:'Align LinkedIn and other professional social presence with target roles; build authority with proof-backed content.', trustRule:'No fake engagement, fake credentials or deceptive persona.' },
  { id:'networking', side:'candidate', baseline:'Employer messaging and discovery.', mayaAdvantage:'Relationship graph across recruiters, hiring managers, peers, founders, communities and warm paths with appropriate follow-up.', trustRule:'No spam or invented relationships.' },
  { id:'career-development', side:'candidate', baseline:'Career advice and transition guidance.', mayaAdvantage:'Close verified skill gaps with projects, work samples, credentials and proof-of-readiness tied to real target roles.', trustRule:'Learning completion does not equal professional mastery.' },
  { id:'employer-matching', side:'employer', baseline:'Matched candidates.', mayaAdvantage:'Explain capability, evidence, fulfillment, retention signals, uncertainty and why an interview is worth the time.', trustRule:'Sensitive or irrelevant personal traits must not drive ranking.' },
  { id:'employer-screening', side:'employer', baseline:'Screener questions and automated screening.', mayaAdvantage:'Separate true blockers from wishlist requirements; evidence-aware qualification and structured manual-review paths.', trustRule:'Consequential rejection logic must be explainable and job-relevant.' },
  { id:'employer-sourcing', side:'employer', baseline:'Resume search, sourcing and candidate outreach.', mayaAdvantage:'Search demonstrated capability and career intent, not only resume keywords; prioritize mutual-fit candidates.', trustRule:'Candidate visibility and contact follow consent/privacy settings.' },
  { id:'employer-dashboard', side:'employer', baseline:'Jobs, applicants, messages, interviews and statuses.', mayaAdvantage:'Unified role calibration, shortlist quality, evidence, interview learning, time-to-decision and post-hire outcome view.', trustRule:'Tenant isolation and auditable access.' },
  { id:'employer-brand', side:'employer', baseline:'Company profile and promoted visibility.', mayaAdvantage:'Verified culture/role claims, compensation clarity, actual employee-outcome signals and transparent unknowns.', trustRule:'Payment cannot turn unverified employer claims into fact.' },
  { id:'hiring-collaboration', side:'employer', baseline:'Hiring-team collaboration and ATS integrations.', mayaAdvantage:'Shared evidence packets, structured disagreement, decision rationale and handoffs across recruiters/hiring managers.', trustRule:'Keep a durable decision audit trail.' },
  { id:'internal-mobility', side:'employer', baseline:'Adjacent enterprise talent functionality.', mayaAdvantage:'Match existing employees to roles, learning paths and career moves before losing them externally.', trustRule:'Purpose-limit employee data.' },
  { id:'outcome-followup', side:'both', baseline:'Job boards largely optimize through hire.', mayaAdvantage:'30/90/365-day satisfaction, growth, compensation and mutual regret tracking that improves future matches.', trustRule:'Post-hire outcomes remain voluntary, privacy-protected and attributable.' }
];

export interface GithubCareerAuditInput {
  repositories: Array<{ name:string; description?:string; hasReadme?:boolean; hasTests?:boolean; hasCi?:boolean; hasDemo?:boolean; archived?:boolean; updatedAt?:string }>;
  pinned?: string[];
}

export function auditGithubForCareer(input: GithubCareerAuditInput) {
  const active = input.repositories.filter(r => !r.archived);
  const scored = active.map(repo => {
    const score = (repo.description ? 15 : 0) + (repo.hasReadme ? 25 : 0) + (repo.hasTests ? 20 : 0) + (repo.hasCi ? 15 : 0) + (repo.hasDemo ? 25 : 0);
    const gaps = [!repo.description && 'missing concise description', !repo.hasReadme && 'missing README', !repo.hasTests && 'no visible tests', !repo.hasCi && 'no visible CI', !repo.hasDemo && 'no demo/proof surface'].filter(Boolean) as string[];
    return { name:repo.name, score, gaps };
  }).sort((a,b)=>b.score-a.score);
  const pinned = new Set(input.pinned ?? []);
  return {
    repositoryCount: active.length,
    strongest: scored.slice(0,6),
    weakPresentation: scored.filter(r=>r.score<60),
    pinnedGaps: scored.filter(r=>r.score>=70 && !pinned.has(r.name)).slice(0,6).map(r=>`${r.name} is strong enough to consider pinning`),
    actions: [
      'pin the repositories that best prove target-role capability',
      'make each pinned README answer problem, user, architecture, proof, setup and result quickly',
      'show working demos/screenshots where they materially improve evaluation',
      'surface tests/CI and distinguish prototype, production candidate and deployed product truthfully',
      'archive or de-emphasize repositories that dilute the professional narrative'
    ]
  };
}

export function buildSocialCareerPlan(platforms: string[], targetRoles: string[], evidence: Evidence[]) {
  const proof = [...evidence].sort((a,b)=>b.strength-a.strength).slice(0,5).map(e=>({ skill:e.skill, repository:e.repository, claim:e.claim }));
  return {
    targetRoles,
    platforms: platforms.map(platform=>({
      platform,
      objectives:['be discoverable for target roles','demonstrate credible expertise','create repeated warm professional contact'],
      actions:['align headline/about/profile with target direction','feature strongest proof','publish useful evidence-backed work','engage relevant peers and leaders before asking for anything','track which interactions create real career conversations']
    })),
    proof,
    rule:'build professional trust and useful relationships; never manufacture engagement or fake authority'
  };
}

export function buildNetworkingPlan(input: { targetCompanies:string[]; existingContacts?:string[]; communities?:string[] }) {
  return {
    targetCompanies:input.targetCompanies,
    lanes:['recruiters','hiring managers','future peers','technical leaders','founders','mentors','communities','former colleagues','referrals'],
    sequence:['research relevance','create a legitimate reason to connect','engage before asking when possible','make a small respectful request','record interaction','follow up only when useful'],
    existingContacts:input.existingContacts ?? [],
    communities:input.communities ?? [],
    antiSpamRule:'quality relationships beat connection count'
  };
}

export interface OfferInput { employer:string; title:string; base?:number; bonus?:number; equityAnnualized?:number; signOn?:number; benefitsAnnualValue?:number; workMode?:string; notes?:string[]; }
export function compareAndNegotiateOffers(offers: OfferInput[], targetBase?: number) {
  const normalized = offers.map(o=>({ ...o, estimatedAnnualCash:(o.base??0)+(o.bonus??0)+(o.signOn??0), estimatedAnnualTotal:(o.base??0)+(o.bonus??0)+(o.equityAnnualized??0)+(o.signOn??0)+(o.benefitsAnnualValue??0) }))
    .sort((a,b)=>b.estimatedAnnualTotal-a.estimatedAnnualTotal);
  return {
    offers:normalized,
    strongestEconomicOffer:normalized[0]?.employer,
    negotiationChecklist:['confirm level/title and scope','validate market range and internal constraints','prioritize the few terms that matter most','state evidence-backed value','ask collaboratively and specifically','evaluate base, bonus, equity, sign-on, benefits, flexibility, growth and role quality together','get final terms in writing'],
    targetBase,
    truthRule:'never invent competing offers, salary data, deadlines or leverage'
  };
}

export function buildInterviewPractice(opportunity: Opportunity) {
  return {
    role:`${opportunity.job.title} at ${opportunity.job.company}`,
    rounds:[
      { type:'recruiter', goals:['career story','role motivation','logistics','compensation expectations'] },
      { type:'behavioral', goals:['specific STAR evidence','decision quality','collaboration','failure and learning'] },
      { type:'technical', goals:opportunity.intelligence.likelyInterviewAreas },
      { type:'role-simulation', goals:['perform work resembling the actual role','explain tradeoffs','surface uncertainty'] },
      { type:'candidate-questions', goals:['test management','success criteria','team reality','growth','work content','why the role is open'] }
    ],
    gapDrills:opportunity.gaps.filter(g=>g.strength!=='strong').map(g=>({ skill:g.skill, instruction:'state current level accurately, connect adjacent evidence, explain a credible ramp plan' })),
    scoring:['accuracy','specific evidence','clarity','depth','judgment','tradeoff awareness','role relevance','truthful handling of unknowns'],
    rule:'practice is for improving real interview performance, not scripting deceptive answers'
  };
}

export function surfaceCoverage() {
  const candidate = careerSurfaces.filter(s=>s.side==='candidate'||s.side==='both');
  const employer = careerSurfaces.filter(s=>s.side==='employer'||s.side==='both');
  return { total:careerSurfaces.length, candidate:candidate.length, employer:employer.length, surfaces:careerSurfaces };
}

export function buildWellRoundedCareerPlan(profile: CandidateProfile, evidence: Evidence[], opportunities: Opportunity[]) {
  const companies = [...new Set(opportunities.filter(o=>!o.hardRejected).sort((a,b)=>b.score.total-a.score.total).slice(0,8).map(o=>o.job.company))];
  return {
    objective:'make Maya useful across discovery, readiness, professional presence, relationships, interviews, negotiation, career growth and post-hire outcomes',
    targetRoles:profile.constraints.preferredTitles,
    github:{ strongestEvidenceRepositories:[...new Set([...evidence].sort((a,b)=>b.strength-a.strength).map(e=>e.repository))].slice(0,8) },
    social:buildSocialCareerPlan(['linkedin','github'], profile.constraints.preferredTitles, evidence),
    network:buildNetworkingPlan({ targetCompanies:companies }),
    interviewTargets:opportunities.filter(o=>!o.hardRejected).slice(0,3).map(buildInterviewPractice),
    coverage:surfaceCoverage()
  };
}
