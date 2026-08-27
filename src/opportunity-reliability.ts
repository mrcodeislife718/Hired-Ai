import type { RawJob } from './domain.js';
import { normalize, stableHash } from './utils.js';

export type FreshnessStatus = 'fresh' | 'aging' | 'stale' | 'unknown';

export interface OpportunityReliability {
  canonicalKey: string;
  firstSeenAt: string;
  lastSeenAt: string;
  lastVerifiedAt?: string;
  freshnessStatus: FreshnessStatus;
  ageDays?: number;
  confidence: number;
  confidenceReasons: string[];
  unknowns: string[];
}

function daysSince(iso: string, now = new Date()) {
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return undefined;
  return Math.max(0, (now.getTime() - time) / 86_400_000);
}

function compact(value: string) {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function canonicalOpportunityKey(job: RawJob) {
  const requisition = compact(job.sourceId || '');
  const company = compact(job.company);
  const title = compact(job.title)
    .replace(/\b(sr|senior|jr|junior|ii|iii|iv)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const location = compact(job.location).replace(/\b(remote|hybrid|onsite|on site)\b/g, '').trim();
  const descriptionFingerprint = stableHash(compact(job.description).slice(0, 1200));
  return stableHash({ company, title, location, requisition, descriptionFingerprint });
}

export function assessOpportunityReliability(job: RawJob, now = new Date()): OpportunityReliability {
  const ageDays = daysSince(job.postedAt, now);
  const unknowns: string[] = [];
  const confidenceReasons: string[] = [];
  let confidence = 0.5;

  let freshnessStatus: FreshnessStatus = 'unknown';
  if (ageDays === undefined) {
    unknowns.push('posting date could not be verified');
    confidence -= 0.12;
  } else if (ageDays <= 14) {
    freshnessStatus = 'fresh';
    confidence += 0.2;
    confidenceReasons.push('posting is recent');
  } else if (ageDays <= 35) {
    freshnessStatus = 'aging';
    confidence += 0.05;
    confidenceReasons.push('posting is aging but still within the normal verification window');
  } else {
    freshnessStatus = 'stale';
    confidence -= 0.25;
    confidenceReasons.push('posting is old enough to require re-verification before recommendation');
  }

  if (/^https?:\/\//i.test(job.url)) {
    confidence += 0.08;
    confidenceReasons.push('application source has a concrete URL');
  } else {
    unknowns.push('application URL is missing or invalid');
    confidence -= 0.1;
  }

  if (job.requirements.length >= 3) {
    confidence += 0.08;
    confidenceReasons.push('posting exposes enough requirements for meaningful matching');
  } else {
    unknowns.push('requirements are sparse');
    confidence -= 0.08;
  }

  if (job.salaryMin || job.salaryMax) {
    confidence += 0.04;
    confidenceReasons.push('compensation information is available');
  } else {
    unknowns.push('compensation is not disclosed');
  }

  if (!job.company.trim() || !job.title.trim()) {
    unknowns.push('company or title is incomplete');
    confidence -= 0.25;
  }

  confidence = Math.max(0, Math.min(1, Number(confidence.toFixed(2))));
  const at = now.toISOString();
  return {
    canonicalKey: canonicalOpportunityKey(job),
    firstSeenAt: at,
    lastSeenAt: at,
    freshnessStatus,
    ageDays: ageDays === undefined ? undefined : Number(ageDays.toFixed(1)),
    confidence,
    confidenceReasons,
    unknowns
  };
}

export function shouldRecommendWithoutReverification(reliability: OpportunityReliability) {
  return reliability.freshnessStatus !== 'stale' && reliability.confidence >= 0.55;
}
