export type PlanId = 'career' | 'pro' | 'concierge';

export interface CommercialPlan {
  id: PlanId;
  name: string;
  monthlyUsd: number;
  description: string;
  features: string[];
  checkoutUrl?: string;
}

const env = (key: string) => process.env[key]?.trim() || undefined;

export function commercialPlans(): CommercialPlan[] {
  return [
    {
      id: 'career',
      name: 'Career',
      monthlyUsd: 19,
      description: 'Maya for continuous career intelligence, job matching, resume modernization and interview preparation.',
      features: [
        'Conversational Maya career agent',
        'Selective opportunity matching',
        'Resume modernization and tailoring',
        'GitHub and professional-presence guidance',
        'Interview preparation',
        'Career-development plans'
      ],
      checkoutUrl: env('HIRED_CHECKOUT_CAREER')
    },
    {
      id: 'pro',
      name: 'Pro',
      monthlyUsd: 49,
      description: 'Maya with deeper relationship intelligence, governed acquisition workflows and continuous career optimization.',
      features: [
        'Everything in Career',
        'Relationship and networking intelligence',
        'Recruiter and hiring-manager path planning',
        'Governed application and outreach preparation',
        'Follow-up orchestration',
        'Outcome learning and conversion analysis',
        'Offer comparison and negotiation preparation'
      ],
      checkoutUrl: env('HIRED_CHECKOUT_PRO')
    },
    {
      id: 'concierge',
      name: 'Concierge',
      monthlyUsd: 149,
      description: 'High-touch career acceleration for users who want Maya plus human review of consequential career moves.',
      features: [
        'Everything in Pro',
        'Priority career review workflow',
        'Human-review handoff for high-impact decisions',
        'Deep portfolio and positioning review',
        'Priority interview and offer preparation'
      ],
      checkoutUrl: env('HIRED_CHECKOUT_CONCIERGE')
    }
  ];
}

export function planById(id: string): CommercialPlan | undefined {
  return commercialPlans().find(plan => plan.id === id);
}

export function checkoutReady() {
  const plans = commercialPlans();
  return {
    ready: plans.some(plan => Boolean(plan.checkoutUrl)),
    configuredPlans: plans.filter(plan => Boolean(plan.checkoutUrl)).map(plan => plan.id),
    missingPlans: plans.filter(plan => !plan.checkoutUrl).map(plan => plan.id)
  };
}
