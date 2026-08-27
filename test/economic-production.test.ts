import test from 'node:test';
import assert from 'node:assert/strict';
import { MayaEconomicProductionLedger, mayaEconomicProductionGate } from '../src/economic-production.js';

test('Maya economic production requires repeatable paid outcomes and positive contribution', () => {
  const ledger = new MayaEconomicProductionLedger();
  for (let i = 0; i < 10; i += 1) {
    const userId = `u${i}`;
    ledger.record({ type: 'paid_user', userId });
    ledger.record({ type: 'interview', userId });
    ledger.record({ type: 'revenue', userId, amountUsd: 100 });
    ledger.record({ type: 'delivery_cost', userId, amountUsd: 20 });
  }
  const result = mayaEconomicProductionGate(ledger.metrics());
  assert.equal(result.productive, true);
  assert.equal(result.metrics.paidUsers, 10);
  assert.equal(result.metrics.grossContributionUsd, 800);
});
