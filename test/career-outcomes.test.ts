import test from 'node:test';
import assert from 'node:assert/strict';
import { CareerOutcomeLedger, enforceRecommendationPolicy, MAYA_PRODUCT_LAWS } from '../src/career-outcomes.js';

test('paid promotion never changes organic ranking score', () => {
  const organic = enforceRecommendationPolicy({ organicFitScore: 82, readinessScore: 88, fulfillmentScore: 91, reliabilityConfidence: 95, explanation: ['evidence backed'] });
  const sponsored = enforceRecommendationPolicy({ organicFitScore: 82, readinessScore: 88, fulfillmentScore: 91, reliabilityConfidence: 95, sponsored: true, paidBoost: 1000, explanation: ['evidence backed'] });
  assert.equal(sponsored.organicScore, organic.organicScore);
  assert.equal(sponsored.rankingScore, organic.rankingScore);
  assert.equal(sponsored.paidBoostIgnored, 1000);
  assert.equal(sponsored.sponsored, true);
});

test('career outcome ledger measures candidate and employer regret independently', () => {
  const ledger = new CareerOutcomeLedger();
  ledger.record({ id:'o1', candidateId:'c1', checkpoint:'day-30', at:new Date().toISOString(), candidateSatisfaction:90, employerSatisfaction:95, wouldCandidateChooseAgain:true, wouldEmployerChooseAgain:true });
  ledger.record({ id:'o2', candidateId:'c1', checkpoint:'day-90', at:new Date().toISOString(), candidateSatisfaction:40, employerSatisfaction:85, wouldCandidateChooseAgain:false, wouldEmployerChooseAgain:true, regretReason:'work content mismatch' });
  const summary = ledger.summary('c1');
  assert.equal(summary.candidateRegretRate, 50);
  assert.equal(summary.employerRegretRate, 0);
  assert.equal(summary.averageCandidateSatisfaction, 65);
  assert.equal(summary.averageEmployerSatisfaction, 90);
});

test('Maya product laws include lifetime optimization and equal baseline care', () => {
  assert.ok(MAYA_PRODUCT_LAWS.includes('optimize-for-a-lifetime-not-a-single-job'));
  assert.ok(MAYA_PRODUCT_LAWS.includes('free-users-get-the-same-baseline-truth-respect-and-care'));
  assert.ok(MAYA_PRODUCT_LAWS.includes('no-pay-to-win-organic-ranking'));
});
