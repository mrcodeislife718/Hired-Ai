export interface CandidatePriceTier {
  id: 'career' | 'pro' | 'concierge';
  name: string;
  monthlyUsd: number;
  annualUsd: number;
  positioning: string;
}

export interface EmployerPriceTier {
  id: 'starter' | 'pro' | 'enterprise';
  name: string;
  monthlyUsd?: number;
  annualMinimumUsd?: number;
  placementFeePercent?: number;
  includes: string[];
}

/**
 * Premium-but-market-comparable reference pricing. Stripe remains the billing authority;
 * production catalog values are supplied through HIRED_COMMERCIAL_CATALOG_JSON.
 */
export const candidateReferencePricing: readonly CandidatePriceTier[] = [
  { id: 'career', name: 'Career', monthlyUsd: 39, annualUsd: 390, positioning: 'full career operating system' },
  { id: 'pro', name: 'Maya Pro', monthlyUsd: 59, annualUsd: 590, positioning: 'active career acquisition and advanced interview/negotiation support' },
  { id: 'concierge', name: 'Concierge', monthlyUsd: 99, annualUsd: 990, positioning: 'high-touch review for consequential career moves' }
];

export const employerReferencePricing: readonly EmployerPriceTier[] = [
  {
    id: 'starter', name: 'Employer Starter', monthlyUsd: 249, placementFeePercent: 10,
    includes: ['role intake','candidate search','structured scorecards','limited verified assessments','direct introductions']
  },
  {
    id: 'pro', name: 'Employer Pro', monthlyUsd: 499, placementFeePercent: 10,
    includes: ['everything in Starter','AI interviewer','custom assessments','verified badges','collaborative hiring workflow','outcome analytics']
  },
  {
    id: 'enterprise', name: 'Enterprise', annualMinimumUsd: 24000, placementFeePercent: 10,
    includes: ['everything in Pro','SSO','RBAC','audit logs','ATS integrations','custom assessment programs','private controls','SLAs','workforce analytics']
  }
];

export function validatePremiumPricing(candidate = candidateReferencePricing, employer = employerReferencePricing) {
  const problems: string[] = [];
  for (let i = 1; i < candidate.length; i += 1) {
    if (candidate[i].monthlyUsd <= candidate[i - 1].monthlyUsd) problems.push('candidate tiers must increase in price');
  }
  for (const tier of candidate) {
    if (tier.monthlyUsd < 29) problems.push(`${tier.id} is below the intended premium competitive band`);
    if (tier.annualUsd >= tier.monthlyUsd * 12) problems.push(`${tier.id} annual pricing should reward commitment without becoming the cheapest offer`);
  }
  for (const tier of employer) {
    if (tier.placementFeePercent !== undefined && (tier.placementFeePercent < 8 || tier.placementFeePercent > 20)) problems.push(`${tier.id} placement economics are outside the chosen market band`);
  }
  return { valid: problems.length === 0, problems };
}
