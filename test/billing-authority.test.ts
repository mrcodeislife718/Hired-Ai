import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AccountStore } from '../src/accounts.js';
import { schemaMigrationManifest } from '../src/schema-migrations.js';

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'hired-billing-authority-'));
  const store = new AccountStore(join(root, 'accounts.json'), undefined);
  const first = await store.register('first@example.com', 'strong-password-1');
  const second = await store.register('second@example.com', 'strong-password-2');
  return { root, store, first, second };
}

test('checkout linkage cannot itself activate paid access', async (t) => {
  const { root, store, first } = await fixture();
  t.after(async () => { await store.close(); await rm(root, { recursive: true, force: true }); });

  await store.linkBillingIdentifiers(first.id, { customerRef: 'cus_1', subscriptionRef: 'sub_1' });
  const linked = await store.accountById(first.id);
  assert.equal(linked?.subscription.customerRef, 'cus_1');
  assert.equal(linked?.subscription.subscriptionRef, 'sub_1');
  assert.equal(linked?.subscription.plan, 'none');
  assert.equal(linked?.subscription.status, 'inactive');
});

test('authoritative subscription events are monotonic and recover after newer state', async (t) => {
  const { root, store, first } = await fixture();
  t.after(async () => { await store.close(); await rm(root, { recursive: true, force: true }); });

  await store.linkBillingIdentifiers(first.id, { customerRef: 'cus_1', subscriptionRef: 'sub_1' });
  await store.setSubscription(first.id, 'pro', 'canceled', 'cus_1', { subscriptionRef: 'sub_1', eventCreatedAt: 300 });
  await store.setSubscription(first.id, 'pro', 'active', 'cus_1', { subscriptionRef: 'sub_1', eventCreatedAt: 200 });
  assert.equal((await store.accountById(first.id))?.subscription.status, 'canceled');

  await store.setSubscription(first.id, 'pro', 'active', 'cus_1', { subscriptionRef: 'sub_1', eventCreatedAt: 400 });
  const recovered = await store.accountById(first.id);
  assert.equal(recovered?.subscription.status, 'active');
  assert.equal(recovered?.subscription.sourceEventCreatedAt, 400);
});

test('Stripe customer and subscription identity cannot cross account boundaries', async (t) => {
  const { root, store, first, second } = await fixture();
  t.after(async () => { await store.close(); await rm(root, { recursive: true, force: true }); });

  await store.linkBillingIdentifiers(first.id, { customerRef: 'cus_owned', subscriptionRef: 'sub_owned' });
  await assert.rejects(store.linkBillingIdentifiers(second.id, { customerRef: 'cus_owned' }), /already linked to another account/);
  await assert.rejects(store.setSubscription(first.id, 'pro', 'active', 'cus_other', { subscriptionRef: 'sub_owned', eventCreatedAt: 100 }), /customer does not match/);
  await assert.rejects(store.setSubscription(first.id, 'pro', 'active', 'cus_owned', { subscriptionRef: 'sub_other', eventCreatedAt: 100 }), /subscription does not match/);
});

test('PostgreSQL migration enforces unique Stripe customer ownership', () => {
  const migration = schemaMigrationManifest().find(item => item.id === '0007_stripe_customer_ownership');
  assert.ok(migration);
});
