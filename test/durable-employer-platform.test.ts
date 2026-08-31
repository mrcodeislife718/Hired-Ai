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

  const restored=await DurableEmployerPlatform.create(persistence);
  assert.equal(restored.organization(org.id)?.name,'Acme');
  assert.equal(restored.listJobs(org.id,'recruiter-1')[0]?.id,job.id);
  assert.equal(restored.candidateConsent('candidate-1')?.visibility,'matched-employers');
  assert.equal(restored.canOrganizationSourceCandidate('candidate-1',org.id),true);
});
