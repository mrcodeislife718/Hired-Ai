import test from 'node:test';
import assert from 'node:assert/strict';
import { checkoutReady, commercialPlans, planById } from '../src/commercial.js';

test('commercial plans are paid and uniquely identified', () => {
  const plans = commercialPlans();
  assert.ok(plans.length >= 2);
  assert.equal(new Set(plans.map(p => p.id)).size, plans.length);
  assert.ok(plans.every(p => p.monthlyUsd > 0));
  assert.ok(plans.every(p => p.features.length >= 4));
});

test('plan lookup returns the expected product', () => {
  const pro = planById('pro');
  assert.equal(pro?.name, 'Pro');
  assert.ok((pro?.monthlyUsd ?? 0) > 0);
  assert.equal(planById('unknown'), undefined);
});

test('checkout readiness does not claim configured payment collection without links', () => {
  const saved = {
    career: process.env.HIRED_CHECKOUT_CAREER,
    pro: process.env.HIRED_CHECKOUT_PRO,
    concierge: process.env.HIRED_CHECKOUT_CONCIERGE
  };
  delete process.env.HIRED_CHECKOUT_CAREER;
  delete process.env.HIRED_CHECKOUT_PRO;
  delete process.env.HIRED_CHECKOUT_CONCIERGE;
  const state = checkoutReady();
  assert.equal(state.ready, false);
  assert.equal(state.configuredPlans.length, 0);
  assert.equal(state.missingPlans.length, 3);
  if (saved.career) process.env.HIRED_CHECKOUT_CAREER = saved.career;
  if (saved.pro) process.env.HIRED_CHECKOUT_PRO = saved.pro;
  if (saved.concierge) process.env.HIRED_CHECKOUT_CONCIERGE = saved.concierge;
});
