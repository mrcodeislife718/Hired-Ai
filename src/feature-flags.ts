import { createHash } from 'node:crypto';

export type FeatureFlagKey=
  |'decision-maker-graph'
  |'direct-introductions'
  |'distributed-rate-limit'
  |'transactional-outbox'
  |'otel-export'
  |'employer-durable-state';

export interface FeatureFlagRule { enabled:boolean; percentage?:number; allowAccounts?:string[]; denyAccounts?:string[]; }
export type FeatureFlagConfig=Partial<Record<FeatureFlagKey,FeatureFlagRule>>;

const hashPercent=(key:string)=>parseInt(createHash('sha256').update(key).digest('hex').slice(0,8),16)%100;

export class FeatureFlags {
  constructor(private readonly config:FeatureFlagConfig={}){}
  enabled(flag:FeatureFlagKey,accountId?:string){
    const rule=this.config[flag];if(!rule?.enabled)return false;
    if(accountId&&rule.denyAccounts?.includes(accountId))return false;
    if(accountId&&rule.allowAccounts?.includes(accountId))return true;
    const pct=Math.max(0,Math.min(100,rule.percentage??100));
    return pct===100||Boolean(accountId&&hashPercent(`${flag}:${accountId}`)<pct);
  }
  snapshot(){return structuredClone(this.config);}
  static fromEnv(value=process.env.HIRED_FEATURE_FLAGS){if(!value)return new FeatureFlags();try{return new FeatureFlags(JSON.parse(value) as FeatureFlagConfig);}catch{throw new Error('HIRED_FEATURE_FLAGS must be valid JSON');}}
}
