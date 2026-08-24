import test from 'node:test';
import assert from 'node:assert/strict';
import { checkoutReady, commercialPlans, hasPlan, planById, planRank } from '../src/commercial.js';

test('commercial plans are paid and uniquely identified', () => {
  const plans = commercialPlans();
  assert.equal(plans.length, 3);
  assert.equal(new Set(plans.map(plan => plan.id)).size, plans.length);
  assert.ok(plans.every(plan => plan.monthlyUsd > 0));
  assert.ok(plans.every(plan => plan.features.length >= 4));
});

test('plan lookup and rank preserve entitlement ordering', () => {
  assert.equal(planById('pro')?.name, 'Pro');
  assert.equal(planById('unknown'), undefined);
  assert.ok(planRank('concierge') > planRank('pro'));
  assert.ok(planRank('pro') > planRank('career'));
  assert.equal(planRank('none'), 0);
  assert.equal(hasPlan('pro', 'career'), true);
  assert.equal(hasPlan('career', 'pro'), false);
});

test('checkout readiness fails closed without Stripe configuration', () => {
  const keys = ['STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','STRIPE_PRICE_CAREER','STRIPE_PRICE_PRO','STRIPE_PRICE_CONCIERGE','APP_URL'] as const;
  const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  for (const key of keys) delete process.env[key];
  const state = checkoutReady();
  assert.equal(state.ready, false);
  assert.equal(state.productionReady, false);
  assert.equal(state.configuredPlans.length, 0);
  assert.equal(state.missingPlans.length, 3);
  for (const key of keys) if (saved[key]) process.env[key] = saved[key];
});
