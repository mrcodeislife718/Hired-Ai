import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCareerSuccessContinuity, continuityFromStructuredContext } from '../src/career-success-continuity.js';

test('preserves end-to-end continuity from dream through employment and advancement', () => {
  const dream = buildCareerSuccessContinuity({message:'I want a better career',targetCareer:'Registered Nurse'});
  assert.equal(dream.stage,'readiness');
  assert.equal(dream.nextStage,'proof');

  const proof = buildCareerSuccessContinuity({
    message:'I passed the assessment and finished my certification',targetCareer:'Registered Nurse',
    milestones:[{kind:'goal',label:'Registered Nurse',verified:false},{kind:'proof',label:'assessment',verified:true}]
  });
  assert.equal(proof.stage,'proof');
  assert.equal(proof.nextStage,'access');

  const interview = buildCareerSuccessContinuity({
    message:'My interview is tomorrow and I am nervous',targetCareer:'Registered Nurse',highStakesEventSoon:true,
    verifiedWins:['passed role-relevant assessment'],
    milestones:[{kind:'application',label:'application delivered',verified:true},{kind:'interview',label:'interview scheduled',verified:true}]
  });
  assert.equal(interview.stage,'interview');
  assert.equal(interview.support.mode,'cheerleader');
  assert.ok(interview.nextActions.some(action=>/rehearsal/i.test(action)));

  const hired = buildCareerSuccessContinuity({
    message:'I started the job',targetCareer:'Registered Nurse',
    milestones:[{kind:'hire',label:'employment verified',verified:true}]
  });
  assert.equal(hired.stage,'employment');
  assert.equal(hired.nextStage,'advancement');
  assert.ok(hired.nextActions.some(action=>/30\/90\/365/i.test(action)));
});

test('structured context adapter advances only from evidence already present', () => {
  const plan = continuityFromStructuredContext('What should I do next?',{
    careerTwin:{goals:'Healthcare administration'},
    outcomes:[{checkpoint:'offer',status:'verified'}]
  });
  assert.equal(plan.stage,'offer');
  assert.equal(plan.targetCareer,'Healthcare administration');
  assert.equal(plan.nextStage,'employment');
});

test('gig work participates in the same career continuity instead of becoming a separate dead end', () => {
  const plan = buildCareerSuccessContinuity({
    message:'Help me use my delivery work to move into logistics operations',
    targetCareer:'Logistics Operations Coordinator',
    gigProfile:{workerId:'w1',services:['delivery'],platforms:['marketplace-a'],transitionTarget:'Logistics Operations Coordinator'},
    gigSignals:[{service:'delivery',completedJobs:220,repeatCustomers:31,verified:true}]
  });
  assert.ok(plan.gig);
  assert.ok(plan.gig?.currentProof.some(item=>item.includes('220 verified completed jobs')));
  assert.ok(plan.nextActions.some(action=>/portable career evidence/i.test(action)));
});
