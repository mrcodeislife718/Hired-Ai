export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

interface Bucket { count: number; resetAt: number; }

export class SlidingWindowLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(private readonly limit: number, private readonly windowMs: number) {
    if (!Number.isFinite(limit) || limit < 1) throw new Error('rate limit must be positive');
    if (!Number.isFinite(windowMs) || windowMs < 1000) throw new Error('rate limit window must be at least 1 second');
  }

  consume(key: string, now = Date.now()): RateLimitResult {
    const normalized = key || 'anonymous';
    let bucket = this.buckets.get(normalized);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + this.windowMs };
      this.buckets.set(normalized, bucket);
    }
    bucket.count += 1;
    this.prune(now);
    return {
      allowed: bucket.count <= this.limit,
      remaining: Math.max(0, this.limit - bucket.count),
      resetAt: bucket.resetAt
    };
  }

  private prune(now: number) {
    if (this.buckets.size < 10_000) return;
    for (const [key, bucket] of this.buckets) if (bucket.resetAt <= now) this.buckets.delete(key);
  }
}
