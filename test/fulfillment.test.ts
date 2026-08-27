import test from 'node:test';
import assert from 'node:assert/strict';
import { assessEmployerHiringOutcome, assessFulfillment } from '../src/fulfillment.js';

test('rewards role experience alignment beyond technical fit', () => {
  const result = assessFulfillment({
    desiredWorkModes:['remote'], minimumBaseSalary:150000, targetBaseSalary:180000,
    preferredResponsibilities:['backend systems','ai infrastructure'], dislikedResponsibilities:['cold sales'],
    desiredGrowth:['technical leadership'], desiredValues:['ownership'], desiredIndustries:['software'],
    desiredImpact:['build products'], managementPreferences:['high trust'], pacePreference:'fast', autonomyPreference:'high',
    locationPreferences:['New York']
  }, {
    workMode:'remote', salaryMin:180000, salaryMax:220000,
    responsibilities:['backend systems','ai infrastructure'], growthSignals:['technical leadership'], values:['ownership'], industry:'software',
    impactSignals:['build products'], managementSignals:['high trust'], pace:'fast', autonomy:'high', location:'Remote - US'
  });
  assert.equal(result.recommendation, 'strong-fit');
  assert.ok(result.score >= 90);
});

test('flags a role the candidate is likely to dislike even when pay is acceptable', () => {
  const result = assessFulfillment({
    desiredWorkModes:['remote'], minimumBaseSalary:100000,
    preferredResponsibilities:['software engineering'], dislikedResponsibilities:['cold sales','quota prospecting'],
    desiredGrowth:[], desiredValues:[], desiredIndustries:[], desiredImpact:[], managementPreferences:[], locationPreferences:[]
  }, {
    workMode:'remote', salaryMin:140000, salaryMax:160000,
    responsibilities:['cold sales','quota prospecting'], growthSignals:[], values:[], impactSignals:[], managementSignals:[], location:'Remote'
  });
  assert.ok(result.concerns.some(item => item.includes('disliked work')));
  assert.ok(result.dimensions.workContent < 60);
});

test('employer outcome rewards capability, evidence, fulfillment and retention together', () => {
  const result = assessEmployerHiringOutcome({ roleSuccessScore:92, evidenceConfidence:95, fulfillmentScore:88, retentionSignals:84 });
  assert.ok(result.overall >= 85);
  assert.equal(result.explanation.length, 4);
});
