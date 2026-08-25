export type CareerFactSource = 'user' | 'verified-evidence' | 'outcome' | 'employer' | 'inference';
export type CareerFactConfidence = 'confirmed' | 'high' | 'medium' | 'low';

export interface CareerFact<T = unknown> {
  key: string;
  value: T;
  source: CareerFactSource;
  confidence: CareerFactConfidence;
  evidenceIds: string[];
  observedAt: string;
  supersedes?: string;
}

export interface CareerTwinSnapshot {
  candidateId: string;
  version: number;
  goals: CareerFact<string[]>;
  strengths: CareerFact<string[]>;
  growthAreas: CareerFact<string[]>;
  preferredWork: CareerFact<string[]>;
  dislikedWork: CareerFact<string[]>;
  values: CareerFact<string[]>;
  compensation: CareerFact<{ minimum?: number; target?: number; currency?: string }>;
  trajectory: CareerFact<{ current?: string; desired?: string }>;
  constraints: CareerFact<string[]>;
  facts: CareerFact[];
  updatedAt: string;
}

const now = () => new Date().toISOString();
const initial = <T>(key: string, value: T): CareerFact<T> => ({ key, value, source:'user', confidence:'confirmed', evidenceIds:[], observedAt:now() });

export class CareerTwin {
  private snapshot: CareerTwinSnapshot;

  constructor(candidateId: string) {
    this.snapshot = {
      candidateId,
      version: 1,
      goals: initial('goals', []),
      strengths: initial('strengths', []),
      growthAreas: initial('growthAreas', []),
      preferredWork: initial('preferredWork', []),
      dislikedWork: initial('dislikedWork', []),
      values: initial('values', []),
      compensation: initial('compensation', {}),
      trajectory: initial('trajectory', {}),
      constraints: initial('constraints', []),
      facts: [],
      updatedAt: now()
    };
  }

  current(): CareerTwinSnapshot { return structuredClone(this.snapshot); }

  update<K extends keyof Pick<CareerTwinSnapshot,'goals'|'strengths'|'growthAreas'|'preferredWork'|'dislikedWork'|'values'|'compensation'|'trajectory'|'constraints'>>(
    key: K,
    fact: CareerTwinSnapshot[K]
  ) {
    if (fact.source === 'inference' && fact.confidence === 'confirmed') throw new Error('inference cannot be marked confirmed');
    const previous = this.snapshot[key] as CareerFact;
    const next = { ...fact, supersedes: previous.observedAt } as CareerTwinSnapshot[K];
    this.snapshot = { ...this.snapshot, [key]: next, version: this.snapshot.version + 1, updatedAt: now() };
    return this.current();
  }

  addFact(fact: CareerFact) {
    if (fact.source === 'inference' && fact.confidence === 'confirmed') throw new Error('inference cannot be marked confirmed');
    this.snapshot.facts = [...this.snapshot.facts, structuredClone(fact)];
    this.snapshot.version += 1;
    this.snapshot.updatedAt = now();
    return this.current();
  }
}
