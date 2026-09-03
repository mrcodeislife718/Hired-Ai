import { createHash } from 'node:crypto';

export type CareerProofEventType =
  | 'opportunity_recommended'
  | 'opportunity_useful'
  | 'relationship_created'
  | 'relationship_useful'
  | 'application_sent'
  | 'screen_received'
  | 'interview_received'
  | 'offer_received'
  | 'hire_started'
  | 'transition_completed'
  | 'promotion_received'
  | 'retained_30d'
  | 'retained_90d'
  | 'retained_365d'
  | 'career_mobility_gain';

export interface CareerProofEvent {
  id: string;
  subjectId: string;
  type: CareerProofEventType;
  occurredAt: string;
  opportunityId?: string;
  relationshipId?: string;
  fromCareer?: string;
  toCareer?: string;
  compensationBeforeUsd?: number;
  compensationAfterUsd?: number;
  timeSavedMinutes?: number;
  satisfactionScore?: number;
  evidenceRef: string;
  verified: boolean;
}

export interface RateMetric {
  numerator: number;
  denominator: number;
  rate: number | null;
}

export interface CommercialOutcomeReport {
  subjects: number;
  verifiedEvents: number;
  opportunityPrecision: RateMetric;
  usefulRelationshipCreation: RateMetric;
  applicationToScreenConversion: RateMetric;
  screenToInterviewConversion: RateMetric;
  interviewToOfferConversion: RateMetric;
  offerToHireConversion: RateMetric;
  careerTransitionSuccess: RateMetric;
  promotionOutcomeRate: RateMetric;
  retention30d: RateMetric;
  retention90d: RateMetric;
  retention365d: RateMetric;
  careerMobilityRate: RateMetric;
  medianTimeToInterviewDays: number | null;
  medianTimeToOfferDays: number | null;
  medianCompensationImprovementPercent: number | null;
  medianUserTimeSavedMinutes: number | null;
  medianPostHireSatisfaction: number | null;
}

export interface CommercialProofSnapshot {
  version: 1;
  events: CareerProofEvent[];
  hash: string;
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}

function hashEvents(events: CareerProofEvent[]) {
  return createHash('sha256').update(stable(events)).digest('hex');
}

function validNumber(value: number | undefined, minimum = 0, maximum = Number.POSITIVE_INFINITY) {
  return value === undefined || (Number.isFinite(value) && value >= minimum && value <= maximum);
}

function validateEvent(event: CareerProofEvent) {
  if (!event.id.trim() || !event.subjectId.trim() || !event.evidenceRef.trim()) throw new Error('Commercial proof events require id, subjectId, and evidenceRef');
  if (!Number.isFinite(Date.parse(event.occurredAt))) throw new Error('Commercial proof event occurredAt must be an ISO-compatible timestamp');
  if (!validNumber(event.compensationBeforeUsd) || !validNumber(event.compensationAfterUsd) || !validNumber(event.timeSavedMinutes)) throw new Error('Commercial proof economic values must be finite and non-negative');
  if (!validNumber(event.satisfactionScore, 0, 10)) throw new Error('Commercial proof satisfactionScore must be between 0 and 10');
}

export class CommercialOutcomeProofLedger {
  private readonly eventsById = new Map<string, CareerProofEvent>();

  constructor(events: CareerProofEvent[] = []) {
    for (const event of events) this.append(event);
  }

  append(event: CareerProofEvent) {
    validateEvent(event);
    const normalized = structuredClone(event);
    const existing = this.eventsById.get(event.id);
    if (existing) {
      if (stable(existing) !== stable(normalized)) throw new Error(`Commercial proof event id collision: ${event.id}`);
      return false;
    }
    this.eventsById.set(event.id, normalized);
    return true;
  }

  list(options: { subjectId?: string; verifiedOnly?: boolean } = {}) {
    return [...this.eventsById.values()]
      .filter(event => !options.subjectId || event.subjectId === options.subjectId)
      .filter(event => !options.verifiedOnly || event.verified)
      .sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt) || a.id.localeCompare(b.id))
      .map(event => structuredClone(event));
  }

  snapshot(): CommercialProofSnapshot {
    const events = this.list();
    return { version: 1, events, hash: hashEvents(events) };
  }

  static restore(snapshot: CommercialProofSnapshot) {
    if (snapshot.version !== 1) throw new Error('Unsupported commercial proof snapshot version');
    if (snapshot.hash !== hashEvents(snapshot.events)) throw new Error('Commercial proof snapshot integrity check failed');
    return new CommercialOutcomeProofLedger(snapshot.events);
  }
}

