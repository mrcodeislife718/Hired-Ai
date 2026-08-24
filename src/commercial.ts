export type PlanId = 'career' | 'pro' | 'concierge';

export interface CommercialPlan {
  id: PlanId;
  name: string;
  monthlyUsd: number;
  description: string;
  features: string[];
  stripePriceId?: string;
  minimumPlanRank: number;
}

const env = (key: string) => process.env[key]?.trim() || undefined;

export function commercialPlans(): CommercialPlan[] {
  return [
    {
      id: 'career',
      name: 'Career',
      monthlyUsd: 19,
      description: 'Maya for continuous career intelligence, selective job matching, resume modernization and interview preparation.',
      minimumPlanRank: 1,
      features: [
        'Conversational Maya career agent',
        'Selective opportunity matching',
        'Resume modernization and tailoring',
        'GitHub and professional-presence guidance',
        'Interview preparation',
        'Career-development plans'
      ],
      stripePriceId: env('STRIPE_PRICE_CAREER')
    },
    {
      id: 'pro',
      name: 'Pro',
      monthlyUsd: 49,
      description: 'Maya with relationship intelligence, governed acquisition workflows and continuous career optimization.',
      minimumPlanRank: 2,
      features: [
        'Everything in Career',
        'Relationship and networking intelligence',
        'Recruiter and hiring-manager path planning',
        'Governed application and outreach preparation',
        'Follow-up orchestration',
        'Outcome learning and conversion analysis',
        'Offer comparison and negotiation preparation'
      ],
      stripePriceId: env('STRIPE_PRICE_PRO')
    },
    {
      id: 'concierge',
      name: 'Concierge',
      monthlyUsd: 149,
      description: 'High-touch career acceleration for users who want Maya plus human review of consequential career moves.',
      minimumPlanRank: 3,
      features: [
        'Everything in Pro',
        'Priority career review workflow',
        'Human-review handoff for high-impact decisions',
        'Deep portfolio and positioning review',
        'Priority interview and offer preparation'
      ],
      stripePriceId: env('STRIPE_PRICE_CONCIERGE')
    }
  ];
}

export function planById(id: string): CommercialPlan | undefined {
  return commercialPlans().find(plan => plan.id === id);
}

export function planRank(id: string | undefined): number {
  if (!id || id === 'none') return 0;
  return planById(id)?.minimumPlanRank ?? 0;
}

export function hasPlan(current: string | undefined, required: PlanId): boolean {
  return planRank(current) >= planRank(required);
}

export function checkoutReady() {
  const plans = commercialPlans();
  const stripeSecretConfigured = Boolean(env('STRIPE_SECRET_KEY'));
  const webhookSecretConfigured = Boolean(env('STRIPE_WEBHOOK_SECRET'));
  const appUrlConfigured = Boolean(env('APP_URL'));
  const configuredPlans = plans.filter(plan => Boolean(plan.stripePriceId)).map(plan => plan.id);
  const missingPlans = plans.filter(plan => !plan.stripePriceId).map(plan => plan.id);
  return {
    ready: stripeSecretConfigured && appUrlConfigured && configuredPlans.length > 0,
    productionReady: stripeSecretConfigured && webhookSecretConfigured && appUrlConfigured && missingPlans.length === 0,
    stripeSecretConfigured,
    webhookSecretConfigured,
    appUrlConfigured,
    configuredPlans,
    missingPlans
  };
}
