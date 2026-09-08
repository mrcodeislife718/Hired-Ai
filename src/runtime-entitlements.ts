import type { AccountRecord } from './accounts.js';
import type { EmployerSubscription } from './employer-platform.js';
import { canUseCapability, type CandidateAccessTier, type EmployerAccessTier } from './two-sided-capabilities.js';

export interface CapabilityDecision {
  allowed: boolean;
  audience: 'candidate'|'employer';
  accessTier: CandidateAccessTier|EmployerAccessTier;
  capabilityId: string;
}

export function candidateAccessTier(account:Pick<AccountRecord,'subscription'>):CandidateAccessTier {
  if(account.subscription.status!=='active')return 'free';
  return account.subscription.plan==='career'||account.subscription.plan==='pro'||account.subscription.plan==='concierge'?account.subscription.plan:'free';
}

export function employerAccessTier(subscription:EmployerSubscription):EmployerAccessTier {
  if(subscription.status!=='active')return 'free';
  return subscription.plan==='starter'||subscription.plan==='pro'||subscription.plan==='enterprise'?subscription.plan:'free';
}

export function candidateCapabilityDecision(account:Pick<AccountRecord,'subscription'>,capabilityId:string):CapabilityDecision {
  const accessTier=candidateAccessTier(account);
  return {allowed:canUseCapability('candidate',accessTier,capabilityId),audience:'candidate',accessTier,capabilityId};
}

export function employerCapabilityDecision(subscription:EmployerSubscription,capabilityId:string):CapabilityDecision {
  const accessTier=employerAccessTier(subscription);
  return {allowed:canUseCapability('employer',accessTier,capabilityId),audience:'employer',accessTier,capabilityId};
}
