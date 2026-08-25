import type { CandidateProfile, Evidence, FeedbackEvent, Opportunity, RawJob } from './domain.js';
import { ApplicationAgent, CareerPresenceAgent, CareerStrategist, CompanyIntelligenceAgent, EvidenceAgent, FollowUpAgent, InterviewAgent, OutreachAgent, QualificationAgent, RecruiterAgent, ResumeAgent, RoleReadinessAgent, ScoutAgent } from './agents.js';
import { CareerOperatingSystem } from './career-os.js';
import { CareerOutcomeLedger, enforceRecommendationPolicy, type CareerOutcomeEvent } from './career-outcomes.js';
import { CareerTwin, type CareerFact, type CareerTwinSnapshot } from './career-twin.js';
import { Governor } from './governor.js';
import { assessOpportunityReliability, canonicalOpportunityKey, shouldRecommendWithoutReverification, type OpportunityReliability } from './opportunity-reliability.js';
import { SavedOpportunityStore, type OpportunityWatchRule, type SavedOpportunity } from './saved-opportunities.js';
import { scoreOpportunity } from './scoring.js';
import { Store } from './store.js';
import { id } from './utils.js';

type ReliableOpportunity = Opportunity & { reliability: OpportunityReliability };

export interface EngineDurableState {
  careerTwin?: CareerTwinSnapshot;
  careerOutcomes?: CareerOutcomeEvent[];
  savedOpportunities?: SavedOpportunity[];
  opportunityWatches?: OpportunityWatchRule[];
}

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
  readonly outcomes: CareerOutcomeLedger;
  readonly careerTwin: CareerTwin;
  readonly saved: SavedOpportunityStore;

  constructor(readonly profile: CandidateProfile, evidence: Evidence[] = [], durable: EngineDurableState = {}) {
    evidence.forEach(e => this.store.saveEvidence(e));
    this.outcomes = new CareerOutcomeLedger(durable.careerOutcomes ?? []);
    this.careerTwin = new CareerTwin(profile.id, durable.careerTwin);
    this.saved = new SavedOpportunityStore({ saved: durable.savedOpportunities, watches: durable.opportunityWatches });
  }

  durableState(): EngineDurableState {
    const saved = this.saved.snapshot();
    return {
      careerTwin: this.careerTwin.current(),
      careerOutcomes: this.outcomes.all(this.profile.id),
      savedOpportunities: saved.saved,
      opportunityWatches: saved.watches
    };
  }

  private careerOS() {
    return new CareerOperatingSystem(this.profile, [...this.store.evidence.values()]);
  }

  ingest(raw: RawJob): Opportunity {
    const job = this.scout.normalize(raw);
    this.governor.assertNoDuplicate(job.source, job.sourceId);
    const canonicalKey = canonicalOpportunityKey(job);
    const canonicalDuplicate = [...this.store.opportunities.values()].find(existing => {
      const known = (existing as ReliableOpportunity).reliability?.canonicalKey;
      return known ? known === canonicalKey : canonicalOpportunityKey(existing.job) === canonicalKey;
    });
    if (canonicalDuplicate) throw new Error(`duplicate opportunity across sources: ${canonicalDuplicate.job.company} ${canonicalDuplicate.job.title}`);
    const reliability = assessOpportunityReliability(job);
    const rejectionReasons = this.qualification.hardReject(job, this.profile);
    if (!shouldRecommendWithoutReverification(reliability)) rejectionReasons.push('opportunity requires source re-verification before recommendation');
    const intelligence = this.intelligence.analyze(job);
    const match = this.evidenceAgent.match(job, [...this.store.evidence.values()]);
    const score = scoreOpportunity(job, this.profile, match.gaps);
    const now = new Date().toISOString();
    const opportunity = {
      id: id('opp'), job, state: rejectionReasons.length ? 'REJECTED' : 'DISCOVERED', hardRejected: Boolean(rejectionReasons.length), rejectionReasons,
      intelligence, gaps: match.gaps, evidenceIds: match.evidenceIds, score, humanPaths: this.recruiter.derivePublicPaths(job), createdAt: now, updatedAt: now,
      reliability
    } as ReliableOpportunity;
    this.store.saveOpportunity(opportunity);
    this.governor.audit('ScoutAgent', 'OPPORTUNITY_INGESTED', opportunity.id, {
      source: job.source, sourceId: job.sourceId, score: score.total, canonicalKey: reliability.canonicalKey,
      freshnessStatus: reliability.freshnessStatus, reliabilityConfidence: reliability.confidence, unknowns: reliability.unknowns
    });
    if (!opportunity.hardRejected) this.governor.transition(opportunity.id, 'QUALIFIED');
    return opportunity;
  }

  assessReadiness(opportunityId: string) { const opp = this.requiredOpportunity(opportunityId); return this.readiness.assess(opp.id, opp.gaps); }
  careerPresenceProfile(socialPlatforms: string[] = ['linkedin']) { return this.careerPresence.build(this.profile.id, [...this.store.evidence.values()], socialPlatforms); }
  auditCareer(resumeText: string, socialPlatforms: string[] = ['linkedin']) { return this.careerOS().buildPlan(resumeText, [...this.store.opportunities.values()], socialPlatforms); }
  selectiveOpportunities(minimumOpportunityScore = 70) { return this.careerOS().selectOpportunities([...this.store.opportunities.values()], minimumOpportunityScore); }

  explainRecommendation(opportunityId: string, fulfillmentScore?: number, sponsored = false, paidBoost = 0) {
    const opp = this.requiredOpportunity(opportunityId) as ReliableOpportunity;
    const readiness = this.assessReadiness(opportunityId);
    const reliability = opp.reliability ?? assessOpportunityReliability(opp.job);
    const explanation = [`opportunity fit ${opp.score.total}/100`,`role readiness ${readiness.readinessScore}/100`,`source reliability ${reliability.confidence}/100`];
    if (fulfillmentScore !== undefined) explanation.push(`fulfillment fit ${fulfillmentScore}/100`);
    return enforceRecommendationPolicy({ organicFitScore: opp.score.total, readinessScore: readiness.readinessScore, fulfillmentScore, reliabilityConfidence: reliability.confidence, sponsored, paidBoost, explanation, unknowns: reliability.unknowns });
  }

  networkPlan(socialPlatforms: string[] = ['linkedin']) { return this.careerOS().buildNetworkPlan([...this.store.opportunities.values()], socialPlatforms); }

  package(opportunityId: string) {
    const opp = this.requiredOpportunity(opportunityId);
    const evidence = opp.evidenceIds.map(evidenceId => this.store.evidence.get(evidenceId)).filter((x): x is Evidence => Boolean(x));
    const readiness = this.readiness.assess(opp.id, opp.gaps);
    const resume = this.resume.build(this.profile, opp.job, opp.gaps, evidence);
    const outreach = this.outreach.draft(this.profile, opp.job, evidence);
    const application = this.application.assemble(opp.job, resume, outreach);
    const interview = this.interview.prepare(opp.job, opp.intelligence, opp.gaps);
    const reliability = (opp as ReliableOpportunity).reliability ?? assessOpportunityReliability(opp.job);
    const recommendation = this.explainRecommendation(opportunityId);
    return { opportunity: opp, reliability, readiness, recommendation, resume, outreach, application, interview };
  }

  saveOpportunity(opportunityId: string, notes?: string, priority: SavedOpportunity['priority'] = 'medium') {
    this.requiredOpportunity(opportunityId);
    const result = this.saved.save({ opportunityId, savedAt: new Date().toISOString(), notes, priority });
    this.governor.audit('Maya', 'OPPORTUNITY_SAVED', opportunityId, { priority, notes });
    return result;
  }
  unsaveOpportunity(opportunityId: string) { const removed = this.saved.unsave(opportunityId); this.governor.audit('Maya','OPPORTUNITY_UNSAVED',opportunityId,{removed}); return removed; }
  savedOpportunities() { return this.saved.listSaved().map(item => ({ ...item, opportunity: this.store.opportunities.get(item.opportunityId) })); }
  upsertOpportunityWatch(rule: OpportunityWatchRule) {
    if (rule.candidateId !== this.profile.id) throw new Error('watch candidate does not match engine profile');
    const result = this.saved.upsertWatch(rule);
    this.governor.audit('Maya','OPPORTUNITY_WATCH_UPSERTED',undefined,{watchId:rule.id,enabled:rule.enabled,cadence:rule.cadence});
    return result;
  }
  opportunityWatches() { return this.saved.listWatches(this.profile.id); }
  removeOpportunityWatch(id: string) { return this.saved.removeWatch(id); }

  updateCareerTwin<K extends keyof Pick<CareerTwinSnapshot,'goals'|'strengths'|'growthAreas'|'preferredWork'|'dislikedWork'|'values'|'compensation'|'trajectory'|'constraints'>>(key: K, fact: CareerTwinSnapshot[K]) {
    const snapshot = this.careerTwin.update(key, fact);
    this.governor.audit('CareerTwin','CAREER_TWIN_UPDATED',undefined,{key,source:(fact as CareerFact).source,confidence:(fact as CareerFact).confidence,version:snapshot.version});
    return snapshot;
  }
  addCareerFact(fact: CareerFact) { const snapshot = this.careerTwin.addFact(fact); this.governor.audit('CareerTwin','CAREER_FACT_ADDED',undefined,{key:fact.key,source:fact.source,confidence:fact.confidence}); return snapshot; }

  requestOutreach(opportunityId: string) {
    const p = this.package(opportunityId);
    if (!shouldRecommendWithoutReverification(p.reliability)) throw new Error('opportunity source must be re-verified before outreach');
    return this.governor.requestApproval(opportunityId, 'SEND_OUTREACH', { message: p.outreach, paths: p.opportunity.humanPaths, reliability: p.reliability, recommendation: p.recommendation });
  }
  requestApplication(opportunityId: string) {
    const p = this.package(opportunityId);
    if (!shouldRecommendWithoutReverification(p.reliability)) throw new Error('opportunity source must be re-verified before application');
    if (!p.readiness.canOccupyRole) throw new Error(`role readiness gate blocked application: ${p.readiness.blockingGaps.join(', ') || 'insufficient demonstrated readiness'}`);
    return this.governor.requestApproval(opportunityId, 'SUBMIT_APPLICATION', { ...p.application, readiness: p.readiness, reliability: p.reliability, recommendation: p.recommendation } as Record<string, unknown>);
  }

  recordFeedback(event: FeedbackEvent) {
    this.store.addFeedback(event);
    this.governor.audit('CareerStrategist', 'FEEDBACK_RECORDED', event.opportunityId, { kind: event.kind });
    const mapping: Partial<Record<FeedbackEvent['kind'], Parameters<Governor['transition']>[1]>> = { REJECTED:'REJECTED', RECRUITER_SCREEN:'RECRUITER_SCREEN', TECHNICAL_PASS:'TECHNICAL', ONSITE:'ONSITE', OFFER:'OFFER' };
    const next = mapping[event.kind];
    if (next) { const opp = this.requiredOpportunity(event.opportunityId); if (opp.state !== next) this.governor.transition(event.opportunityId, next); }
    return this.strategist.analyze(this.store.feedback);
  }

  recordCareerOutcome(event: CareerOutcomeEvent) {
    if (event.candidateId !== this.profile.id) throw new Error('career outcome candidate does not match engine profile');
    if (event.opportunityId) this.requiredOpportunity(event.opportunityId);
    const recorded = this.outcomes.record(event);
    this.governor.audit('CareerOutcomeLedger', 'CAREER_OUTCOME_RECORDED', event.opportunityId, { checkpoint:event.checkpoint,candidateSatisfaction:event.candidateSatisfaction,employerSatisfaction:event.employerSatisfaction,wouldCandidateChooseAgain:event.wouldCandidateChooseAgain,wouldEmployerChooseAgain:event.wouldEmployerChooseAgain,regretReason:event.regretReason });
    return { recorded, summary: this.outcomes.summary(this.profile.id) };
  }
  careerOutcomeSummary() { return this.outcomes.summary(this.profile.id); }

  careerStatus() {
    const items = [...this.store.opportunities.values()].sort((a,b) => b.score.total - a.score.total);
    const counts = items.reduce<Record<string, number>>((a,o) => (a[o.state] = (a[o.state] ?? 0) + 1, a), {});
    const decisions = this.careerOS().selectOpportunities(items);
    const reliability = items.map(item => ({ opportunityId:item.id,company:item.job.company,title:item.job.title,...((item as ReliableOpportunity).reliability ?? assessOpportunityReliability(item.job)) }));
    return {
      counts,
      priority: decisions.filter(d => d.decision === 'pursue').slice(0, 10),
      developmentCandidates: decisions.filter(d => d.decision === 'develop-first').slice(0, 10),
      pendingApprovals: [...this.store.approvals.values()].filter(a => a.status === 'PENDING'),
      funnelLearning: this.strategist.analyze(this.store.feedback),
      careerTwin: this.careerTwin.current(),
      careerOutcomes: this.careerOutcomeSummary(),
      savedOpportunities: this.saved.listSaved(),
      watches: this.opportunityWatches(),
      reliability
    };
  }

  private requiredOpportunity(opportunityId: string) { const value = this.store.opportunities.get(opportunityId); if (!value) throw new Error('opportunity not found'); return value; }
}
