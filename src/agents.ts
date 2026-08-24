import type { CandidateProfile, CareerDevelopmentPlan, CareerIntelligence, Evidence, FeedbackEvent, HumanPath, JobIntelligence, OutcomeMetrics, RawJob, RelationshipRecord, SkillGap } from './domain.js';
import { normalize, unique } from './utils.js';

export class ScoutAgent {
  normalize(job: RawJob): RawJob {
    return { ...job, company: job.company.trim(), title: job.title.trim(), requirements: unique(job.requirements.map(x => x.trim()).filter(Boolean)), preferred: unique(job.preferred.map(x => x.trim()).filter(Boolean)) };
  }
}

export class QualificationAgent {
  hardReject(job: RawJob, profile: CandidateProfile): string[] {
    const reasons: string[] = [];
    const text = normalize(`${job.title} ${job.description}`);
    if (!profile.constraints.allowedWorkModes.includes(job.workMode)) reasons.push(`work mode ${job.workMode} is not allowed`);
    if (profile.constraints.excludedTerms.some(term => text.includes(normalize(term)))) reasons.push('job contains an excluded constraint');
    if (job.salaryMax && profile.constraints.minBaseSalary && job.salaryMax < profile.constraints.minBaseSalary) reasons.push('compensation ceiling is below minimum target');
    const locOk = profile.constraints.targetLocations.some(l => normalize(job.location).includes(normalize(l))) || job.workMode === 'remote';
    if (!locOk) reasons.push('location is outside target area');
    return reasons;
  }
}

export class CompanyIntelligenceAgent {
  analyze(job: RawJob): JobIntelligence {
    const text = normalize(`${job.title} ${job.description}`);
    const seniority = text.includes('staff') ? 'staff' : text.includes('senior') ? 'senior' : text.includes('junior') || text.includes('entry') ? 'junior' : text.includes('engineer') ? 'mid' : 'unknown';
    const interview: string[] = [];
    for (const skill of job.requirements) interview.push(`${skill} fundamentals`, `${skill} applied problem solving`);
    if (text.includes('distributed')) interview.push('distributed systems design');
    if (text.includes('ai') || text.includes('agent')) interview.push('LLM/agent reliability and evaluation');
    return { normalizedRequirements: job.requirements.map(normalize), likelyInterviewAreas: unique(interview).slice(0, 12), seniority, teamSignals: [] };
  }
}

export class EvidenceAgent {
  match(job: RawJob, evidence: Evidence[]): { gaps: SkillGap[]; evidenceIds: string[] } {
    const ids = new Set<string>();
    const gaps = job.requirements.map(skill => {
      const key = normalize(skill);
      const direct = evidence.filter(e => normalize(e.skill) === key || normalize(e.claim).includes(key));
      const adjacent = direct.length ? [] : evidence.filter(e => normalize(e.claim).split(' ').some(token => key.includes(token) && token.length > 3));
      const matches = direct.length ? direct : adjacent;
      matches.forEach(e => ids.add(e.id));
      if (direct.length) return { skill, strength: 'strong' as const, evidenceIds: direct.map(e => e.id), explanation: `Verified by ${direct.length} portfolio evidence item(s).` };
      if (adjacent.length) return { skill, strength: 'adjacent' as const, evidenceIds: adjacent.map(e => e.id), explanation: 'Adjacent verified capability exists; do not claim direct production experience.' };
      return { skill, strength: 'missing' as const, evidenceIds: [], explanation: 'No verified portfolio evidence found.' };
    });
    return { gaps, evidenceIds: [...ids] };
  }
}

export class CareerIntelligenceAgent {
  build(profile: CandidateProfile, evidence: Evidence[], recurringGaps: string[] = []): CareerIntelligence {
    const coverage = evidence.reduce<Record<string, number>>((acc, item) => {
      acc[item.skill] = Math.max(acc[item.skill] ?? 0, item.strength);
      return acc;
    }, {});
    return {
      candidateId: profile.id,
      aspirations: profile.constraints.preferredTitles,
      preferences: {
        targetTitles: profile.constraints.preferredTitles,
        targetIndustries: [],
        targetCompensation: profile.constraints.minBaseSalary ? { min: profile.constraints.minBaseSalary, currency: 'USD' } : undefined,
        preferredWorkModes: profile.constraints.allowedWorkModes,
        values: []
      },
      demonstratedSkills: unique(evidence.map(e => e.skill)),
      claimedSkills: unique(profile.skills),
      evidenceCoverage: coverage,
      recurringGaps: unique(recurringGaps),
      updatedAt: new Date().toISOString()
    };
  }
}

export class RecruiterAgent {
  derivePublicPaths(job: RawJob): HumanPath[] {
    return [{ role: 'Hiring team', channel: 'company-site', publicUrl: job.url, confidence: 0.75, source: job.source }];
  }
}

export class RelationshipIntelligenceAgent {
  fromHumanPaths(paths: HumanPath[], company?: string): RelationshipRecord[] {
    return paths.map((path, index) => ({
      id: `rel_${normalize(company ?? 'company').replace(/\s+/g, '_')}_${index}`,
      name: path.name,
      role: path.role,
      company,
      relationshipType: /recruit/i.test(path.role) ? 'recruiter' : /hiring/i.test(path.role) ? 'hiring-manager' : 'other',
      channels: [path.channel],
      publicUrls: path.publicUrl ? [path.publicUrl] : [],
      source: path.source,
      confidence: path.confidence,
      interactionCount: 0
    }));
  }

