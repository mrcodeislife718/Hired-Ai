import test from 'node:test';
import assert from 'node:assert/strict';
import { EmployerPlatform } from '../src/employer-platform.js';

const jobInput={title:'Backend Engineer',location:'Remote',workMode:'remote' as const,responsibilities:['Own backend services'],mustHaves:['TypeScript'],trainable:['AWS'],preferred:['PostgreSQL'],teamContext:['Product team'],successOutcomes:['Ship reliable production services'],status:'open' as const};

function setup(){const platform=new EmployerPlatform();const org=platform.createOrganization('Acme','owner');const job=platform.createJob(org.id,'owner',jobInput);platform.setCandidateConsent({candidateId:'candidate-1',visibility:'matched-employers',allowedOrganizationIds:[org.id],blockedOrganizationIds:[],shareCompensationTarget:false,shareCareerPreferences:true,updatedAt:new Date().toISOString()});const pipeline=platform.addCandidateToPipeline(job.id,org.id,'owner',{candidateId:'candidate-1',source:'marketplace',consentBasis:'candidate-sharing-consent',evidenceDigest:'digest-1',notes:['private recruiter note']});return{platform,org,job,pipeline};}

test('withdrawing marketplace consent terminates active use and redacts retained candidate detail',()=>{
  const {platform,org,job,pipeline}=setup();
  platform.setCandidateConsent({candidateId:'candidate-1',visibility:'private',allowedOrganizationIds:[],blockedOrganizationIds:[],shareCompensationTarget:false,shareCareerPreferences:false,updatedAt:new Date().toISOString()});
  const visible=platform.listPipeline(job.id,org.id,'owner').find(item=>item.id===pipeline.id);
  assert.equal(visible?.accessStatus,'consent-withdrawn');
  assert.equal(visible?.stage,'withdrawn');
  assert.equal(visible?.evidenceDigest,undefined);
  assert.deepEqual(visible?.notes,[]);
  assert.throws(()=>platform.transitionCandidate(pipeline.id,org.id,'owner','screen'),/access was withdrawn/);
});

test('employer assessments are evaluated, integrity-bound, and attached as persisted records',()=>{
  const {platform,org,pipeline}=setup();
  platform.transitionCandidate(pipeline.id,org.id,'owner','screen');
  const record=platform.evaluatePipelineAssessment(pipeline.id,org.id,'owner',{definition:{id:'assessment-ts',title:'TypeScript work sample',profession:'Software Engineering',kind:'technical',instructions:['Complete the work sample.'],criteria:[{id:'correctness',label:'Correctness',weight:1,minimum:70}]},observations:[{criterionId:'correctness',score:90,evidence:'Submitted work sample passed the required cases.',evaluator:'hybrid'}]});
  assert.equal(record.result.passed,true);
  assert.match(record.result.integrityDigest,/^[a-f0-9]{64}$/);
  assert.equal(platform.assessmentRecord(record.id,org.id,'owner').candidateId,'candidate-1');
  assert.ok(platform.listPipeline(pipeline.jobId,org.id,'owner')[0].assessmentIds.includes(record.id));
});

test('governed rejection blocks proxy rationales and records job-relevant rejection',()=>{
  const {platform,org,pipeline}=setup();
  platform.transitionCandidate(pipeline.id,org.id,'owner','screen');
  assert.throws(()=>platform.governedRejection(pipeline.id,org.id,'owner',{reason:'not enough experience',evidence:[]}),/failed fairness gate/);
  const rejected=platform.governedRejection(pipeline.id,org.id,'owner',{reason:'TypeScript capability was not demonstrated',evidence:[]});
  assert.equal(rejected.stage,'rejected');
  assert.equal(platform.fairnessAuditTrail(org.id,'owner').at(-1)?.decision,'reject');
});
