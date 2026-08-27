export type ReliabilityEvent = {
  operation: string;
  startedAt: number;
  finishedAt?: number;
  success?: boolean;
  retries?: number;
  degraded?: boolean;
  recovered?: boolean;
  costUsd?: number;
  modelCalls?: number;
  cacheHits?: number;
  cacheMisses?: number;
};

export type ReliabilitySnapshot = {
  operations: number;
  failures: number;
  degraded: number;
  recoveries: number;
  modelCalls: number;
  cacheHitRate: number;
  totalCostUsd: number;
  costPerSuccessfulOperation: number;
};

export class ReliabilityEfficiencyLedger {
  private readonly events: ReliabilityEvent[] = [];

  record(event: ReliabilityEvent): void {
    if (!event.operation) throw new Error('operation is required');
    if (event.finishedAt !== undefined && event.finishedAt < event.startedAt) throw new Error('finishedAt cannot precede startedAt');
    this.events.push({ ...event });
  }

  snapshot(): ReliabilitySnapshot {
    const operations = this.events.length;
    const failures = this.events.filter((event) => event.success === false).length;
    const degraded = this.events.filter((event) => event.degraded).length;
    const recoveries = this.events.filter((event) => event.recovered).length;
    const modelCalls = this.events.reduce((sum, event) => sum + (event.modelCalls ?? 0), 0);
    const cacheHits = this.events.reduce((sum, event) => sum + (event.cacheHits ?? 0), 0);
    const cacheMisses = this.events.reduce((sum, event) => sum + (event.cacheMisses ?? 0), 0);
    const totalCostUsd = this.events.reduce((sum, event) => sum + (event.costUsd ?? 0), 0);
    const successes = operations - failures;
    return {
      operations,
      failures,
      degraded,
      recoveries,
      modelCalls,
      cacheHitRate: cacheHits + cacheMisses === 0 ? 0 : cacheHits / (cacheHits + cacheMisses),
      totalCostUsd,
      costPerSuccessfulOperation: successes === 0 ? 0 : totalCostUsd / successes,
    };
  }
}

export async function executeReliably<T>(options: {
  operation: string;
  primary: () => Promise<T>;
  fallback?: () => Promise<T>;
  verify?: (value: T) => boolean | Promise<boolean>;
  retries?: number;
  ledger?: ReliabilityEfficiencyLedger;
}): Promise<T> {
  const startedAt = Date.now();
  const retries = Math.max(0, options.retries ?? 1);
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const value = await options.primary();
      if (options.verify && !(await options.verify(value))) throw new Error('verification failed');
      options.ledger?.record({ operation: options.operation, startedAt, finishedAt: Date.now(), success: true, retries: attempt });
      return value;
    } catch (error) {
      lastError = error;
    }
  }
  if (options.fallback) {
    const value = await options.fallback();
    if (options.verify && !(await options.verify(value))) throw new Error('fallback verification failed');
    options.ledger?.record({ operation: options.operation, startedAt, finishedAt: Date.now(), success: true, degraded: true, recovered: true, retries });
    return value;
  }
  options.ledger?.record({ operation: options.operation, startedAt, finishedAt: Date.now(), success: false, retries });
  throw lastError instanceof Error ? lastError : new Error('operation failed');
}

export function shouldReuseStableCareerState(input: { ageMs: number; ttlMs: number; evidenceVersionChanged: boolean }): boolean {
  return !input.evidenceVersionChanged && input.ageMs >= 0 && input.ageMs <= input.ttlMs;
}
