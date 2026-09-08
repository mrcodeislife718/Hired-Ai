import test from 'node:test';
import assert from 'node:assert/strict';
import { EmployerPlatform } from '../src/employer-platform.js';
import { buildEmployerHiringPlan, calibrateEmployerRole, evaluateEmployerCandidate } from '../src/employer-hiring-os.js';
import { deterministicEmployerMayaReply } from '../src/maya-employer-service.js';

const roleInput={
  title:'Operations Manager',location:'New York',workMode:'onsite' as const,salaryMin:90000,salaryMax:115000,
  responsibilities:['Lead daily operations','Improve service reliability'],mustHaves:['team leadership','operations'],trainable:['company systems'],preferred:['process improvement'],
  teamContext:['frontline operations team','high customer impact'],successOutcomes:['improve service reliability'],status:'open' as const
};

function setup(){
  const platform=new EmployerPlatform();
  const org=platform.createOrganization('Test Employer','owner');
  const job=platform.createJob(org.id,'owner',roleInput);
  return {platform,org,job};
}

const strongCandidate={
  candidateId:'candidate-strong',displayName:'Strong Candidate',consented:true,interested:true,available:true,compensationMinimum:100000,
  evidence:[
    {id:'ev-lead',candidateId:'candidate-strong',capability:'team leadership',claim:'Led a frontline operations team',source:'employment verification',strength:92,verified:true},
    {id:'ev-ops',candidateId:'candidate-strong',capability:'operations',claim:'Owned daily operations and reliability',source:'employment verification',strength:90,verified:true},
    {id:'ev-outcome',candidateId:'candidate-strong',capability:'service reliability',claim:'Improved service reliability through process changes',source:'reference',strength:86,verified:true}
  ],
  assessments:[{candidateId:'candidate-strong',assessmentId:'ops-work-sample',score:88,passed:true,integrityDigest:'digest'}]
};

const privateCandidate={
  candidateId:'candidate-private',consented:false,interested:true,available:true,
  evidence:[
    {id:'ev-private',candidateId:'candidate-private',capability:'team leadership',claim:'Led a team',source:'resume',strength:95,verified:true},
    {id:'ev-private-ops',candidateId:'candidate-private',capability:'operations',claim:'Owned operations',source:'resume',strength:95,verified:true}
  ]
};

test('role calibration rewards outcomes and distinguishes trainable capability',()=>{
  const {job}=setup();
  const calibration=calibrateEmployerRole(job);
  assert.ok(calibration.qualityScore>70);
  assert.ok(calibration.calibratedRequirements.some(item=>item.kind==='trainable'));
  assert.ok(calibration.calibratedRequirements.some(item=>item.kind==='outcome'));
});

test('candidate evaluation requires sourcing consent and hard-gate evidence',()=>{
  const {job}=setup();
  const strong=evaluateEmployerCandidate(job,strongCandidate);
  const blocked=evaluateEmployerCandidate(job,privateCandidate);
  assert.equal(strong.eligible,true);
  assert.ok(strong.score>blocked.score || blocked.eligible===false);
  assert.equal(blocked.eligible,false);
  assert.equal(blocked.decisionSignal,'do-not-advance');
  assert.ok(blocked.risks.some(risk=>/not consented/i.test(risk)));
  assert.match(strong.provenanceDigest,/^[a-f0-9]{64}$/);
});

test('hiring plan shortlists only eligible candidates and keeps human decision authority',()=>{
  const {job}=setup();
  const plan=buildEmployerHiringPlan(job,[privateCandidate,strongCandidate],3);
  assert.deepEqual(plan.shortlist.map(item=>item.candidateId),['candidate-strong']);
  assert.ok(plan.excluded.some(item=>item.candidateId==='candidate-private'));
  assert.ok(plan.interviewPlan.some(stage=>stage.stage==='structured capability interview'));
  assert.match(plan.decisionBoundary,/human decisions/i);
  assert.match(plan.decisionBoundary,/protected traits/i);
});

test('employer Maya uses the owned role and evidence-first hiring plan conversationally',()=>{
  const {platform,org,job}=setup();
  const response=deterministicEmployerMayaReply(platform,{organizationId:org.id,actorAccountId:'owner',accessTier:'pro',jobId:job.id,message:'Find and shortlist the best candidates',candidates:[privateCandidate,strongCandidate]});
  assert.equal(response.type,'employer-hiring-plan');
  const plan=response.plan as ReturnType<typeof buildEmployerHiringPlan>;
  assert.equal(plan.shortlist[0]?.candidateId,'candidate-strong');
  assert.ok(Array.isArray(response.actions));
});
