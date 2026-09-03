import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCareerSuccessContinuity, continuityFromStructuredContext } from '../src/career-success-continuity.js';

test('career continuity embeds a deterministic user-value plan', () => {
  const plan = buildCareerSuccessContinuity({
    message:'I have a job I want to apply to and I am missing stronger leadership proof.',
    targetCareer:'operations manager',
    materialGap:'leadership proof',
    milestones:[{kind:'proof',label:'operations evidence',verified:true},{kind:'application',label:'application stage',verified:true}],
    directAccessAvailable:true
  });
  assert.equal(plan.stage,'access');
  assert.equal(plan.userValue.audience,'candidate');
  assert.ok(plan.userValue.primary);
  assert.equal(plan.nextActions[0],plan.userValue.primary?.label);
  assert.match(plan.continuitySummary,/Highest-value next move/i);
});

test('offer stage recognizes compensation as first-class user value', () => {
  const plan = buildCareerSuccessContinuity({
    message:'I have an offer and want to negotiate the salary.',
    targetCareer:'operations manager',
    milestones:[{kind:'offer',label:'verified offer',verified:true}]
  });
  assert.equal(plan.stage,'offer');
  assert.ok(plan.userValue.ranked.some(item => item.kind === 'economic-upside'));
});

test('structured context can surface direct-access value without inventing an external action', () => {
  const plan = continuityFromStructuredContext('What should I do next?',{
    career:{ target:'nurse' },
    checkpoint:{ status:'referral available; application not yet submitted' }
  });
  assert.ok(plan.userValue.ranked.some(item => item.kind === 'opportunity-access'));
  assert.ok(plan.userValue.ranked.every(item => typeof item.expectedUserValue === 'number'));
});
