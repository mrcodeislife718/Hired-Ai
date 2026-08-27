import type { CandidateProfile, Evidence, Opportunity } from './domain.js';
import { positionCapability, positioningInstructions, type PositionedClaim } from './candidate-positioning.js';
import { normalize, unique } from './utils.js';

export interface JobAlignment {
  opportunityId: string;
  matchedRequirements: string[];
  underemphasizedRequirements: string[];
  unsupportedRequirements: string[];
  truthfulKeywords: string[];
  positionedRequirements: PositionedClaim[];
  fitScore: number;
  rule: string;
}

export interface ResumeOptimizationPlan {
  headline: string;
  emphasizedSkills: string[];
  evidenceClaims: Array<{ skill:string; claim:string; repository:string; url:string }>;
  atsRules: string[];
  rewriteRules: string[];
}

export interface BulletRewriteInstruction {
  original: string;
  actionVerb?: string;
  needsOutcome: boolean;
  needsSpecificity: boolean;
  instruction: string;
}

export interface ApplicationPackageBrief {
  alignment: JobAlignment;
  positioning: ReturnType<typeof positioningInstructions>;
  resume: ResumeOptimizationPlan;
  bulletInstructions: BulletRewriteInstruction[];
  coverLetter: {
    opening: string;
    evidenceToUse: Array<{ skill:string; claim:string }>;
    companyNeeds: string[];
    rules: string[];
  };
  outreach: {
    message: string;
    channel: 'linkedin-or-email';
    maxWords: number;
    followUpDays: number[];
  };
}

export interface ApplicationStrategyInput {
  weeklyAvailabilityHours: number;
  opportunities: Opportunity[];
  priorApplications?: number;
  priorRecruiterScreens?: number;
  priorInterviews?: number;
  priorOffers?: number;
}

export interface ApplicationStrategy {
  weeklyHighQualityApplications: number;
  priorityOrder: Array<{ opportunityId:string; company:string; title:string; score:number }>;
  customization: Array<{ tier:'A'|'B'|'C'; rule:string }>;
  followUpDays: number[];
  metrics: string[];
  diagnosticRules: string[];
}

export interface HiddenRoleCandidate {
  title: string;
  score: number;
  reasons: string[];
}

const words = (value: string) => new Set(normalize(value).split(/\s+/).filter(Boolean));
const overlap = (a: string, b: string) => {
  const left = words(a);
  const right = words(b);
  if (!right.size) return 0;
  let hits = 0;
  for (const token of right) if (left.has(token)) hits++;
  return hits / right.size;
};
const first = <T>(items: T[], count: number) => items.slice(0, Math.max(0, count));
const supportedEvidence = (evidence: Evidence[], requirement: string) => evidence
  .filter(e => overlap(`${e.skill} ${e.claim}`, requirement) >= 0.25)
  .sort((a,b)=>b.strength-a.strength);

export function alignJobDescription(profile: CandidateProfile, evidence: Evidence[], opportunity: Opportunity): JobAlignment {
  const requirements = unique([...opportunity.job.requirements, ...opportunity.job.preferred]);
  const matchedRequirements: string[] = [];
  const underemphasizedRequirements: string[] = [];
  const unsupportedRequirements: string[] = [];
  const positionedRequirements = requirements.map(requirement => positionCapability({ profile, evidence, requirement }));

  requirements.forEach((requirement,index) => {
    const positioned = positionedRequirements[index];
    if (positioned.confidence === 'verified' || positioned.confidence === 'supported') matchedRequirements.push(requirement);
    else if (positioned.confidence === 'evidence-limited') underemphasizedRequirements.push(requirement);
    else unsupportedRequirements.push(requirement);
  });

  const denominator = Math.max(1, requirements.length);
  const fitScore = Math.round(((matchedRequirements.length + underemphasizedRequirements.length * 0.5) / denominator) * 100);
  return {
    opportunityId: opportunity.id,
    matchedRequirements,
    underemphasizedRequirements,
    unsupportedRequirements,
    truthfulKeywords: unique([...matchedRequirements, ...underemphasizedRequirements]),
    positionedRequirements,
    fitScore,
    rule:'Frame the candidate as the strongest credible fit. Use the most favorable defensible wording, including transferable or adjacent framing when direct evidence is limited, but never convert weak evidence into false facts about experience, scope, ownership, metrics, credentials or tools.'
  };
}

