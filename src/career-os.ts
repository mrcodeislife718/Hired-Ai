import type { CandidateProfile, CareerPresenceProfile, Evidence, Opportunity, RelationshipRecord, RoleReadinessAssessment, SkillGap } from './domain.js';
import { CareerPresenceAgent, CareerDevelopmentAgent, RelationshipIntelligenceAgent, RoleReadinessAgent } from './agents.js';
import { parseResumeText, planResumeModernization, type ResumeModernizationPlan, type ResumeProfile } from './resume-ingestion.js';
import { normalize, unique } from './utils.js';

export type PursuitDecision = 'pursue' | 'develop-first' | 'skip';

export interface OpportunityDecision {
  opportunityId: string;
  company: string;
  title: string;
  decision: PursuitDecision;
  opportunityScore: number;
  readiness: RoleReadinessAssessment;
  reasons: string[];
}

export interface ResumeCareerAudit {
  parsed: ResumeProfile;
  modernization: ResumeModernizationPlan;
  verifiedSkillsMissingFromResume: string[];
  currentSkillsMissingFromResume: string[];
  targetRoleKeywords: string[];
  recommendedHeadline: string;
  masterRecordActions: string[];
}

export interface NetworkAction {
  kind: 'github' | 'social-positioning' | 'relationship' | 'community' | 'follow-up';
  priority: number;
  reason: string;
  action: string;
  company?: string;
  person?: string;
}

export interface CareerOperatingPlan {
  resume: ResumeCareerAudit;
  presence: CareerPresenceProfile;
  opportunities: OpportunityDecision[];
  network: NetworkAction[];
  development: ReturnType<CareerDevelopmentAgent['plan']>;
  nextActions: string[];
}

const clean = (values: string[]) => unique(values.map(v => v.trim()).filter(Boolean));

export class CareerOperatingSystem {
  private readonly readiness = new RoleReadinessAgent();
  private readonly presence = new CareerPresenceAgent();
  private readonly relationships = new RelationshipIntelligenceAgent();
  private readonly development = new CareerDevelopmentAgent();

  constructor(private readonly profile: CandidateProfile, private readonly evidence: Evidence[]) {}

  auditResume(rawText: string, opportunities: Opportunity[] = []): ResumeCareerAudit {
    const parsed = parseResumeText(rawText);
    const verifiedSkills = clean(this.evidence.map(e => e.skill));
    const currentSkills = clean(this.profile.skills);
    const modernization = planResumeModernization(parsed, currentSkills, verifiedSkills);
    const resumeSkills = new Set(parsed.skills.map(normalize));
    const verifiedSkillsMissingFromResume = verifiedSkills.filter(s => !resumeSkills.has(normalize(s)));
    const currentSkillsMissingFromResume = currentSkills.filter(s => !resumeSkills.has(normalize(s)));
    const targetRoleKeywords = clean(opportunities
      .filter(o => !o.hardRejected)
      .sort((a,b) => b.score.total - a.score.total)
      .slice(0, 10)
      .flatMap(o => [o.job.title, ...o.job.requirements]));
    const strongestEvidence = [...this.evidence].sort((a,b) => b.strength - a.strength).slice(0, 5);
    const recommendedHeadline = this.profile.constraints.preferredTitles[0]
      ? `${this.profile.constraints.preferredTitles[0]} | ${strongestEvidence.slice(0,3).map(e => e.skill).join(' • ') || this.profile.headline}`
      : this.profile.headline;
    return {
      parsed,
      modernization,
      verifiedSkillsMissingFromResume,
      currentSkillsMissingFromResume,
      targetRoleKeywords,
      recommendedHeadline,
      masterRecordActions: [
        'preserve a canonical career record separate from any one resume',
        'attach every material claim to experience, portfolio, credential, or other support',
        'record dates, scope, technologies, responsibilities, outcomes, and evidence URLs for current work',
        'regenerate targeted resumes from the master record instead of repeatedly editing one stale document'
      ]
    };
  }

  decideOpportunity(opportunity: Opportunity, minimumOpportunityScore = 70): OpportunityDecision {
    const readiness = this.readiness.assess(opportunity.id, opportunity.gaps);
    const reasons = [...readiness.rationale];
    let decision: PursuitDecision;
    if (opportunity.hardRejected || opportunity.score.total < Math.max(45, minimumOpportunityScore - 20)) {
      decision = 'skip';
      if (opportunity.hardRejected) reasons.push(...opportunity.rejectionReasons);
      if (opportunity.score.total < minimumOpportunityScore) reasons.push('opportunity value is below the normal pursuit threshold');
    } else if (readiness.canOccupyRole && opportunity.score.total >= minimumOpportunityScore) {
      decision = 'pursue';
      reasons.push('evidence and opportunity value support selective pursuit now');
    } else {
      decision = 'develop-first';
      reasons.push('the opportunity is relevant, but the readiness gate recommends closing or manually validating gaps before applying');
    }
    return {
      opportunityId: opportunity.id,
      company: opportunity.job.company,
      title: opportunity.job.title,
      decision,
      opportunityScore: opportunity.score.total,
      readiness,
      reasons: clean(reasons)
    };
  }

