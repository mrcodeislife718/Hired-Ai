import type { CandidateProfile, Evidence, FeedbackEvent, Opportunity, RawJob } from './domain.js';
import { ApplicationAgent, CareerPresenceAgent, CareerStrategist, CompanyIntelligenceAgent, EvidenceAgent, FollowUpAgent, InterviewAgent, OutreachAgent, QualificationAgent, RecruiterAgent, ResumeAgent, RoleReadinessAgent, ScoutAgent } from './agents.js';
import { CareerOperatingSystem } from './career-os.js';
import { Governor } from './governor.js';
import { scoreOpportunity } from './scoring.js';
import { Store } from './store.js';
import { id } from './utils.js';

export class HiredEngine {
  readonly store = new Store();
  readonly governor = new Governor(this.store);
  readonly scout = new ScoutAgent();
  readonly qualification = new QualificationAgent();
  readonly intelligence = new CompanyIntelligenceAgent();
  readonly evidenceAgent = new EvidenceAgent();
  readonly readiness = new RoleReadinessAgent();
  readonly careerPresence = new CareerPresenceAgent();
  readonly recruiter = new RecruiterAgent();
  readonly resume = new ResumeAgent();
  readonly outreach = new OutreachAgent();
  readonly application = new ApplicationAgent();
  readonly followup = new FollowUpAgent();
  readonly interview = new InterviewAgent();
  readonly strategist = new CareerStrategist();

  constructor(readonly profile: CandidateProfile, evidence: Evidence[] = []) {
    evidence.forEach(e => this.store.saveEvidence(e));
  }

  private careerOS() {
    return new CareerOperatingSystem(this.profile, [...this.store.evidence.values()]);
  }

  ingest(raw: RawJob): Opportunity {
    const job = this.scout.normalize(raw);
    this.governor.assertNoDuplicate(job.source, job.sourceId);
    const rejectionReasons = this.qualification.hardReject(job, this.profile);
    const intelligence = this.intelligence.analyze(job);
    const match = this.evidenceAgent.match(job, [...this.store.evidence.values()]);
    const score = scoreOpportunity(job, this.profile, match.gaps);
    const now = new Date().toISOString();
    const opportunity: Opportunity = {
      id: id('opp'), job, state: rejectionReasons.length ? 'REJECTED' : 'DISCOVERED', hardRejected: Boolean(rejectionReasons.length), rejectionReasons,
      intelligence, gaps: match.gaps, evidenceIds: match.evidenceIds, score, humanPaths: this.recruiter.derivePublicPaths(job), createdAt: now, updatedAt: now
    };
    this.store.saveOpportunity(opportunity);
    this.governor.audit('ScoutAgent', 'OPPORTUNITY_INGESTED', opportunity.id, { source: job.source, sourceId: job.sourceId, score: score.total });
    if (!opportunity.hardRejected) this.governor.transition(opportunity.id, 'QUALIFIED');
    return opportunity;
  }

  assessReadiness(opportunityId: string) {
    const opp = this.requiredOpportunity(opportunityId);
    return this.readiness.assess(opp.id, opp.gaps);
  }

  careerPresenceProfile(socialPlatforms: string[] = ['linkedin']) {
    return this.careerPresence.build(this.profile.id, [...this.store.evidence.values()], socialPlatforms);
  }

  auditCareer(resumeText: string, socialPlatforms: string[] = ['linkedin']) {
    return this.careerOS().buildPlan(resumeText, [...this.store.opportunities.values()], socialPlatforms);
  }

  selectiveOpportunities(minimumOpportunityScore = 70) {
    return this.careerOS().selectOpportunities([...this.store.opportunities.values()], minimumOpportunityScore);
  }

  networkPlan(socialPlatforms: string[] = ['linkedin']) {
    return this.careerOS().buildNetworkPlan([...this.store.opportunities.values()], socialPlatforms);
  }

  package(opportunityId: string) {
    const opp = this.requiredOpportunity(opportunityId);
    const evidence = opp.evidenceIds.map(id => this.store.evidence.get(id)).filter((x): x is Evidence => Boolean(x));
    const readiness = this.readiness.assess(opp.id, opp.gaps);
    const resume = this.resume.build(this.profile, opp.job, opp.gaps, evidence);
    const outreach = this.outreach.draft(this.profile, opp.job, evidence);
    const application = this.application.assemble(opp.job, resume, outreach);
    const interview = this.interview.prepare(opp.job, opp.intelligence, opp.gaps);
    return { opportunity: opp, readiness, resume, outreach, application, interview };
  }

  requestOutreach(opportunityId: string) {
    const p = this.package(opportunityId);
    return this.governor.requestApproval(opportunityId, 'SEND_OUTREACH', { message: p.outreach, paths: p.opportunity.humanPaths });
  }

  requestApplication(opportunityId: string) {
    const p = this.package(opportunityId);
    if (!p.readiness.canOccupyRole) throw new Error(`role readiness gate blocked application: ${p.readiness.blockingGaps.join(', ') || 'insufficient demonstrated readiness'}`);
    return this.governor.requestApproval(opportunityId, 'SUBMIT_APPLICATION', { ...p.application, readiness: p.readiness } as Record<string, unknown>);
  }

  recordFeedback(event: FeedbackEvent) {
    this.store.addFeedback(event);
    this.governor.audit('CareerStrategist', 'FEEDBACK_RECORDED', event.opportunityId, { kind: event.kind });
    const mapping: Partial<Record<FeedbackEvent['kind'], Parameters<Governor['transition']>[1]>> = {
      REJECTED: 'REJECTED',
      RECRUITER_SCREEN: 'RECRUITER_SCREEN',
      TECHNICAL_PASS: 'TECHNICAL',
      ONSITE: 'ONSITE',
      OFFER: 'OFFER'
    };
    const next = mapping[event.kind];
    if (next) {
      const opp = this.requiredOpportunity(event.opportunityId);
      if (opp.state !== next) this.governor.transition(event.opportunityId, next);
    }
    return this.strategist.analyze(this.store.feedback);
  }

  careerStatus() {
    const items = [...this.store.opportunities.values()].sort((a,b) => b.score.total - a.score.total);
    const counts = items.reduce<Record<string, number>>((a,o) => (a[o.state] = (a[o.state] ?? 0) + 1, a), {});
    const decisions = this.careerOS().selectOpportunities(items);
    return {
      counts,
      priority: decisions.filter(d => d.decision === 'pursue').slice(0, 10),
      developmentCandidates: decisions.filter(d => d.decision === 'develop-first').slice(0, 10),
      pendingApprovals: [...this.store.approvals.values()].filter(a => a.status === 'PENDING'),
      funnelLearning: this.strategist.analyze(this.store.feedback)
    };
  }

  private requiredOpportunity(id: string) {
    const value = this.store.opportunities.get(id);
    if (!value) throw new Error('opportunity not found');
    return value;
  }
}
