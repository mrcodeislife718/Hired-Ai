export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export interface AsyncRateLimiter { consume(key:string,now?:number):Promise<RateLimitResult>; close?():Promise<void>; }
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
    return { allowed: bucket.count <= this.limit, remaining: Math.max(0, this.limit - bucket.count), resetAt: bucket.resetAt };
  }

  private prune(now: number) {
    if (this.buckets.size < 10_000) return;
    for (const [key, bucket] of this.buckets) if (bucket.resetAt <= now) this.buckets.delete(key);
  }
}

/**
 * Cross-instance limiter for production action budgets. Uses one atomic UPSERT
 * per key/window so horizontally scaled workers enforce the same budget.
 */
export class PostgresFixedWindowLimiter implements AsyncRateLimiter {
  private poolPromise?:Promise<import('pg').Pool>;
  private migrated=false;
  constructor(private readonly connectionString:string,private readonly limit:number,private readonly windowMs:number,private readonly namespace='api'){
    if(!connectionString)throw new Error('DATABASE_URL is required');
    if(!Number.isFinite(limit)||limit<1)throw new Error('rate limit must be positive');
    if(!Number.isFinite(windowMs)||windowMs<1000)throw new Error('rate limit window must be at least 1 second');
  }
  private pool(){return this.poolPromise??=import('pg').then(({Pool})=>new Pool({connectionString:this.connectionString,max:4}));}
  private async migrate(){if(this.migrated)return;await(await this.pool()).query(`create table if not exists hired_rate_limits(namespace text not null,key text not null,window_start bigint not null,count integer not null,updated_at timestamptz not null default now(),primary key(namespace,key,window_start))`);this.migrated=true;}
  async consume(key:string,now=Date.now()):Promise<RateLimitResult>{
    await this.migrate();
    const normalized=key||'anonymous';
    const windowStart=Math.floor(now/this.windowMs)*this.windowMs;
    const result=await(await this.pool()).query<{count:number}>(`insert into hired_rate_limits(namespace,key,window_start,count,updated_at) values($1,$2,$3,1,now()) on conflict(namespace,key,window_start) do update set count=hired_rate_limits.count+1,updated_at=now() returning count`,[this.namespace,normalized,windowStart]);
    const count=Number(result.rows[0]?.count??1);
    if(Math.random()<0.01)void(await this.pool()).query('delete from hired_rate_limits where window_start < $1',[windowStart-this.windowMs*2]).catch(()=>undefined);
    return{allowed:count<=this.limit,remaining:Math.max(0,this.limit-count),resetAt:windowStart+this.windowMs};
  }
  async close(){if(this.poolPromise)await(await this.poolPromise).end();}
}
