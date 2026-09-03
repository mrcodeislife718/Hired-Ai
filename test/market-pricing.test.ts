import test from 'node:test';
import assert from 'node:assert/strict';
import { candidateReferencePricing, employerReferencePricing, validatePremiumPricing } from '../src/market-pricing.js';

test('reference pricing stays premium and commercially coherent', () => {
  const result = validatePremiumPricing();
  assert.equal(result.valid, true, result.problems.join('; '));
  assert.deepEqual(candidateReferencePricing.map(tier => tier.monthlyUsd), [39, 59, 99]);
  assert.equal(employerReferencePricing[1].monthlyUsd, 499);
  assert.equal(employerReferencePricing[2].annualMinimumUsd, 24000);
  assert.equal(employerReferencePricing[0].placementFeePercent, 10);
});
