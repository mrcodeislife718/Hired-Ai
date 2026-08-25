import test from 'node:test';
import assert from 'node:assert/strict';
import { DeliveryLedger } from '../src/delivery-ledger.js';

test('external delivery is not confirmed until verified receipt', () => {
  const ledger = new DeliveryLedger();
  const at = new Date().toISOString();
  ledger.record({ id:'e1', actionId:'a1', state:'prepared', at });
  ledger.record({ id:'e2', actionId:'a1', state:'approved', at });
  ledger.record({ id:'e3', actionId:'a1', state:'dispatched', at, provider:'email' });
  assert.equal(ledger.isConfirmed('a1'), false);
  ledger.record({ id:'e4', actionId:'a1', state:'provider-acknowledged', at, provider:'email', providerMessageId:'msg-1' });
  assert.equal(ledger.isConfirmed('a1'), false);
  ledger.record({ id:'e5', actionId:'a1', state:'verified-received', at, provider:'email', providerMessageId:'msg-1' });
  assert.equal(ledger.isConfirmed('a1'), true);
});

test('provider acknowledgement cannot be fabricated without provider id', () => {
  const ledger = new DeliveryLedger();
  const at = new Date().toISOString();
  ledger.record({ id:'e1', actionId:'a1', state:'prepared', at });
  ledger.record({ id:'e2', actionId:'a1', state:'approved', at });
  ledger.record({ id:'e3', actionId:'a1', state:'dispatched', at });
  assert.throws(() => ledger.record({ id:'e4', actionId:'a1', state:'provider-acknowledged', at }), /providerMessageId/);
});
