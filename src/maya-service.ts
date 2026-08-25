import type { HiredEngine } from './engine.js';
import { ConversationStore } from './conversations.js';
import { MayaLanguageModel } from './maya-language.js';
import {
  auditGithubForCareer,
  buildInterviewPractice,
  buildNetworkingPlan,
  buildSocialCareerPlan,
  compareAndNegotiateOffers,
  surfaceCoverage,
  type GithubCareerAuditInput,
  type OfferInput
} from './career-surfaces.js';

export interface MayaRequest {
  message?: string;
  opportunityId?: string;
  resumeText?: string;
  socialPlatforms?: string[];
  offers?: OfferInput[];
  targetBase?: number;
  githubAudit?: GithubCareerAuditInput;
}

export interface MayaResponse extends Record<string, unknown> {
  message: string;
  actions?: string[];
}

function ranked(engine: HiredEngine) {
  return engine.selectiveOpportunities(60)
    .map(decision => ({ ...decision, opportunity: engine.store.opportunities.get(decision.opportunityId) }))
    .filter(item => Boolean(item.opportunity))
    .sort((a, b) => b.opportunityScore - a.opportunityScore);
}

function findOpportunity(engine: HiredEngine, message: string, explicitId?: string) {
  if (explicitId) {
    const found = engine.store.opportunities.get(explicitId);
    if (found) return found;
  }
  const lower = message.toLowerCase();
  const items = [...engine.store.opportunities.values()];
  return items.find(item => lower.includes(item.job.company.toLowerCase()) || lower.includes(item.job.title.toLowerCase())) ?? ranked(engine)[0]?.opportunity;
}

