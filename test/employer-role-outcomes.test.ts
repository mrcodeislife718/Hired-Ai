import test from 'node:test';
import assert from 'node:assert/strict';
import { EmployerPlatform } from '../src/employer-platform.js';

const jobInput={title:'Backend Engineer',location:'Remote',workMode:'remote' as const,responsibilities:['Own backend services'],mustHaves:['TypeScript'],trainable:['AWS'],preferred:['PostgreSQL'],teamContext:['Product team'],successOutcomes:['Ship reliable production services'],status:'open' as const};

function setup(){const platform=new EmployerPlatform();const org=platform.createOrganization('Acme','owner');const job=platform.createJob(org.id,'owner',jobInput);const pipeline=platform.addCandidateToPipeline(job.id,org.id,'owner',{candidateId:'candidate-1',source:'inbound-application',consentBasis:'candidate-application'});platform.transitionCandidate(pipeline.id,org.id,'owner','screen');return{platform,org,job,pipeline};}

function assess(platform:EmployerPlatform,orgId:string,pipelineId:string){return platform.evaluatePipelineAssessment(pipelineId,orgId,'owner',{definition:{id:'ts-assessment',title:'TypeScript work sample',profession:'Software Engineering',kind:'technical',instructions:['Complete the work sample'],criteria:[{id:'correctness',label:'Correctness',weight:1,minimum:70}]},observations:[{criterionId:'correctness',score:90,evidence:'Verified work sample output',evaluator:'hybrid'}]});}

test('role edits increment version and make earlier assessments stale for consequential decisions',()=>{
  const {platform,org,job,pipeline}=setup();
  const first=assess(platform,org.id,pipeline.id);
  assert.equal(first.jobVersion,1);
  assert.equal(first.status,'current');
  const updated=platform.updateJob(job.id,org.id,'owner',{mustHaves:['TypeScript','Distributed systems']});
  assert.equal(updated.version,2);
  assert.equal(platform.assessmentRecord(first.id,org.id,'owner').status,'stale');
  platform.transitionCandidate(pipeline.id,org.id,'owner','interview');
  assert.throws(()=>platform.transitionCandidate(pipeline.id,org.id,'owner','finalist'),/stale assessment/);
  const second=assess(platform,org.id,pipeline.id);
  assert.equal(second.jobVersion,2);
  platform.transitionCandidate(pipeline.id,org.id,'owner','finalist');
});

test('terminal hiring outcome freezes the exact role version and assessment lineage',()=>{
  const {platform,org,pipeline}=setup();
  const assessment=assess(platform,org.id,pipeline.id);
  platform.transitionCandidate(pipeline.id,org.id,'owner','interview');
  platform.transitionCandidate(pipeline.id,org.id,'owner','finalist');
  platform.transitionCandidate(pipeline.id,org.id,'owner','offer');
  const hired=platform.transitionCandidate(pipeline.id,org.id,'owner','hired');
  assert.equal(hired.terminalJobVersion,1);
  const outcome=platform.recordHiringOutcome(pipeline.id,org.id,'owner',{checkpoint:'hire',offerAccepted:true,managerSatisfaction:90,candidateSatisfaction:85,wouldHireAgain:true});
  assert.equal(outcome.jobVersion,1);
  assert.deepEqual(outcome.assessmentIds,[assessment.id]);
  const day90=platform.recordHiringOutcome(pipeline.id,org.id,'owner',{checkpoint:'day-90',performanceScore:88,managerSatisfaction:92,candidateSatisfaction:87,retentionDays:90,wouldHireAgain:true});
  assert.equal(day90.jobVersion,1);
  assert.equal(platform.hiringOutcomes(org.id,'owner',pipeline.jobId).length,2);
});

test('post-hire checkpoints cannot be recorded for rejected candidates',()=>{
  const {platform,org,pipeline}=setup();
  platform.governedRejection(pipeline.id,org.id,'owner',{reason:'TypeScript capability was not demonstrated',evidence:[]});
  assert.throws(()=>platform.recordHiringOutcome(pipeline.id,org.id,'owner',{checkpoint:'day-90',performanceScore:50}),/post-hire checkpoints/);
  const rejectionOutcome=platform.recordHiringOutcome(pipeline.id,org.id,'owner',{checkpoint:'hire'});
  assert.equal(rejectionOutcome.terminalStage,'rejected');
});