export function optimizeResumeForInterview(profile: CandidateProfile, evidence: Evidence[], alignment?: JobAlignment): ResumeOptimizationPlan {
  const emphasizedSkills = unique([
    ...(alignment?.truthfulKeywords ?? []),
    ...profile.skills,
    ...[...evidence].sort((a,b)=>b.strength-a.strength).map(e=>e.skill)
  ]).slice(0, 24);
  const strongest = [...evidence].sort((a,b)=>b.strength-a.strength).slice(0, 8);
  return {
    headline: profile.constraints.preferredTitles[0]
      ? `${profile.constraints.preferredTitles[0]} | ${first(emphasizedSkills,3).join(' • ')}`
      : profile.headline,
    emphasizedSkills,
    evidenceClaims: strongest.map(e=>({ skill:e.skill, claim:e.claim, repository:e.repository, url:e.url })),
    atsRules:['use conventional section headings','keep important keywords in plain text','avoid decorative elements that hide content from parsers','make dates, employers, titles and skills explicit','optimize readability for both recruiters and ATS'],
    rewriteRules:[
      'lead bullets with the strongest truthful action verbs',
      'state the work specifically and foreground the parts most relevant to the target role',
      'emphasize outcomes when supported and use qualitative impact when quantitative proof is unavailable',
      'translate project language into employer language without changing the underlying fact',
      'use transferable or adjacent framing when evidence is real but direct proof is limited',
      'prefer the strongest defensible interpretation over neutral or self-minimizing wording',
      'keep bullets concise and scannable',
      'never manufacture numbers, employers, titles, credentials, tools, ownership, production scale or achievements'
    ]
  };
}

export function analyzeResumeBullets(bullets: string[]): BulletRewriteInstruction[] {
  const weakPrefixes = ['responsible for','worked on','helped','assisted','tasked with'];
  return bullets.map(original => {
    const normalized = normalize(original);
    const weak = weakPrefixes.find(prefix => normalized.startsWith(prefix));
    const hasOutcomeSignal = /\b(increased|reduced|improved|saved|grew|delivered|launched|built|deployed|automated|cut|accelerated|enabled|prevented)\b/i.test(original);
    const needsSpecificity = original.trim().split(/\s+/).length < 7 || /\b(various|things|stuff|duties|tasks)\b/i.test(original);
    return {
      original,
      actionVerb: weak ? 'replace weak opening with the strongest defensible active verb supported by the underlying work' : undefined,
      needsOutcome: !hasOutcomeSignal,
      needsSpecificity,
      instruction:'Rewrite for action + scope + technology/context + strongest supportable impact. Favor confident positioning and qualitative impact when evidence is limited. Do not invent a metric, responsibility, tool, title, employer, credential, ownership claim or completed outcome.'
    };
  });
}

export function buildApplicationPackage(profile: CandidateProfile, evidence: Evidence[], opportunity: Opportunity, resumeBullets: string[] = []): ApplicationPackageBrief {
  const alignment = alignJobDescription(profile, evidence, opportunity);
  const positioning = positioningInstructions();
  const resume = optimizeResumeForInterview(profile, evidence, alignment);
  const relevantEvidence = evidence
    .filter(e => alignment.matchedRequirements.some(r => supportedEvidence([e], r).length > 0))
    .sort((a,b)=>b.strength-a.strength)
    .slice(0, 3);
  const strongest = relevantEvidence[0] ?? [...evidence].sort((a,b)=>b.strength-a.strength)[0];
  const adjacent = alignment.positionedRequirements.find(item=>item.confidence==='evidence-limited');
  const reason = strongest
    ? `${strongest.claim}`
    : adjacent?.permitted
      ? `${adjacent.text}`
      : `${profile.headline} with relevant experience for ${opportunity.job.title}`;
  let message = `Hi — I’m interested in the ${opportunity.job.title} role at ${opportunity.job.company}. ${reason} I’d value a quick sense of what the team considers most important for someone to succeed in this role.`;
  const messageWords = message.split(/\s+/);
  if (messageWords.length > 100) message = `${messageWords.slice(0,99).join(' ')}…`;

  return {
    alignment,
    positioning,
    resume,
    bulletInstructions: analyzeResumeBullets(resumeBullets),
    coverLetter: {
      opening:`Position the candidate as the strongest credible answer to ${opportunity.job.company}'s need for ${opportunity.job.title}, leading with the most relevant supported capability.`,
      evidenceToUse: relevantEvidence.map(e=>({ skill:e.skill, claim:e.claim })),
      companyNeeds:first(opportunity.job.requirements, 5),
      rules:[
        'be short, natural, specific and confident',
        'frame the candidate as a high-value solution to the employer need rather than neutrally summarizing the resume',
        'connect the strongest evidence directly to employer needs',
        'when direct evidence is thin, use truthful transferable, adjacent, familiarity or exposure framing instead of discarding the match',
        'prefer favorable defensible interpretation and omit irrelevant weaknesses',
        'never invent material facts such as achievements, metrics, employers, titles, credentials, tools, ownership or experience that did not occur'
      ]
    },
    outreach:{ message, channel:'linkedin-or-email', maxWords:100, followUpDays:[5,12] }
  };
}

