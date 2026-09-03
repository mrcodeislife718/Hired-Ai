import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildUserValuePlan,
  candidateValueInterventions,
  employerValueInterventions,
  institutionValueInterventions
} from '../src/user-value-orchestrator.js';
import { gigWorkerValueInterventions } from '../src/gig-user-value.js';

test('candidate plan prioritizes a high-value real next move over feature exposure', () => {
  const plan = buildUserValuePlan({
    audience:'candidate',
    objective:'operations manager',
    stage:'access',
    availableInterventions:candidateValueInterventions({
      target:'operations manager',
      opportunityAvailable:true,
      directAccessAvailable:true,
      materialGap:'credible operations leadership proof'
    })
  });
  assert.ok(plan.primary);
  assert.ok(plan.primary!.expectedUserValue > 0.7);
  assert.ok(plan.ranked.some(item => item.kind === 'opportunity-access'));
  assert.ok(plan.ranked.some(item => item.kind === 'smallest-high-value-gap'));
  assert.match(plan.operatingRule,/user outcome value/i);
});

test('application-ready candidate receives low-friction execution as a first-class intervention', () => {
  const interventions = candidateValueInterventions({ target:'nurse', stage:'access', applicationReady:true });
  const execution = interventions.find(item => item.id === 'candidate-friction-removal');
  assert.ok(execution);
  assert.equal(execution!.requiresAuthorization,true);
  assert.ok(execution!.friction <= 0.1);
  assert.match(execution!.expectedOutcome,/completed, consistent application/i);
});

test('gig worker plan optimizes income, paid utilization, portable proof and platform independence', () => {
  const interventions = gigWorkerValueInterventions({
    idleTimeHigh:true,
    platformConcentrationHigh:true,
    portableProofWeak:true,
    wantsIndependentBusiness:true
  });
  assert.ok(interventions.some(item => item.id === 'gig-income'));
  assert.ok(interventions.some(item => item.id === 'gig-friction'));
  assert.ok(interventions.some(item => item.id === 'gig-proof'));
  assert.ok(interventions.some(item => item.id === 'gig-platform-risk'));
  assert.ok(interventions.some(item => item.id === 'gig-business'));
});

test('employer plan focuses on hiring outcomes and reduced recruiting burden', () => {
  const plan = buildUserValuePlan({
    audience:'employer',
    objective:'hire a strong operations lead quickly',
    availableInterventions:employerValueInterventions({ roleDefined:true, candidatePoolAvailable:true, assessmentNeeded:true, hiringDelayCostly:true })
  });
  assert.ok(plan.ranked.some(item => item.id === 'employer-role-to-evidence'));
  assert.ok(plan.ranked.some(item => item.id === 'employer-shortlist'));
  assert.ok(plan.ranked.some(item => item.id === 'employer-assess'));
  assert.ok(plan.ranked.some(item => item.id === 'employer-friction'));
});

test('institution plan connects training to employment and durable outcome learning', () => {
  const plan = buildUserValuePlan({
    audience:'institution',
    objective:'convert training into durable employment',
    availableInterventions:institutionValueInterventions({ participantsNeedEmployment:true, employerPartnersAvailable:true, outcomeReportingRequired:true })
  });
  assert.ok(plan.ranked.some(item => item.id === 'institution-training-to-employment'));
  assert.ok(plan.ranked.some(item => item.id === 'institution-employer-pipeline'));
  assert.ok(plan.ranked.some(item => item.id === 'institution-outcomes'));
});

test('authorization-bearing actions are not artificially boosted above equal-value reversible work', () => {
  const plan = buildUserValuePlan({
    audience:'candidate',
    availableInterventions:[
      { id:'prepare', kind:'one-conversation-execution', label:'Prepare', rationale:'prepare first', expectedOutcome:'ready', friction:0.1, confidence:0.9, urgency:0.8, reversible:true, signals:[{dimension:'outcome-progress',value:0.9}] },
      { id:'send', kind:'opportunity-access', label:'Send', rationale:'external action', expectedOutcome:'submitted', friction:0.1, confidence:0.9, urgency:0.8, reversible:false, requiresAuthorization:true, signals:[{dimension:'outcome-progress',value:0.9}] }
    ]
  });
  assert.equal(plan.primary?.id,'prepare');
});
