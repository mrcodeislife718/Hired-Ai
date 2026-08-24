import type { HiredEngine } from './engine.js';
import { ConversationStore } from './conversations.js';
import { MayaLanguageModel } from './maya-language.js';

export interface MayaRequest {
  message?: string;
  opportunityId?: string;
  resumeText?: string;
  socialPlatforms?: string[];
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
    message: 'I’m Maya. Tell me what you want from your career, what is frustrating you, or what you want me to work on today.',
    actions: ['Find roles I can realistically win', 'Audit my career positioning', 'Help me build my network', 'Prepare me for interviews']
  };

  if (/network|linkedin|github|social|connections|people|recruiter|hiring manager|relationship/.test(lower)) {
    const plan = engine.networkPlan(socials);
    return {
      message: 'I built a network and professional-presence plan from your evidence and opportunity set. I’ll prioritize useful relationships and credible positioning instead of indiscriminate outreach.',
      type: 'network',
      plan,
      actions: ['Show my strongest jobs', 'What should I improve on GitHub?', 'Who should I connect with first?']
    };
  }

  if (/resume|cv|positioning|outdated|career audit|profile/.test(lower)) return {
    message: 'Attach or paste your current resume and I’ll compare it with your verified work, current skills, career direction, and strongest opportunities. I’ll tell you what is stale, missing, or underselling you.',
    type: 'resume-request',
    actions: ['Find my strongest jobs', 'Review my professional presence']
  };

  if (/interview|mock|technical|behavioral|prepare|prep/.test(lower)) {
    const opportunity = findOpportunity(engine, message, input.opportunityId);
    if (!opportunity) return { message: 'Choose a role or ask me to find strong opportunities first.' };
    const pkg = engine.package(opportunity.id);
    return {
      message: `I prepared you for ${opportunity.job.title} at ${opportunity.job.company} using the actual requirements, your verified strengths, and the gaps you need to handle truthfully.`,
      type: 'interview',
      opportunity,
      readiness: pkg.readiness,
      interview: pkg.interview,
      actions: ['Explain my weak spots', 'Prepare my application', 'Find a human path']
    };
  }

  if (/apply|application|tailor|cover letter/.test(lower)) {
    const opportunity = findOpportunity(engine, message, input.opportunityId);
    if (!opportunity) return { message: 'Choose an opportunity first.' };
    const pkg = engine.package(opportunity.id);
    if (!pkg.readiness.canOccupyRole) return {
      message: `I do not recommend applying yet. Your readiness for this role is ${pkg.readiness.readinessScore}/100. I would rather help you close the blocking gaps than waste your time with a weak application.`,
      type: 'develop-first',
      opportunity,
      readiness: pkg.readiness,
      actions: ['Show me how to close the gaps', 'Find a role I can pursue now']
    };
    return {
      message: `You are sufficiently ready for ${opportunity.job.title} at ${opportunity.job.company}. I prepared a truthful, evidence-grounded package. Submission remains approval-gated.`,
      type: 'application',
      opportunity,
      readiness: pkg.readiness,
      package: { resume: pkg.resume, application: pkg.application, outreach: pkg.outreach },
      actions: ['Request application approval', 'Prepare me for interview', 'Find a human path']
    };
  }

  if (/status|today|next|pipeline|attention|follow.?up/.test(lower)) {
    const status = engine.careerStatus();
    return {
      message: `Right now, ${status.priority.length} opportunity${status.priority.length === 1 ? '' : 'ies'} are strong enough to pursue, ${status.developmentCandidates.length} are better treated as development targets, and ${status.pendingApprovals.length} action${status.pendingApprovals.length === 1 ? '' : 's'} await approval.`,
      type: 'status',
      status,
      actions: ['Show my best opportunity', 'Audit my resume', 'Build my network plan']
    };
  }

  if (/find|job|role|opportunit|work|career move|better position/.test(lower)) {
    const decisions = ranked(engine).slice(0, 8);
    const pursue = decisions.filter(item => item.decision === 'pursue');
    const develop = decisions.filter(item => item.decision === 'develop-first');
    return {
      message: `I found ${pursue.length} role${pursue.length === 1 ? '' : 's'} I would pursue now and ${develop.length} promising role${develop.length === 1 ? '' : 's'} I would treat as development targets. I ranked them by fit, evidence, readiness, compensation, career upside, freshness, and interview probability—not application volume.`,
      type: 'opportunities',
      opportunities: decisions,
      actions: ['Explain my top match', 'Audit my resume against these jobs', 'Find useful people around these companies']
    };
  }

  if (/why|gap|weak|reject|qualified|fit|evidence|ready/.test(lower)) {
    const opportunity = findOpportunity(engine, message, input.opportunityId);
    if (!opportunity) return { message: 'Ask me to find opportunities first, then I can explain exactly where you stand.' };
    const readiness = engine.assessReadiness(opportunity.id);
    return {
      message: `${opportunity.job.title} at ${opportunity.job.company} is scored ${opportunity.score.total}/100 with role readiness ${readiness.readinessScore}/100. ${readiness.canOccupyRole ? 'I consider it selectively pursuable.' : 'I would not pursue it yet without resolving or manually reviewing the blocking gaps.'}`,
      type: 'fit',
      opportunity,
      readiness,
      actions: ['Prepare application', 'Prepare me for interview', 'Show a development plan']
    };
  }

  return {
    message: 'I can work across your whole career: opportunity discovery, resume modernization, GitHub and social positioning, network growth, selective applications, interview preparation, skill-gap closure, offer strategy, and outcome learning. Tell me the outcome you want and I’ll coordinate the work.',
    actions: ['Find my best roles', 'Audit my resume', 'Build my network', 'What should I do today?']
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
      rendered = await this.language.render({
        userMessage,
        deterministicAnswer: result.message,
        context: { history, result: { ...result, message: undefined } }
      });
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