function metric(numerator: number, denominator: number): RateMetric {
  return { numerator, denominator, rate: denominator > 0 ? numerator / denominator : null };
}

function count(events: CareerProofEvent[], type: CareerProofEventType) {
  return events.filter(event => event.type === type).length;
}

function median(values: number[]) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function firstByOpportunity(events: CareerProofEvent[], type: CareerProofEventType) {
  const map = new Map<string, CareerProofEvent>();
  for (const event of events) {
    if (!event.opportunityId || event.type !== type) continue;
    const existing = map.get(event.opportunityId);
    if (!existing || Date.parse(event.occurredAt) < Date.parse(existing.occurredAt)) map.set(event.opportunityId, event);
  }
  return map;
}

function elapsedDays(from: CareerProofEvent, to: CareerProofEvent) {
  const elapsed = Date.parse(to.occurredAt) - Date.parse(from.occurredAt);
  return elapsed >= 0 ? elapsed / 86_400_000 : null;
}

export function buildCommercialOutcomeReport(allEvents: CareerProofEvent[]): CommercialOutcomeReport {
  const events = allEvents.filter(event => event.verified);
  const applications = firstByOpportunity(events, 'application_sent');
  const screens = firstByOpportunity(events, 'screen_received');
  const interviews = firstByOpportunity(events, 'interview_received');
  const offers = firstByOpportunity(events, 'offer_received');
  const hires = firstByOpportunity(events, 'hire_started');

  const timeToInterview: number[] = [];
  const timeToOffer: number[] = [];
  for (const [id, application] of applications) {
    const interview = interviews.get(id);
    const offer = offers.get(id);
    if (interview) {
      const days = elapsedDays(application, interview);
      if (days !== null) timeToInterview.push(days);
    }
    if (offer) {
      const days = elapsedDays(application, offer);
      if (days !== null) timeToOffer.push(days);
    }
  }

  const compensationImprovement = events
    .filter(event => event.type === 'hire_started' && event.compensationBeforeUsd !== undefined && event.compensationAfterUsd !== undefined && event.compensationBeforeUsd > 0)
    .map(event => ((event.compensationAfterUsd! - event.compensationBeforeUsd!) / event.compensationBeforeUsd!) * 100);

  const timeSaved = events.flatMap(event => event.timeSavedMinutes === undefined ? [] : [event.timeSavedMinutes]);
  const satisfaction = events
    .filter(event => ['hire_started', 'retained_30d', 'retained_90d', 'retained_365d'].includes(event.type))
    .flatMap(event => event.satisfactionScore === undefined ? [] : [event.satisfactionScore]);

  return {
    subjects: new Set(events.map(event => event.subjectId)).size,
    verifiedEvents: events.length,
    opportunityPrecision: metric(count(events, 'opportunity_useful'), count(events, 'opportunity_recommended')),
    usefulRelationshipCreation: metric(count(events, 'relationship_useful'), count(events, 'relationship_created')),
    applicationToScreenConversion: metric(screens.size, applications.size),
    screenToInterviewConversion: metric(interviews.size, screens.size),
    interviewToOfferConversion: metric(offers.size, interviews.size),
    offerToHireConversion: metric(hires.size, offers.size),
    careerTransitionSuccess: metric(count(events, 'transition_completed'), new Set(events.filter(event => event.fromCareer && event.toCareer).map(event => `${event.subjectId}:${event.fromCareer}->${event.toCareer}`)).size),
    promotionOutcomeRate: metric(count(events, 'promotion_received'), new Set(events.map(event => event.subjectId)).size),
    retention30d: metric(count(events, 'retained_30d'), hires.size),
    retention90d: metric(count(events, 'retained_90d'), hires.size),
    retention365d: metric(count(events, 'retained_365d'), hires.size),
    careerMobilityRate: metric(count(events, 'career_mobility_gain'), new Set(events.map(event => event.subjectId)).size),
    medianTimeToInterviewDays: median(timeToInterview),
    medianTimeToOfferDays: median(timeToOffer),
    medianCompensationImprovementPercent: median(compensationImprovement),
    medianUserTimeSavedMinutes: median(timeSaved),
    medianPostHireSatisfaction: median(satisfaction)
  };
}
