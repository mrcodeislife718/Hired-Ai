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

const hash = (value: string) => createHash('sha256').update(value).digest('hex');

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
