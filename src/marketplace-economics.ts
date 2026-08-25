export type RevenueSide = 'candidate' | 'employer' | 'marketplace' | 'enterprise' | 'infrastructure';
export type RevenueModel = 'subscription' | 'seat' | 'usage' | 'success-fee' | 'transaction-fee' | 'promotion' | 'service' | 'api';

export interface RevenueStream {
  id: string;
  side: RevenueSide;
  model: RevenueModel;
  name: string;
  payer: string;
  valueCreated: string;
  billingMetric: string;
  trustRule: string;
}

/**
 * Commercial surfaces are intentionally separated from ranking policy.
 * Revenue can buy workflow, reach, service, analytics or infrastructure,
 * but it must never silently buy a false fit signal from Maya.
 */
export const revenueStreams: RevenueStream[] = [
  {
    id: 'candidate-career', side: 'candidate', model: 'subscription', name: 'Career membership', payer: 'job seeker',
    valueCreated: 'continuous career intelligence, matching, readiness, resume and interview support',
    billingMetric: 'monthly membership', trustRule: 'never suppress a better organic opportunity to force an upgrade'
  },
  {
    id: 'candidate-pro', side: 'candidate', model: 'subscription', name: 'Pro acquisition membership', payer: 'job seeker',
    valueCreated: 'relationship intelligence, governed applications, follow-up, outcome learning and negotiation support',
    billingMetric: 'monthly membership', trustRule: 'identity-bearing actions remain approval-gated'
  },
  {
    id: 'candidate-concierge', side: 'candidate', model: 'service', name: 'Career concierge', payer: 'job seeker',
    valueCreated: 'high-touch review for major career transitions, interviews and offers',
    billingMetric: 'membership and/or reviewed engagement', trustRule: 'human review may improve judgment but may not invent qualifications'
  },
  {
    id: 'employer-talent', side: 'employer', model: 'subscription', name: 'Talent membership', payer: 'employer',
    valueCreated: 'evidence-backed candidate discovery, role calibration and hiring workflow',
    billingMetric: 'organization subscription', trustRule: 'candidate ranking remains evidence and fit based'
  },
  {
    id: 'employer-seats', side: 'employer', model: 'seat', name: 'Recruiter and hiring-team seats', payer: 'employer',
    valueCreated: 'shared search, shortlist, interview evidence and hiring collaboration',
    billingMetric: 'active hiring-team seat', trustRule: 'access follows organization permissions and audit policy'
  },
  {
    id: 'employer-sourcing', side: 'employer', model: 'success-fee', name: 'Verified talent sourcing', payer: 'employer',
    valueCreated: 'qualified candidate introductions that result in an agreed hiring outcome',
    billingMetric: 'verified successful hire or agreed milestone', trustRule: 'fee eligibility must be attributable and contractually defined'
  },
  {
    id: 'employer-promoted', side: 'employer', model: 'promotion', name: 'Promoted opportunities', payer: 'employer',
    valueCreated: 'clearly labeled additional reach to relevant audiences',
    billingMetric: 'campaign, impression, qualified engagement or budget', trustRule: 'promotion is labeled and cannot modify Maya organic fit/readiness scores'
  },
  {
    id: 'employer-brand', side: 'employer', model: 'subscription', name: 'Employer presence and talent brand', payer: 'employer',
    valueCreated: 'verified employer profile, culture evidence, compensation clarity and candidate communication',
    billingMetric: 'organization subscription', trustRule: 'employer claims remain attributable and challengeable'
  },
  {
    id: 'marketplace-interview', side: 'marketplace', model: 'transaction-fee', name: 'Hiring workflow services', payer: 'employer or participating service buyer',
    valueCreated: 'structured scheduling, assessment, verification and hiring coordination',
    billingMetric: 'completed paid workflow event', trustRule: 'paid workflow services do not alter evaluation evidence'
  },
  {
    id: 'enterprise-mobility', side: 'enterprise', model: 'subscription', name: 'Internal talent mobility', payer: 'enterprise',
    valueCreated: 'match existing employees to internal roles, growth paths and reskilling opportunities',
    billingMetric: 'employee population, seat or enterprise contract', trustRule: 'employee data remains tenant isolated and purpose limited'
  },
  {
    id: 'enterprise-intelligence', side: 'enterprise', model: 'subscription', name: 'Talent intelligence', payer: 'enterprise',
    valueCreated: 'skills supply, hiring-funnel, compensation and workforce planning analytics',
    billingMetric: 'enterprise contract', trustRule: 'analytics must use lawful, privacy-preserving and sufficiently aggregated data'
  },
  {
    id: 'api-matching', side: 'infrastructure', model: 'api', name: 'Career and talent intelligence API', payer: 'platform or enterprise',
    valueCreated: 'evidence matching, readiness, opportunity quality and career intelligence primitives',
    billingMetric: 'API usage and service tier', trustRule: 'API outputs carry provenance, confidence and policy metadata'
  },
  {
    id: 'verification', side: 'infrastructure', model: 'usage', name: 'Evidence and credential verification', payer: 'employer, candidate or partner depending on workflow',
    valueCreated: 'higher-confidence claims and lower hiring risk',
    billingMetric: 'verified item or verification bundle', trustRule: 'payment never guarantees a positive verification result'
  },
  {
    id: 'integration', side: 'enterprise', model: 'service', name: 'Enterprise integration and support', payer: 'enterprise',
    valueCreated: 'ATS/HRIS/identity/data integration, migration and operational support',
    billingMetric: 'implementation, support tier or contract', trustRule: 'integration authority is scoped and auditable'
  }
];

export function revenueBySide(side: RevenueSide) {
  return revenueStreams.filter(stream => stream.side === side);
}

export const marketplaceEconomicLaw = {
  northStar: 'maximize durable successful career matches, not application volume or paid ranking',
  candidateValue: 'better work, compensation, growth, fulfillment and career optionality',
  employerValue: 'better evidence, better fit, lower hiring waste, stronger retention and happier hiring outcomes',
  rankingFirewall: 'organic candidate/opportunity fit, readiness and fulfillment scores cannot be purchased',
  outcomePrinciple: 'monetization should expand when verified user and employer outcomes improve'
} as const;