  selectOpportunities(opportunities: Opportunity[], minimumOpportunityScore = 70): OpportunityDecision[] {
    const rank: Record<PursuitDecision, number> = { pursue: 0, 'develop-first': 1, skip: 2 };
    return opportunities
      .map(o => this.decideOpportunity(o, minimumOpportunityScore))
      .sort((a,b) => rank[a.decision] - rank[b.decision] || b.opportunityScore - a.opportunityScore || b.readiness.readinessScore - a.readiness.readinessScore);
  }

  buildNetworkPlan(opportunities: Opportunity[], socialPlatforms: string[] = ['linkedin'], maxActions = 12): NetworkAction[] {
    const presence = this.presence.build(this.profile.id, this.evidence, socialPlatforms);
    const priorityOpportunities = opportunities.filter(o => !o.hardRejected).sort((a,b) => b.score.total-a.score.total).slice(0, 8);
    const relationships: RelationshipRecord[] = priorityOpportunities.flatMap(o => this.relationships.fromHumanPaths(o.humanPaths, o.job.company));
    const prioritizedRelationships = this.relationships.prioritize(relationships);
    const actions: NetworkAction[] = [];

    for (const repo of presence.github?.strongestRepositories.slice(0,3) ?? []) {
      actions.push({ kind:'github', priority:actions.length+1, reason:'strong portfolio evidence should be easy for recruiters and peers to evaluate', action:`make ${repo} immediately understandable: problem, working product proof, architecture, verification, and concise README` });
    }
    for (const social of presence.socialProfiles) {
      actions.push({ kind:'social-positioning', priority:actions.length+1, reason:`${social.platform} can create recurring discovery and warm professional paths`, action:`align ${social.platform} positioning and proof with target roles, then publish evidence-backed work for the audiences that matter` });
    }
    for (const rel of prioritizedRelationships.slice(0,5)) {
      actions.push({
        kind:'relationship',
        priority:actions.length+1,
        reason:`${rel.company ?? 'target company'} has a sourced human path with confidence ${Math.round(rel.confidence*100)}%`,
        action:'research the person or team, establish relevance, prepare personalized non-spam outreach, and retain interaction history for appropriate follow-up',
        company:rel.company,
        person:rel.name
      });
    }
    actions.push({ kind:'community', priority:actions.length+1, reason:'career networks compound beyond individual applications', action:'identify communities, peers, technical leaders, recruiters, and hiring managers adjacent to the target career and engage before asking for anything' });
    return actions.slice(0, maxActions).map((a,index) => ({...a,priority:index+1}));
  }

  buildPlan(rawResumeText: string, opportunities: Opportunity[], socialPlatforms: string[] = ['linkedin'], minimumOpportunityScore = 70): CareerOperatingPlan {
    const resume = this.auditResume(rawResumeText, opportunities);
    const presence = this.presence.build(this.profile.id, this.evidence, socialPlatforms);
    const decisions = this.selectOpportunities(opportunities, minimumOpportunityScore);
    const network = this.buildNetworkPlan(opportunities, socialPlatforms);
    const recurringGaps: SkillGap[] = opportunities
      .filter(o => !o.hardRejected)
      .flatMap(o => o.gaps)
      .filter(g => g.strength !== 'strong');
    const grouped = new Map<string, SkillGap>();
    for (const gap of recurringGaps) {
      const key = normalize(gap.skill);
      const existing = grouped.get(key);
      if (!existing || (existing.strength !== 'missing' && gap.strength === 'missing')) grouped.set(key, gap);
    }
    const development = this.development.plan(this.profile.id, [...grouped.values()]);
    const topPursuits = decisions.filter(d => d.decision === 'pursue').slice(0,3);
    const nextActions: string[] = [];
    if (resume.parsed.likelyOutdated || resume.verifiedSkillsMissingFromResume.length) nextActions.push('modernize the resume from the current career record and verified evidence before high-value applications');
    if (network.length) nextActions.push('execute the highest-value relationship and career-presence actions instead of relying only on cold applications');
    if (topPursuits.length) nextActions.push(`prepare selective applications for ${topPursuits.map(p => `${p.title} at ${p.company}`).join('; ')}`);
    if (development.actions.length) nextActions.push(`close the highest-impact readiness gap: ${development.actions[0].skill}`);
    nextActions.push('record interview, rejection, offer, relationship, compensation, and timing outcomes so strategy can be recalibrated from evidence');
    return { resume, presence, opportunities: decisions, network, development, nextActions };
  }
}
