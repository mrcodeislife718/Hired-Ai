import test from 'node:test';
import assert from 'node:assert/strict';
import { employerGrowthPlan, validateGrowthPlan } from '../src/employer-growth-pricing.js';
import { buildGigCareerPlan } from '../src/gig-career.js';
import { chooseSupportMode } from '../src/maya-support-mode.js';

test('growth plan stays premium and uses annual commitment pricing',()=>{
  assert.equal(validateGrowthPlan().valid,true);
  assert.equal(employerGrowthPlan.monthlyUsd,599);
  assert.equal(employerGrowthPlan.annualBillingMonthlyEquivalentUsd,479);
  assert.equal(employerGrowthPlan.annualUsd,5748);
});

test('gig pathway converts completed work into portable career evidence',()=>{
  const plan=buildGigCareerPlan({workerId:'g1',services:['delivery'],platforms:['one-platform'],transitionTarget:'logistics coordinator'},[{service:'delivery',completedJobs:120,repeatCustomers:9,verified:true}]);
  assert.ok(plan.currentProof.some(item=>item.includes('120 verified')));
  assert.ok(plan.incomeRisks.some(item=>item.includes('single marketplace')));
  assert.match(plan.transitionBridge??'',/logistics coordinator/i);
});

test('Maya can deliberately enter truthful cheerleader mode',()=>{
  const plan=chooseSupportMode({message:"I'm scared and I don't think I can do this",verifiedWins:['passed two practice interviews'],highStakesEventSoon:true});
  assert.equal(plan.mode,'cheerleader');
  assert.ok(plan.moves.some(move=>move.includes('in the user’s corner')));
  assert.ok(plan.moves.some(move=>move.includes('passed two practice interviews')));
});
