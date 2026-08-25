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

  unsave(opportunityId: string) {
    return this.saved.delete(opportunityId);
  }

  listSaved() {
    return [...this.saved.values()].sort((a,b) => Date.parse(b.savedAt)-Date.parse(a.savedAt)).map(structuredClone);
  }

  upsertWatch(rule: OpportunityWatchRule) {
    if (!rule.id || !rule.candidateId || !rule.query.trim()) throw new Error('watch id, candidateId and query are required');
    if (rule.minimumFitScore !== undefined && (rule.minimumFitScore < 0 || rule.minimumFitScore > 100)) throw new Error('minimumFitScore must be between 0 and 100');
    const now = new Date().toISOString();
    const existing = this.watches.get(rule.id);
    const next = { ...structuredClone(rule), createdAt: existing?.createdAt ?? rule.createdAt ?? now, updatedAt: now };
    this.watches.set(rule.id, next);
    return structuredClone(next);
  }

  listWatches(candidateId?: string) {
    return [...this.watches.values()].filter(rule => !candidateId || rule.candidateId === candidateId).map(structuredClone);
  }

  removeWatch(id: string) { return this.watches.delete(id); }

  snapshot() { return { saved: this.listSaved(), watches: this.listWatches() }; }
}
