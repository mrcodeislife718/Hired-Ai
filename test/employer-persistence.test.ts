import assert from 'node:assert/strict';
import test from 'node:test';
import { EmployerPlatform } from '../src/employer-platform.js';

test('employer organizations jobs consent and fairness state survive snapshot restore',()=>{
  const employers=new EmployerPlatform();
  const org=employers.createOrganization('Acme','owner-1');
  employers.addMember(org.id,'owner-1','recruiter-1','recruiter');
  const job=employers.createJob(org.id,'owner-1',{
    title:'Operations Lead',location:'New York',workMode:'hybrid',
    responsibilities:['Own daily operations'],mustHaves:['operations'],trainable:[],preferred:[],teamContext:['small team'],successOutcomes:['reduce cycle time'],status:'open'
  });
  employers.setCandidateConsent({candidateId:'candidate-1',visibility:'matched-employers',allowedOrganizationIds:[org.id],blockedOrganizationIds:[],shareCompensationTarget:false,shareCareerPreferences:true,updatedAt:new Date().toISOString()});
  employers.factInferenceAudit(org.id,'owner-1',{fact:'Candidate shipped workflow automation',inference:'Candidate can improve operations',evidence:[{id:'ev-1',kind:'outcome',capability:'operations',statement:'Reduced manual steps',verified:true}],confidence:0.8});

  const restored=new EmployerPlatform(employers.snapshot());
  assert.equal(restored.organization(org.id)?.members.length,2);
  assert.equal(restored.listJobs(org.id,'owner-1')[0]?.id,job.id);
  assert.equal(restored.candidateConsent('candidate-1')?.visibility,'matched-employers');
  assert.equal(restored.fairnessAuditTrail(org.id,'owner-1').length,1);
});
