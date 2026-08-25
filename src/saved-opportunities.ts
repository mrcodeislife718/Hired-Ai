import type { Opportunity } from './domain.js';
import { normalize } from './utils.js';

export type WatchCadence = 'daily' | 'weekly';

export interface SavedOpportunity {
  opportunityId: string;
  savedAt: string;
  notes?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface OpportunityWatchRule {
  id: string;
  candidateId: string;
  query: string;
  targetTitles?: string[];
  locations?: string[];
  workModes?: Array<'onsite' | 'hybrid' | 'remote'>;
  minimumSalary?: number;
  minimumFitScore?: number;
  cadence: WatchCadence;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WatchMatch {
  watchId: string;
  opportunityId: string;
  matchedAt: string;
  reasons: string[];
  fitScore: number;
}

export class SavedOpportunityStore {
  private readonly saved = new Map<string, SavedOpportunity>();
  private readonly watches = new Map<string, OpportunityWatchRule>();

  constructor(snapshot?: { saved?: SavedOpportunity[]; watches?: OpportunityWatchRule[] }) {
    for (const item of snapshot?.saved ?? []) this.saved.set(item.opportunityId, structuredClone(item));
    for (const rule of snapshot?.watches ?? []) this.watches.set(rule.id, structuredClone(rule));
  }

  save(item: SavedOpportunity) {
    if (!item.opportunityId) throw new Error('opportunityId required');
    if (!item.savedAt || Number.isNaN(Date.parse(item.savedAt))) throw new Error('valid savedAt required');
    this.saved.set(item.opportunityId, structuredClone(item));
    return structuredClone(item);
  }

  unsave(opportunityId: string) { return this.saved.delete(opportunityId); }
  listSaved() { return [...this.saved.values()].sort((a,b) => Date.parse(b.savedAt)-Date.parse(a.savedAt)).map(structuredClone); }

  upsertWatch(rule: OpportunityWatchRule) {
    if (!rule.id || !rule.candidateId || !rule.query.trim()) throw new Error('watch id, candidateId and query are required');
    if (rule.minimumFitScore !== undefined && (rule.minimumFitScore < 0 || rule.minimumFitScore > 100)) throw new Error('minimumFitScore must be between 0 and 100');
    const now = new Date().toISOString();
    const existing = this.watches.get(rule.id);
    const next = { ...structuredClone(rule), createdAt: existing?.createdAt ?? rule.createdAt ?? now, updatedAt: now };
    this.watches.set(rule.id, next);
    return structuredClone(next);
  }

  listWatches(candidateId?: string) { return [...this.watches.values()].filter(rule => !candidateId || rule.candidateId === candidateId).map(structuredClone); }
  removeWatch(id: string) { return this.watches.delete(id); }

  evaluate(opportunities: Opportunity[], candidateId?: string, at = new Date().toISOString()): WatchMatch[] {
    const rules = this.listWatches(candidateId).filter(rule => rule.enabled);
    const matches: WatchMatch[] = [];
    for (const rule of rules) {
      const query = normalize(rule.query);
      for (const opportunity of opportunities) {
        if (opportunity.hardRejected) continue;
        const job = opportunity.job;
        const haystack = normalize(`${job.title} ${job.company} ${job.description} ${job.requirements.join(' ')}`);
        const reasons: string[] = [];
        if (query && !haystack.includes(query) && !query.split(/\s+/).every(token => haystack.includes(token))) continue;
        reasons.push('query matched');
        if (rule.targetTitles?.length && !rule.targetTitles.some(title => normalize(job.title).includes(normalize(title)))) continue;
        if (rule.targetTitles?.length) reasons.push('target title matched');
        if (rule.locations?.length && job.workMode !== 'remote' && !rule.locations.some(location => normalize(job.location).includes(normalize(location)))) continue;
        if (rule.locations?.length) reasons.push(job.workMode === 'remote' ? 'remote role satisfies location watch' : 'location matched');
        if (rule.workModes?.length && !rule.workModes.includes(job.workMode)) continue;
        if (rule.workModes?.length) reasons.push('work mode matched');
        if (rule.minimumSalary !== undefined && (job.salaryMax ?? job.salaryMin ?? 0) < rule.minimumSalary) continue;
        if (rule.minimumSalary !== undefined) reasons.push('compensation threshold met');
        if (rule.minimumFitScore !== undefined && opportunity.score.total < rule.minimumFitScore) continue;
        if (rule.minimumFitScore !== undefined) reasons.push('fit threshold met');
        matches.push({ watchId:rule.id, opportunityId:opportunity.id, matchedAt:at, reasons, fitScore:opportunity.score.total });
      }
    }
    return matches.sort((a,b) => b.fitScore-a.fitScore);
  }

  snapshot() { return { saved: this.listSaved(), watches: this.listWatches() }; }
}