  prioritize(records: RelationshipRecord[]): RelationshipRecord[] {
    return [...records].sort((a,b) => (b.confidence - a.confidence) || (a.interactionCount - b.interactionCount));
  }
}

export class ResumeAgent {
  build(profile: CandidateProfile, job: RawJob, gaps: SkillGap[], evidence: Evidence[]) {
    const strongSkills = gaps.filter(g => g.strength === 'strong').map(g => g.skill);
    return {
      headline: profile.headline,
      target: `${job.title} at ${job.company}`,
      emphasizedSkills: strongSkills,
      evidence: evidence.map(e => ({ repository: e.repository, url: e.url, claim: e.claim })),
      gapDisclosures: gaps.filter(g => g.strength !== 'strong').map(g => `${g.skill}: ${g.explanation}`)
    };
  }
}

export class OutreachAgent {
  draft(profile: CandidateProfile, job: RawJob, evidence: Evidence[]) {
    const proof = evidence.slice(0, 2).map(e => `${e.repository}: ${e.claim}`).join('; ');
    return `Hi — I’m interested in the ${job.title} role at ${job.company}. My background lines up with the role through verified work including ${proof || 'relevant engineering projects'}. I’d be glad to share the specific implementation evidence and discuss where I can contribute.`;
  }
}

export class ApplicationAgent {
  assemble(job: RawJob, resume: unknown, outreach: string) {
    return { jobUrl: job.url, resume, coverNote: outreach, assertionsPolicy: 'verified-evidence-only', submission: 'requires-explicit-approval' };
  }
}

export class FollowUpAgent {
  schedule(lastContactAt: string, days = 4) { const d = new Date(lastContactAt); d.setUTCDate(d.getUTCDate() + days); return d.toISOString(); }
}

export class InterviewAgent {
  prepare(job: RawJob, intelligence: JobIntelligence, gaps: SkillGap[]) {
    return {
      role: `${job.title} @ ${job.company}`,
      study: intelligence.likelyInterviewAreas,
      gapDrills: gaps.filter(g => g.strength !== 'strong').map(g => ({ skill: g.skill, objective: `Explain truthful current level, adjacent proof, and a concrete ramp plan for ${g.skill}.` })),
      systemDesignPrompt: `Design a reliable system relevant to ${job.company}'s ${job.title} role and defend tradeoffs, bottlenecks, dependencies, and failure points.`
    };
  }
}

export class CareerDevelopmentAgent {
  plan(candidateId: string, gaps: SkillGap[]): CareerDevelopmentPlan {
    const actions = gaps
      .filter(g => g.strength !== 'strong')
      .map((g, index) => ({
        skill: g.skill,
        reason: g.explanation,
        recommendedEvidence: g.strength === 'missing' ? 'project' as const : 'work-sample' as const,
        estimatedImpact: g.strength === 'missing' ? 'high' as const : 'medium' as const,
        priority: index + 1
      }));
    return { candidateId, actions, generatedAt: new Date().toISOString() };
  }
}

export class OutcomeLearningAgent {
  summarize(feedback: FeedbackEvent[]): OutcomeMetrics {
    const counts = feedback.reduce<Record<string, number>>((acc, item) => (acc[item.kind] = (acc[item.kind] ?? 0) + 1, acc), {});
    const applications = new Set(feedback.map(f => f.opportunityId)).size;
    const recruiterScreens = counts.RECRUITER_SCREEN ?? 0;
    const technicalInterviews = counts.TECHNICAL_PASS ?? 0;
    const onsites = counts.ONSITE ?? 0;
    const offers = counts.OFFER ?? 0;
    const rate = (num:number, den:number) => den ? num / den : 0;
    return {
      applications,
      recruiterScreens,
      technicalInterviews,
      onsites,
      offers,
      noResponses: counts.NO_RESPONSE ?? 0,
      rejections: counts.REJECTED ?? 0,
      applicationToScreenRate: rate(recruiterScreens, applications),
      screenToTechnicalRate: rate(technicalInterviews, recruiterScreens),
      technicalToOnsiteRate: rate(onsites, technicalInterviews),
      onsiteToOfferRate: rate(offers, onsites)
    };
  }
}

export class CareerStrategist {
  private readonly outcomeLearning = new OutcomeLearningAgent();
  analyze(feedback: FeedbackEvent[]) {
    const metrics = this.outcomeLearning.summarize(feedback);
    return {
      counts: {
        NO_RESPONSE: metrics.noResponses,
        REJECTED: metrics.rejections,
        RECRUITER_SCREEN: metrics.recruiterScreens,
        TECHNICAL_PASS: metrics.technicalInterviews,
        ONSITE: metrics.onsites,
        OFFER: metrics.offers
      },
      metrics,
      objective: 'maximize durable career outcomes, qualified interviews, offers, compensation, and relationship value—not application volume',
      signal: metrics.offers ? 'offer-conversion-observed' : metrics.recruiterScreens ? 'screen-conversion-observed' : 'collect-more-outcome-data'
    };
  }
}
