import { createHash } from 'node:crypto';

export type InsightEventKind = 'career-goal'|'application'|'interview'|'assessment'|'offer'|'hire'|'retention'|'advancement'|'gig-outcome';

export interface InsightEvent {
  id: string;
  subjectId: string;
  kind: InsightEventKind;
  occurredAt: string;
  profession?: string;
  industry?: string;
  geography?: string;
  employerSegment?: 'startup'|'smb'|'enterprise'|'nonprofit'|'public-sector'|'gig-marketplace';
  outcome?: string;
  numericValue?: number;
  source: 'candidate'|'employer'|'hired-ai'|'partner';
  verified: boolean;
  analyticsConsent: boolean;
  modelTrainingConsent: boolean;
  sensitive?: boolean;
}

export interface AggregateInsight {
  key: string;
  count: number;
  verifiedCount: number;
  averageNumericValue?: number;
  confidence: 'low'|'medium'|'high';
}

export interface InsightNetworkSnapshot {
  version: 1;
  events: InsightEvent[];
  integrityDigest: string;
}

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const canonicalDigest = (events: InsightEvent[]) => hash(JSON.stringify([...events].sort((a,b)=>a.id.localeCompare(b.id))));

export function analyticsEligible(event: InsightEvent) {
  return event.analyticsConsent && !event.sensitive;
}

export function trainingEligible(event: InsightEvent) {
  return analyticsEligible(event) && event.modelTrainingConsent && event.verified;
}

export function pseudonymousInsightEvent(event: InsightEvent) {
  if (!analyticsEligible(event)) throw new Error('event is not eligible for analytics');
  const { subjectId, ...rest } = event;
  return { ...rest, subjectKey: hash(subjectId).slice(0, 24) };
}

export function aggregateInsights(events: InsightEvent[], minimumCohortSize = 5): AggregateInsight[] {
  const groups = new Map<string, InsightEvent[]>();
  for (const event of events.filter(analyticsEligible)) {
    const key = [event.kind,event.profession??'any',event.industry??'any',event.employerSegment??'any'].join('|');
    const list = groups.get(key) ?? [];
    list.push(event); groups.set(key,list);
  }
  const result: AggregateInsight[] = [];
  for (const [key, items] of groups) {
    if (items.length < minimumCohortSize) continue;
    const numeric = items.map(item=>item.numericValue).filter((value): value is number => Number.isFinite(value));
    result.push({
      key,
      count: items.length,
      verifiedCount: items.filter(item=>item.verified).length,
      averageNumericValue: numeric.length ? numeric.reduce((a,b)=>a+b,0)/numeric.length : undefined,
      confidence: items.length >= 100 ? 'high' : items.length >= 25 ? 'medium' : 'low'
    });
  }
  return result;
}

export function buildTrainingCorpus(events: InsightEvent[]) {
  return events.filter(trainingEligible).map(event => pseudonymousInsightEvent(event));
}

/**
 * Replayable insight ledger. Production storage may persist this snapshot in Postgres or the
 * existing durable runtime; duplicate event ids are rejected so retries do not double-count outcomes.
 */
export class CareerInsightLedger {
  private readonly byId = new Map<string,InsightEvent>();

  constructor(snapshot?: InsightNetworkSnapshot) {
    if (snapshot) {
      if (snapshot.version !== 1) throw new Error('unsupported insight snapshot version');
      if (canonicalDigest(snapshot.events) !== snapshot.integrityDigest) throw new Error('insight snapshot integrity mismatch');
      for (const event of snapshot.events) this.append(event);
    }
  }

  append(event: InsightEvent) {
    if (!event.id.trim()) throw new Error('insight event id is required');
    if (!event.subjectId.trim()) throw new Error('insight event subject is required');
    if (Number.isNaN(Date.parse(event.occurredAt))) throw new Error('insight event occurredAt must be valid ISO time');
    const previous = this.byId.get(event.id);
    if (previous) {
      if (JSON.stringify(previous) !== JSON.stringify(event)) throw new Error(`conflicting duplicate insight event: ${event.id}`);
      return previous;
    }
    const stored = structuredClone(event);
    this.byId.set(stored.id,stored);
    return stored;
  }

  all() { return [...this.byId.values()].sort((a,b)=>a.occurredAt.localeCompare(b.occurredAt)); }
  aggregates(minimumCohortSize = 5) { return aggregateInsights(this.all(),minimumCohortSize); }
  trainingCorpus() { return buildTrainingCorpus(this.all()); }
  snapshot(): InsightNetworkSnapshot {
    const events=this.all();
    return {version:1,events,integrityDigest:canonicalDigest(events)};
  }
}