export function deterministicMayaReply(engine: HiredEngine, input: MayaRequest): MayaResponse {
  const message = String(input.message ?? '').trim();
  const lower = message.toLowerCase();
  const socials = input.socialPlatforms?.length ? input.socialPlatforms : ['linkedin'];

  if (input.resumeText) {
    const plan = engine.auditCareer(input.resumeText.slice(0, 200_000), socials);
    return {
      message: plan.resume.parsed.likelyOutdated
        ? 'Your resume is behind your current career evidence. I compared it with your verified work, professional presence, and current opportunities and built a modernization plan.'
        : 'Your resume appears reasonably current. I still compared it with your verified evidence and strongest opportunities so we can strengthen anything that is underselling you.',
      type: 'career-audit',
      plan,
      actions: ['Show my best opportunities', 'Improve my professional presence', 'What should I fix first?']
    };
  }

  if (!message) return {
    message: 'I’m Maya. I can work across your full career: jobs, resumes, GitHub, professional presence, networking, interviews, negotiation, career development, employer research, and long-term outcomes. Tell me what you want to improve.',
    type: 'welcome',
    coverage: surfaceCoverage(),
    actions: ['Find roles I can realistically win', 'Audit my GitHub', 'Help me build my network', 'Practice an interview', 'Help me negotiate an offer']
  };

  if (/what can you do|capabilit|everything you can|career surfaces|well.?rounded/.test(lower)) {
    return {
      message: 'I cover the full career lifecycle for job seekers and the hiring lifecycle for employers. The goal is not more activity; it is better, explainable, durable career and hiring outcomes.',
      type: 'capabilities',
      coverage: surfaceCoverage(),
      actions: ['Audit my GitHub', 'Build my network', 'Practice an interview', 'Compare my offers', 'Find better roles']
    };
  }

  if (/github|repo|repository|portfolio.*code|code portfolio/.test(lower)) {
    const presence = engine.careerPresenceProfile(socials);
    const audit = input.githubAudit ? auditGithubForCareer(input.githubAudit) : undefined;
    return {
      message: audit
        ? 'I audited your GitHub as a career asset. I ranked repositories by how quickly they prove capability to a recruiter or hiring manager and identified presentation gaps that can hide strong engineering work.'
        : 'I can turn GitHub into a recruiter-readable evidence surface: strongest repositories first, clear READMEs, working proof, tests/CI, demos, screenshots where useful, and truthful production status. Index or provide repository metadata for a deeper audit.',
      type: 'github-career',
      presence,
      audit,
      actions: ['Which repos should I feature?', 'Help organize my GitHub', 'Improve my professional social presence', 'Find roles that value this work']
    };
  }

  if (/network|linkedin|social|connections|people|recruiter|hiring manager|relationship|warm intro|community/.test(lower)) {
    const basePlan = engine.networkPlan(socials);
    const targetCompanies = [...engine.store.opportunities.values()].filter(o => !o.hardRejected).sort((a,b)=>b.score.total-a.score.total).slice(0,8).map(o=>o.job.company);
    return {
      message: 'I built a professional-presence and networking plan around relevant people and evidence. I optimize for useful relationships and warm career paths, not connection count or spam.',
      type: 'network',
      plan: basePlan,
      networking: buildNetworkingPlan({ targetCompanies }),
      social: buildSocialCareerPlan(socials, engine.profile.constraints.preferredTitles, [...engine.store.evidence.values()]),
      actions: ['What should I improve on LinkedIn?', 'Who should I connect with first?', 'What should I post?', 'Show my strongest jobs']
    };
  }

  if (/resume|cv|positioning|outdated|career audit|profile/.test(lower)) return {
    message: 'Attach or paste your current resume and I’ll compare it with your verified work, current skills, career direction, and strongest opportunities. I’ll tell you what is stale, missing, unsupported, or underselling you.',
    type: 'resume-request',
    actions: ['Find my strongest jobs', 'Review my professional presence', 'Audit my GitHub']
  };

  if (/negotia|counter.?offer|offer package|compare.*offer|compensation package|salary offer/.test(lower)) {
    if (input.offers?.length) {
      const strategy = compareAndNegotiateOffers(input.offers, input.targetBase);
      return {
        message: 'I compared the offers across annual cash and estimated total compensation, and built a negotiation checklist. I will never invent competing offers, deadlines, market data, or leverage.',
        type: 'offer-negotiation',
        strategy,
        actions: ['Which terms should I negotiate first?', 'Help me draft the negotiation conversation', 'Compare fulfillment and career upside too']
      };
    }
    return {
      message: 'Give me the offer details—base, bonus, equity, sign-on, benefits, work arrangement, title, and anything else that matters. I’ll compare the economics and career tradeoffs, identify what to negotiate, and help you ask without bluffing.',
      type: 'offer-negotiation-request',
      actions: ['Compare two offers', 'Help me set a target salary', 'Prepare my negotiation script']
    };
  }

  if (/interview|mock|technical|behavioral|prepare|prep/.test(lower)) {
    const opportunity = findOpportunity(engine, message, input.opportunityId);
    if (!opportunity) return { message: 'Choose a role or ask me to find strong opportunities first.' };
    const pkg = engine.package(opportunity.id);
    return {
      message: `I prepared you for ${opportunity.job.title} at ${opportunity.job.company} using the actual requirements, your verified strengths, the gaps you need to handle truthfully, and questions you should use to evaluate the employer too.`,
      type: 'interview',
      opportunity,
      readiness: pkg.readiness,
      interview: pkg.interview,
      practice: buildInterviewPractice(opportunity),
      actions: ['Start a recruiter-screen practice', 'Start a technical practice', 'Explain my weak spots', 'What should I ask the employer?']
    };
  }

  if (/company|employer|salary|pay|culture|review|research/.test(lower)) {
    const opportunity = findOpportunity(engine, message, input.opportunityId);
    if (!opportunity) return { message: 'Choose a company or opportunity first and I’ll organize the available job, compensation, source reliability, role requirements, and unknowns.' };
    const pkg = engine.package(opportunity.id);
    return {
      message: `Here is what I can currently establish about ${opportunity.job.company} from the opportunity evidence. I will keep unknowns visible rather than filling them with guesses.`,
      type: 'company-research',
      company: opportunity.job.company,
      job: opportunity.job,
      intelligence: opportunity.intelligence,
      reliability: pkg.reliability,
      unknowns: pkg.reliability.unknowns,
      actions: ['Is this role worth pursuing?', 'What should I verify before applying?', 'Prepare me to interview them too']
    };
  }

  if (/apply|application|tailor|cover letter/.test(lower)) {
    const opportunity = findOpportunity(engine, message, input.opportunityId);
    if (!opportunity) return { message: 'Choose an opportunity first.' };
    const pkg = engine.package(opportunity.id);
    if (!pkg.readiness.canOccupyRole) return {
      message: `I do not recommend applying yet. Your readiness for this role is ${pkg.readiness.readinessScore}/100. I would rather help you close the blocking gaps than waste your time with a weak application.`,
      type: 'develop-first', opportunity, readiness: pkg.readiness,
      actions: ['Show me how to close the gaps', 'Find a role I can pursue now']
    };
    return {
      message: `You are sufficiently ready for ${opportunity.job.title} at ${opportunity.job.company}. I prepared a truthful, evidence-grounded package. Submission remains approval-gated.`,
      type: 'application', opportunity, readiness: pkg.readiness,
      package: { resume: pkg.resume, application: pkg.application, outreach: pkg.outreach },
      actions: ['Request application approval', 'Prepare me for interview', 'Find a human path']
    };
  }

  if (/status|today|next|pipeline|attention|follow.?up|my jobs|saved/.test(lower)) {
    const status = engine.careerStatus();
    return {
      message: `Right now, ${status.priority.length} opportunity${status.priority.length === 1 ? '' : 'ies'} are strong enough to pursue, ${status.developmentCandidates.length} are better treated as development targets, and ${status.pendingApprovals.length} action${status.pendingApprovals.length === 1 ? '' : 's'} await approval.`,
      type: 'status', status,
      actions: ['Show my best opportunity', 'Audit my resume', 'Build my network plan', 'Prepare for my next interview']
    };
  }

  if (/find|job|role|opportunit|work|career move|better position|job alert/.test(lower)) {
    const decisions = ranked(engine).slice(0, 8);
    const pursue = decisions.filter(item => item.decision === 'pursue');
    const develop = decisions.filter(item => item.decision === 'develop-first');
    return {
      message: `I found ${pursue.length} role${pursue.length === 1 ? '' : 's'} I would pursue now and ${develop.length} promising role${develop.length === 1 ? '' : 's'} I would treat as development targets. I ranked them by fit, evidence, readiness, compensation, career upside, freshness, and interview probability—not application volume.`,
      type: 'opportunities', opportunities: decisions,
      actions: ['Explain my top match', 'Audit my resume against these jobs', 'Find useful people around these companies']
    };
  }

  if (/why|gap|weak|reject|qualified|fit|evidence|ready/.test(lower)) {
    const opportunity = findOpportunity(engine, message, input.opportunityId);
    if (!opportunity) return { message: 'Ask me to find opportunities first, then I can explain exactly where you stand.' };
    const readiness = engine.assessReadiness(opportunity.id);
    return {
      message: `${opportunity.job.title} at ${opportunity.job.company} is scored ${opportunity.score.total}/100 with role readiness ${readiness.readinessScore}/100. ${readiness.canOccupyRole ? 'I consider it selectively pursuable.' : 'I would not pursue it yet without resolving or manually reviewing the blocking gaps.'}`,
      type: 'fit', opportunity, readiness,
      actions: ['Prepare application', 'Prepare me for interview', 'Show a development plan']
    };
  }

  return {
    message: 'I can coordinate the whole career system: opportunity discovery, job tracking, resumes and cover letters, GitHub organization, professional social positioning, networking, company/pay research, selective applications, interview practice, negotiation, career development, employer evaluation, and post-hire outcome learning. Tell me the outcome you want.',
    type: 'career-router',
    coverage: surfaceCoverage(),
    actions: ['Find my best roles', 'Audit my GitHub', 'Audit my resume', 'Build my network', 'Practice an interview', 'Help me negotiate']
  };
}

export class MayaService {
  constructor(
    private readonly conversations = new ConversationStore(),
    private readonly language = new MayaLanguageModel()
  ) {}

  async respond(accountId: string, engine: HiredEngine, input: MayaRequest): Promise<MayaResponse> {
    const userMessage = String(input.message ?? '').trim() || (input.resumeText ? 'Please review the resume I attached.' : '');
    if (userMessage) await this.conversations.append(accountId, 'user', userMessage, { opportunityId: input.opportunityId });
    const result = deterministicMayaReply(engine, input);
    const history = await this.conversations.recent(accountId, 12);
    let rendered = result.message;
    try {
      rendered = await this.language.render({ userMessage, deterministicAnswer: result.message, context: { history, result: { ...result, message: undefined } } });
    } catch {
      rendered = result.message;
    }
    await this.conversations.append(accountId, 'assistant', rendered, { type: result.type });
    return { ...result, message: rendered, languageModel: this.language.configured ? 'configured' : 'deterministic-fallback' };
  }

  history(accountId: string, limit = 40) { return this.conversations.recent(accountId, limit); }
  clearHistory(accountId: string) { return this.conversations.clear(accountId); }
  close() { return this.conversations.close(); }
}
