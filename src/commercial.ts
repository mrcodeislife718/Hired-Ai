export type PlanId = 'career' | 'pro' | 'concierge';
export type BillingInterval = 'month' | 'year';

export interface CommercialPrice {
  amountMinor: number;
  currency: string;
  interval: BillingInterval;
  intervalCount: number;
}

export interface CommercialPlan {
  id: PlanId;
  name: string;
  /** Backward-compatible projection for USD/month plans. Undefined for other currencies/intervals or unconfigured plans. */
  monthlyUsd?: number;
  price?: CommercialPrice;
  description: string;
  features: string[];
  stripePriceId?: string;
  minimumPlanRank: number;
  commercialConfigured: boolean;
}

export interface CommercialCatalogState {
  prices: Partial<Record<PlanId, CommercialPrice>>;
  problems: string[];
  configured: boolean;
}

const PLAN_IDS: readonly PlanId[] = ['career', 'pro', 'concierge'];
const env = (key: string) => process.env[key]?.trim() || undefined;
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

function parsePrice(planId: PlanId, value: unknown, problems: string[]): CommercialPrice | undefined {
  if (!isRecord(value)) {
    problems.push(`${planId} price must be an object`);
    return undefined;
  }
  const amountMinor = value.amountMinor;
  const currency = typeof value.currency === 'string' ? value.currency.trim().toLowerCase() : '';
  const interval = value.interval;
  const intervalCount = value.intervalCount === undefined ? 1 : value.intervalCount;
  if (typeof amountMinor !== 'number' || !Number.isInteger(amountMinor) || amountMinor <= 0) problems.push(`${planId}.amountMinor must be a positive integer`);
  if (!/^[a-z]{3}$/.test(currency)) problems.push(`${planId}.currency must be a three-letter currency code`);
  if (interval !== 'month' && interval !== 'year') problems.push(`${planId}.interval must be month or year`);
  if (typeof intervalCount !== 'number' || !Number.isInteger(intervalCount) || intervalCount <= 0) problems.push(`${planId}.intervalCount must be a positive integer`);
  if (problems.some(problem => problem.startsWith(`${planId}.`))) return undefined;
  return { amountMinor: amountMinor as number, currency, interval: interval as BillingInterval, intervalCount: intervalCount as number };
}

export function commercialCatalog(): CommercialCatalogState {
  const raw = env('HIRED_COMMERCIAL_CATALOG_JSON');
  if (!raw) return { prices: {}, problems: ['HIRED_COMMERCIAL_CATALOG_JSON is not configured'], configured: false };
  const problems: string[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { prices: {}, problems: ['HIRED_COMMERCIAL_CATALOG_JSON is not valid JSON'], configured: false };
  }
  if (!isRecord(parsed)) return { prices: {}, problems: ['HIRED_COMMERCIAL_CATALOG_JSON must be an object keyed by plan id'], configured: false };
  for (const key of Object.keys(parsed)) if (!PLAN_IDS.includes(key as PlanId)) problems.push(`unknown commercial plan: ${key}`);
  const prices: Partial<Record<PlanId, CommercialPrice>> = {};
  for (const planId of PLAN_IDS) {
    if (!(planId in parsed)) {
      problems.push(`${planId} price is not configured`);
      continue;
    }
    const price = parsePrice(planId, parsed[planId], problems);
    if (price) prices[planId] = price;
  }
  return { prices, problems, configured: problems.length === 0 && PLAN_IDS.every(id => Boolean(prices[id])) };
}

function monthlyUsd(price: CommercialPrice | undefined): number | undefined {
  return price?.currency === 'usd' && price.interval === 'month' && price.intervalCount === 1 ? price.amountMinor / 100 : undefined;
}

export function commercialPlans(): CommercialPlan[] {
  const catalog = commercialCatalog();
  const structural: Array<Omit<CommercialPlan, 'price' | 'monthlyUsd' | 'stripePriceId' | 'commercialConfigured'>> = [
    {
      id: 'career',
      name: 'Career',
      description: 'Continuous career intelligence, selective job matching, professional presence, resumes and interview preparation.',
      minimumPlanRank: 1,
      features: [
        'Conversational career intelligence',
        'Selective opportunity matching and career-path exploration',
        'Company, role and compensation intelligence',
        'Targeted resume variants and ATS-safe templates',
        'Resume modernization, evidence audit and tailoring',
        'GitHub and technical-portfolio organization guidance',
        'LinkedIn and professional-social positioning',
        'Professional networking plan',
        'Role-specific interview practice and feedback',
        'Career-development and readiness plans'
      ]
    },
    {
      id: 'pro',
      name: 'Pro',
      description: 'Relationship intelligence, governed acquisition workflows, advanced resume tooling, negotiation and continuous career optimization.',
      minimumPlanRank: 2,
      features: [
        'Everything in Career',
        'Executive Signature and Creative Editorial resume templates',
        'Multi-role resume portfolio and application-specific variants',
        'Advanced positioning, gap analysis and evidence prioritization',
        'Relationship and networking intelligence',
        'Recruiter and hiring-manager path planning',
        'Governed application and outreach preparation',
        'Follow-up orchestration and messaging strategy',
        'Advanced interview simulation across recruiter, behavioral, technical and role rounds',
        'Offer comparison, total-compensation analysis and negotiation preparation',
        'Outcome learning and conversion analysis'
      ]
    },
    {
      id: 'concierge',
      name: 'Concierge',
      description: 'High-touch career acceleration with human review of consequential career moves, positioning, interviews and offers.',
      minimumPlanRank: 3,
      features: [
        'Everything in Pro',
        'Human-review workflow for high-stakes resumes and career moves',
        'Priority editorial refinement and executive positioning',
        'Deep portfolio, GitHub and professional-presence review',
        'Priority interview and offer negotiation review',
        'High-stakes career-transition and decision review'
      ]
    }
  ];
  return structural.map(plan => {
    const price = catalog.prices[plan.id];
    const stripePriceId = env(`STRIPE_PRICE_${plan.id.toUpperCase()}`);
    return {
      ...plan,
      price,
      monthlyUsd: monthlyUsd(price),
      stripePriceId,
      commercialConfigured: Boolean(price && stripePriceId)
    };
  });
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
  const catalog = commercialCatalog();
  const stripeSecretConfigured = Boolean(env('STRIPE_SECRET_KEY'));
  const webhookSecretConfigured = Boolean(env('STRIPE_WEBHOOK_SECRET'));
  const appUrlConfigured = Boolean(env('APP_URL'));
  const configuredPlans = plans.filter(plan => plan.commercialConfigured).map(plan => plan.id);
  const missingPlans = plans.filter(plan => !plan.commercialConfigured).map(plan => plan.id);
  return {
    ready: stripeSecretConfigured && appUrlConfigured && catalog.problems.length === 0 && configuredPlans.length > 0,
    productionReady: stripeSecretConfigured && webhookSecretConfigured && appUrlConfigured && catalog.configured && missingPlans.length === 0,
    stripeSecretConfigured,
    webhookSecretConfigured,
    appUrlConfigured,
    commercialCatalogConfigured: catalog.configured,
    catalogProblems: catalog.problems,
    configuredPlans,
    missingPlans
  };
}
