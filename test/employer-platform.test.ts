import test from 'node:test';
import assert from 'node:assert/strict';
import { EmployerPlatform } from '../src/employer-platform.js';

test('employer organization RBAC protects candidate sourcing and job creation', () => {
  const platform = new EmployerPlatform();
  const org = platform.createOrganization('Acme', 'owner-1');
  platform.addMember(org.id, 'owner-1', 'recruiter-1', 'recruiter');
  platform.addMember(org.id, 'owner-1', 'viewer-1', 'viewer');

  const job = platform.createJob(org.id, 'recruiter-1', {
    title:'Backend Engineer', location:'New York, NY', workMode:'hybrid', salaryMin:140000, salaryMax:180000,
    responsibilities:['Own backend services'], mustHaves:['TypeScript'], trainable:['AWS'], preferred:['PostgreSQL'],
    teamContext:['small platform team'], successOutcomes:['ship reliable production services'], status:'open'
  });
  assert.equal(job.organizationId, org.id);
  assert.throws(() => platform.createJob(org.id, 'viewer-1', { ...job, id:undefined, organizationId:undefined, createdBy:undefined, createdAt:undefined, updatedAt:undefined } as never), /permission denied/);
});

test('candidate sourcing requires explicit visibility consent', () => {
  const platform = new EmployerPlatform();
  const org = platform.createOrganization('Acme', 'owner-1');
  assert.equal(platform.canOrganizationSourceCandidate('candidate-1', org.id), false);

  platform.setCandidateConsent({ candidateId:'candidate-1', visibility:'matched-employers', allowedOrganizationIds:[org.id], blockedOrganizationIds:[], shareCompensationTarget:false, shareCareerPreferences:true, updatedAt:new Date().toISOString() });
  assert.equal(platform.canOrganizationSourceCandidate('candidate-1', org.id), true);

  platform.setCandidateConsent({ candidateId:'candidate-1', visibility:'discoverable', allowedOrganizationIds:[], blockedOrganizationIds:[org.id], shareCompensationTarget:false, shareCareerPreferences:false, updatedAt:new Date().toISOString() });
  assert.equal(platform.canOrganizationSourceCandidate('candidate-1', org.id), false);
});