export function discoverHiddenRoles(profile: CandidateProfile, evidence: Evidence[], roleCatalog: string[], limit = 10): HiddenRoleCandidate[] {
  const source = `${profile.headline} ${profile.skills.join(' ')} ${evidence.map(e=>`${e.skill} ${e.claim}`).join(' ')}`;
  return roleCatalog.map(title => {
    const lexical = overlap(source, title);
    const evidenceHits = evidence.filter(e=>overlap(`${e.skill} ${e.claim}`, title) > 0).length;
    const preferred = profile.constraints.preferredTitles.some(t=>overlap(t,title)>=0.5);
    const score = Math.min(100, Math.round(lexical*55 + Math.min(30,evidenceHits*10) + (preferred?15:0)));
    const reasons = [
      lexical > 0 && 'title overlaps demonstrated or claimed capabilities',
      evidenceHits > 0 && `${evidenceHits} evidence record(s) are relevant`,
      preferred && 'adjacent to an explicitly preferred title'
    ].filter(Boolean) as string[];
    return { title, score, reasons };
  }).filter(r=>r.score>0).sort((a,b)=>b.score-a.score || a.title.localeCompare(b.title)).slice(0,limit);
}

export function buildApplicationStrategy(input: ApplicationStrategyInput): ApplicationStrategy {
  const hours = Math.max(1, input.weeklyAvailabilityHours);
  const capacity = Math.max(3, Math.min(25, Math.floor(hours / 1.5)));
  const ranked = input.opportunities.filter(o=>!o.hardRejected).sort((a,b)=>b.score.total-a.score.total);
  const weeklyHighQualityApplications = Math.min(capacity, Math.max(3, ranked.filter(o=>o.score.total>=65).length || capacity));
  const applications = input.priorApplications ?? 0;
  const screens = input.priorRecruiterScreens ?? 0;
  const interviews = input.priorInterviews ?? 0;
  const offers = input.priorOffers ?? 0;
  const screenRate = applications ? screens/applications : 0;
  const interviewRate = screens ? interviews/screens : 0;
  const offerRate = interviews ? offers/interviews : 0;
  const diagnostics = [
    applications >= 10 && screenRate < 0.10 ? 'low application-to-screen conversion: tighten targeting, strengthen candidate positioning, resume alignment and warm-path outreach before increasing volume' : '',
    screens >= 5 && interviewRate < 0.35 ? 'screens are not converting: improve career story, role motivation, evidence selection, strongest-credible framing and recruiter-stage practice' : '',
    interviews >= 4 && offerRate < 0.20 ? 'interviews are not converting: inspect technical/behavioral failure patterns and role readiness before sending more applications' : '',
    'prefer fewer high-quality applications with strong credible positioning and tracked outcomes over indiscriminate volume'
  ].filter(Boolean);
  return {
    weeklyHighQualityApplications,
    priorityOrder:ranked.slice(0,weeklyHighQualityApplications).map(o=>({ opportunityId:o.id, company:o.job.company, title:o.job.title, score:o.score.total })),
    customization:[
      { tier:'A', rule:'Top opportunities: deeply tailor resume emphasis, evidence packet, strongest-credible positioning, cover letter/context, recruiter or hiring-manager outreach, and interview preparation.' },
      { tier:'B', rule:'Strong opportunities: tailor resume keywords/evidence and positioning plus outreach; use concise application context where valuable.' },
      { tier:'C', rule:'Marginal opportunities: do not spend heavy customization time; pursue only when strategically justified.' }
    ],
    followUpDays:[5,12],
    metrics:['applications sent','application-to-screen rate','screen-to-interview rate','interview-to-offer rate','response rate by source','response rate by resume version','response rate by positioning variant','response rate by outreach path','time to first response','time in each pipeline stage','rejection reason','skills repeatedly missing','offer quality','candidate satisfaction after hire'],
    diagnosticRules:diagnostics
  };
}

export function buildJobAcquisitionLoop(input: {
  profile: CandidateProfile;
  evidence: Evidence[];
  opportunities: Opportunity[];
  weeklyAvailabilityHours: number;
  roleCatalog?: string[];
  resumeBullets?: string[];
  priorApplications?: number;
  priorRecruiterScreens?: number;
  priorInterviews?: number;
  priorOffers?: number;
}) {
  const strategy = buildApplicationStrategy(input);
  const packages = strategy.priorityOrder.map(item => {
    const opportunity = input.opportunities.find(o=>o.id===item.opportunityId)!;
    return buildApplicationPackage(input.profile,input.evidence,opportunity,input.resumeBullets);
  });
  return {
    objective:'turn candidate evidence into the strongest credible positioning for selective opportunities, application materials, warm human paths, interviews, offers, and outcome learning',
    positioning:positioningInstructions(),
    hiddenRoles:discoverHiddenRoles(input.profile,input.evidence,input.roleCatalog ?? []),
    strategy,
    packages,
    feedbackLoop:['record every application artifact/version and source','record positioning variant and evidence strength','record outreach and follow-up timing','record recruiter, interview, rejection and offer outcomes','attribute conversion changes to targeting, evidence, positioning, resume, outreach and interview changes where possible','update role priorities and development gaps from observed outcomes'],
    truthGate:'Generated application artifacts should maximize favorable defensible framing. Evidence-limited adjacent inferences are allowed when expressed as such, but no artifact may invent a material fact or turn weak evidence into a false assertion about experience, scope, ownership, metrics, credentials, employers, titles or tools.'
  };
}
