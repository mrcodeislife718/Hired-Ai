export type OutcomeCheckpoint = 'application' | 'interview' | 'offer' | 'accepted' | 'day-30' | 'day-90' | 'year-1' | 'promotion' | 'departure';

export interface LifetimeCareerState {
  candidateId: string;
  goals: string[];
  preferredWork: string[];
  dislikedWork: string[];
  values: string[];
  desiredImpact: string[];
  compensation?: { minimum?: number; target?: number; currency?: string };
  desiredTrajectory?: string;
  currentTrajectory?: string;
  currentRole?: { company?: string; title?: string; startedAt?: string };
  constraints: string[];
  updatedAt: string;
}

export interface CareerOutcomeEvent {
  id: string;
  candidateId: string;
  opportunityId?: string;
  employerId?: string;
  checkpoint: OutcomeCheckpoint;
  at: string;
  candidateSatisfaction?: number;
  employerSatisfaction?: number;
  compensationDelta?: number;
  desiredWorkAlignment?: number;
  growthAlignment?: number;
  wouldCandidateChooseAgain?: boolean;
  wouldEmployerChooseAgain?: boolean;
  regretReason?: string;
  notes?: string;
}

export interface OutcomeSummary {
  totalEvents: number;
  durableOutcomeEvents: number;
  candidateRegretRate: number;
  employerRegretRate: number;
  averageCandidateSatisfaction?: number;
  averageEmployerSatisfaction?: number;
  averageDesiredWorkAlignment?: number;
  averageGrowthAlignment?: number;
  averageCompensationDelta?: number;
}

const avg = (values: number[]) => values.length ? Math.round((values.reduce((a,b)=>a+b,0) / values.length) * 100) / 100 : undefined;
const pct = (numerator: number, denominator: number) => denominator ? Math.round((numerator / denominator) * 10000) / 100 : 0;

export class CareerOutcomeLedger {
  private readonly events: CareerOutcomeEvent[] = [];

  record(event: CareerOutcomeEvent) {
    if (!event.candidateId) throw new Error('candidateId required');
    if (!event.at || Number.isNaN(Date.parse(event.at))) throw new Error('valid outcome timestamp required');
    for (const field of ['candidateSatisfaction','employerSatisfaction','desiredWorkAlignment','growthAlignment'] as const) {
      const value = event[field];
      if (value !== undefined && (value < 0 || value > 100)) throw new Error(`${field} must be between 0 and 100`);
    }
    if (this.events.some(existing => existing.id === event.id)) throw new Error('duplicate outcome event');
    this.events.push({ ...event });
    return event;
  }

  all(candidateId?: string) {
    return this.events.filter(event => !candidateId || event.candidateId === candidateId).map(event => ({ ...event }));
  }

  summary(candidateId?: string): OutcomeSummary {
    const events = this.all(candidateId);
    const durable = events.filter(event => ['day-30','day-90','year-1','promotion','departure'].includes(event.checkpoint));
    const candidateDecisionEvents = durable.filter(event => event.wouldCandidateChooseAgain !== undefined);
    const employerDecisionEvents = durable.filter(event => event.wouldEmployerChooseAgain !== undefined);
    return {
      totalEvents: events.length,
      durableOutcomeEvents: durable.length,
      candidateRegretRate: pct(candidateDecisionEvents.filter(event => event.wouldCandidateChooseAgain === false).length, candidateDecisionEvents.length),
      employerRegretRate: pct(employerDecisionEvents.filter(event => event.wouldEmployerChooseAgain === false).length, employerDecisionEvents.length),
      averageCandidateSatisfaction: avg(durable.flatMap(event => event.candidateSatisfaction === undefined ? [] : [event.candidateSatisfaction])),
      averageEmployerSatisfaction: avg(durable.flatMap(event => event.employerSatisfaction === undefined ? [] : [event.employerSatisfaction])),
      averageDesiredWorkAlignment: avg(durable.flatMap(event => event.desiredWorkAlignment === undefined ? [] : [event.desiredWorkAlignment])),
      averageGrowthAlignment: avg(durable.flatMap(event => event.growthAlignment === undefined ? [] : [event.growthAlignment])),
      averageCompensationDelta: avg(events.flatMap(event => event.compensationDelta === undefined ? [] : [event.compensationDelta]))
    };
  }
}

export const MAYA_PRODUCT_LAWS = Object.freeze([
  'individual-outcome-over-engagement',
  'quality-over-application-volume',
  'truth-over-flattery',
  'fulfillment-and-compensation-both-matter',
  'career-progression-never-stops',
  'employer-quality-matters',
  'mutual-fit-not-one-sided-screening',
  'consequential-judgments-must-be-explainable',
  'uncertainty-must-remain-visible',
  'learn-from-real-outcomes',
  'no-pay-to-win-organic-ranking',
  'free-users-get-the-same-baseline-truth-respect-and-care',
  'optimize-for-a-lifetime-not-a-single-job'
] as const);

export interface RecommendationPolicyInput {
  organicFitScore: number;
  readinessScore: number;
  fulfillmentScore?: number;
  reliabilityConfidence: number;
  sponsored?: boolean;
  paidBoost?: number;
  explanation: string[];
  unknowns?: string[];
}

export function enforceRecommendationPolicy(input: RecommendationPolicyInput) {
  const organicScore = Math.max(0, Math.min(100, Math.round(
    input.organicFitScore * 0.40 +
    input.readinessScore * 0.30 +
    (input.fulfillmentScore ?? input.organicFitScore) * 0.20 +
    input.reliabilityConfidence * 0.10
  )));
  return {
    organicScore,
    rankingScore: organicScore,
    sponsored: Boolean(input.sponsored),
    paidBoostIgnored: input.paidBoost ?? 0,
    explanation: [...input.explanation],
    unknowns: [...(input.unknowns ?? [])],
    policy: 'paid promotion may affect labeled reach, never organic fit ranking'
  };
}
