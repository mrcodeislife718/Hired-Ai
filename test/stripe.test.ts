import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { accountIdFromMetadata, parseStripeEvent, planFromMetadata, subscriptionState, verifyStripeSignature } from '../src/stripe.js';

test('Stripe webhook signatures verify and reject tampering', () => {
  const previous = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
  const payload = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed', created: 1, data: { object: {} } });
  const timestamp = 1_700_000_000;
  const signature = createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET).update(`${timestamp}.${payload}`).digest('hex');
  assert.equal(verifyStripeSignature(payload, `t=${timestamp},v1=${signature}`, timestamp), true);
  assert.throws(() => verifyStripeSignature(`${payload}x`, `t=${timestamp},v1=${signature}`, timestamp), /invalid Stripe webhook signature/);
  const event = parseStripeEvent(payload, `t=${Math.floor(Date.now()/1000)},v1=${createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET).update(`${Math.floor(Date.now()/1000)}.${payload}`).digest('hex')}`);
  assert.equal(event.id, 'evt_1');
  if (previous) process.env.STRIPE_WEBHOOK_SECRET = previous; else delete process.env.STRIPE_WEBHOOK_SECRET;
});

test('Stripe subscription states and metadata fail closed', () => {
  assert.equal(subscriptionState('active'), 'active');
  assert.equal(subscriptionState('trialing'), 'active');
  assert.equal(subscriptionState('past_due'), 'past_due');
  assert.equal(subscriptionState('canceled'), 'canceled');
  assert.equal(subscriptionState('mystery'), 'inactive');
  assert.equal(planFromMetadata({ plan: 'pro' }), 'pro');
  assert.equal(planFromMetadata({ plan: 'enterprise' }), 'none');
  assert.equal(accountIdFromMetadata({ account_id: 'acct_123' }), 'acct_123');
});
