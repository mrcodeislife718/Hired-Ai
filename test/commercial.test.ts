import test from 'node:test';
import assert from 'node:assert/strict';
import { checkoutReady, commercialCatalog, commercialPlans, hasPlan, planById, planRank } from '../src/commercial.js';

const catalog = {
  career: { amountMinor: 3200, currency: 'usd', interval: 'month', intervalCount: 1 },
  pro: { amountMinor: 8800, currency: 'usd', interval: 'month', intervalCount: 1 },
  concierge: { amountMinor: 240000, currency: 'usd', interval: 'year', intervalCount: 1 }
};

function withCatalog<T>(run: () => T): T {
  const previous = process.env.HIRED_COMMERCIAL_CATALOG_JSON;
  process.env.HIRED_COMMERCIAL_CATALOG_JSON = JSON.stringify(catalog);
  try { return run(); } finally {
    if (previous === undefined) delete process.env.HIRED_COMMERCIAL_CATALOG_JSON;
    else process.env.HIRED_COMMERCIAL_CATALOG_JSON = previous;
  }
}

test('commercial plans use configured economics rather than invented prices', () => withCatalog(() => {
  const plans = commercialPlans();
  assert.equal(plans.length, 3);
  assert.equal(new Set(plans.map(plan => plan.id)).size, plans.length);
  assert.ok(plans.every(plan => plan.price && plan.price.amountMinor > 0));
  assert.ok(plans.every(plan => plan.features.length >= 4));
  assert.equal(planById('career')?.monthlyUsd, 32);
  assert.equal(planById('pro')?.monthlyUsd, 88);
  assert.equal(planById('concierge')?.monthlyUsd, undefined);
  assert.equal(planById('concierge')?.price?.amountMinor, 240000);
}));

test('commercial catalog rejects missing and malformed economics', () => {
  const previous = process.env.HIRED_COMMERCIAL_CATALOG_JSON;
  delete process.env.HIRED_COMMERCIAL_CATALOG_JSON;
  assert.equal(commercialCatalog().configured, false);
  assert.ok(commercialCatalog().problems.length > 0);
  process.env.HIRED_COMMERCIAL_CATALOG_JSON = JSON.stringify({ career: { amountMinor: -1, currency: 'US dollars', interval: 'week' } });
  const invalid = commercialCatalog();
  assert.equal(invalid.configured, false);
  assert.ok(invalid.problems.length >= 3);
  if (previous === undefined) delete process.env.HIRED_COMMERCIAL_CATALOG_JSON;
  else process.env.HIRED_COMMERCIAL_CATALOG_JSON = previous;
});

test('plan lookup and rank preserve entitlement ordering independently of price', () => withCatalog(() => {
  assert.equal(planById('pro')?.name, 'Pro');
  assert.equal(planById('unknown'), undefined);
  assert.ok(planRank('concierge') > planRank('pro'));
  assert.ok(planRank('pro') > planRank('career'));
  assert.equal(planRank('none'), 0);
  assert.equal(hasPlan('pro', 'career'), true);
  assert.equal(hasPlan('career', 'pro'), false);
}));

test('checkout readiness fails closed without commercial or Stripe configuration', () => {
  const keys = ['HIRED_COMMERCIAL_CATALOG_JSON','STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','STRIPE_PRICE_CAREER','STRIPE_PRICE_PRO','STRIPE_PRICE_CONCIERGE','APP_URL'] as const;
  const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  for (const key of keys) delete process.env[key];
  const state = checkoutReady();
  assert.equal(state.ready, false);
  assert.equal(state.productionReady, false);
  assert.equal(state.commercialCatalogConfigured, false);
  assert.equal(state.configuredPlans.length, 0);
  assert.equal(state.missingPlans.length, 3);
  for (const key of keys) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

test('checkout readiness recognizes a fully intentional commercial configuration', () => {
  const keys = ['HIRED_COMMERCIAL_CATALOG_JSON','STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','STRIPE_PRICE_CAREER','STRIPE_PRICE_PRO','STRIPE_PRICE_CONCIERGE','APP_URL'] as const;
  const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  process.env.HIRED_COMMERCIAL_CATALOG_JSON = JSON.stringify(catalog);
  process.env.STRIPE_SECRET_KEY = 'sk_test_example';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_example';
  process.env.STRIPE_PRICE_CAREER = 'price_career';
  process.env.STRIPE_PRICE_PRO = 'price_pro';
  process.env.STRIPE_PRICE_CONCIERGE = 'price_concierge';
  process.env.APP_URL = 'https://hired.example';
  const state = checkoutReady();
  assert.equal(state.productionReady, true);
  assert.equal(state.commercialCatalogConfigured, true);
  assert.deepEqual(state.missingPlans, []);
  for (const key of keys) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});
