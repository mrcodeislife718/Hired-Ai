import test from 'node:test';
import assert from 'node:assert/strict';
import { DurableEmployerPlatform } from '../src/durable-employer-platform.js';
import type { EmployerPersistenceAdapter } from '../src/employer-persistence.js';
import type { EmployerPlatformSnapshot } from '../src/employer-platform.js';

class MemoryEmployerPersistence implements EmployerPersistenceAdapter {
  snapshot?:EmployerPlatformSnapshot;
  saves=0;
  async load(){return this.snapshot?structuredClone(this.snapshot):undefined;}
  async save(snapshot:EmployerPlatformSnapshot){this.snapshot=structuredClone(snapshot);this.saves++;}
  async mutate(mutation:(current:EmployerPlatformSnapshot|undefined)=>EmployerPlatformSnapshot){const next=mutation(this.snapshot?structuredClone(this.snapshot):undefined);this.snapshot=structuredClone(next);this.saves++;return structuredClone(next);}
}

const jobInput={
  title:'Product Engineer',location:'New York',workMode:'hybrid' as const,
  responsibilities:['Ship customer-facing systems'],mustHaves:['TypeScript'],trainable:['Python'],preferred:['PostgreSQL'],
  teamContext:['Small product team'],successOutcomes:['Deliver reliable product improvements'],status:'open' as const
};

test('durable employer mutations persist before acknowledgement and survive recreation',async()=>{
  const persistence=new MemoryEmployerPersistence();
  const employers=await DurableEmployerPlatform.create(persistence);
  const org=await employers.createOrganization('Acme','owner-1');
  assert.equal(persistence.saves,1);
  await employers.addMember(org.id,'owner-1','recruiter-1','recruiter');
  assert.equal(persistence.saves,2);
  const job=await employers.createJob(org.id,'recruiter-1',jobInput);
  assert.equal(persistence.saves,3);
  await employers.setCandidateConsent({candidateId:'candidate-1',visibility:'matched-employers',allowedOrganizationIds:[org.id],blockedOrganizationIds:[],shareCompensationTarget:false,shareCareerPreferences:true,updatedAt:new Date().toISOString()});
  assert.equal(persistence.saves,4);
  const pipeline=await employers.addCandidateToPipeline(job.id,org.id,'recruiter-1',{candidateId:'candidate-1',source:'marketplace',consentBasis:'candidate-sharing-consent',evidenceDigest:'evidence-1'});
  assert.equal(persistence.saves,5);
  await employers.transitionCandidate(pipeline.id,org.id,'recruiter-1','contacted','candidate accepted contact');
  await employers.transitionCandidate(pipeline.id,org.id,'recruiter-1','screen','screen scheduled');
  await employers.attachPipelineAssessment(pipeline.id,org.id,'recruiter-1','assessment-1');
  assert.equal(persistence.saves,8);

  const restored=await DurableEmployerPlatform.create(persistence);
  assert.equal(restored.organization(org.id)?.name,'Acme');
  assert.equal(restored.listJobs(org.id,'recruiter-1')[0]?.id,job.id);
  assert.equal(restored.candidateConsent('candidate-1')?.visibility,'matched-employers');
  assert.equal(restored.canOrganizationSourceCandidate('candidate-1',org.id),true);
  const restoredPipeline=restored.listPipeline(job.id,org.id,'recruiter-1');
  assert.equal(restoredPipeline[0]?.stage,'screen');
  assert.deepEqual(restoredPipeline[0]?.assessmentIds,['assessment-1']);
  assert.deepEqual(restoredPipeline[0]?.stageHistory.map(event=>event.stage),['sourced','contacted','screen']);
});

test('marketplace pipeline entry enforces candidate sharing consent and rejection reasons',async()=>{
  const persistence=new MemoryEmployerPersistence();
  const employers=await DurableEmployerPlatform.create(persistence);
  const org=await employers.createOrganization('Acme','owner');
  const job=await employers.createJob(org.id,'owner',jobInput);
  await assert.rejects(employers.addCandidateToPipeline(job.id,org.id,'owner',{candidateId:'private',source:'marketplace',consentBasis:'candidate-sharing-consent'}),/consent required/);
  const inbound=await employers.addCandidateToPipeline(job.id,org.id,'owner',{candidateId:'applicant',source:'inbound-application',consentBasis:'candidate-application'});
  await employers.transitionCandidate(inbound.id,org.id,'owner','screen');
  await assert.rejects(employers.transitionCandidate(inbound.id,org.id,'owner','rejected'),/requires a reason/);
  const rejected=await employers.transitionCandidate(inbound.id,org.id,'owner','rejected','does not satisfy a documented hard gate');
  assert.equal(rejected.stage,'rejected');
  assert.match(rejected.stageHistory.at(-1)?.reason??'',/hard gate/);
});

test('durable employer writers replay against latest persisted state instead of overwriting one another',async()=>{
  const persistence=new MemoryEmployerPersistence();
  const first=await DurableEmployerPlatform.create(persistence);
  const second=await DurableEmployerPlatform.create(persistence);
  const a=await first.createOrganization('Alpha','owner-a');
  const b=await second.createOrganization('Beta','owner-b');
  const restored=await DurableEmployerPlatform.create(persistence);
  assert.equal(restored.organization(a.id)?.name,'Alpha');
  assert.equal(restored.organization(b.id)?.name,'Beta');
});
