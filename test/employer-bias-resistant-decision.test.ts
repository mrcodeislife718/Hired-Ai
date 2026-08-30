import test from 'node:test';
import assert from 'node:assert/strict';
import { EmployerPlatform } from '../src/employer-platform.js';

function jobInput(){return {
  title:'Backend Engineer',location:'Remote',workMode:'remote' as const,
  responsibilities:['Build reliable APIs'],mustHaves:['backend engineering'],trainable:[],preferred:[],teamContext:['Small platform team'],successOutcomes:['ship reliable APIs'],status:'open' as const
};}

test('employer platform builds structured interview and audit trail',()=>{
  const platform=new EmployerPlatform();
  const org=platform.createOrganization('Example','owner-1');
  const job=platform.createJob(org.id,'owner-1',jobInput());
  const questions=platform.structuredInterview(job.id,org.id,'owner-1');
  assert.ok(questions.length>=2);
  const audit=platform.factInferenceAudit(org.id,'owner-1',{fact:'Candidate has an employment gap',inference:'Candidate is unreliable',evidence:[]});
  assert.equal(audit.supported,false);
  assert.ok(platform.fairnessAuditTrail(org.id,'owner-1').length>=1);
});

test('employer platform can blind initial evidence review',()=>{
  const platform=new EmployerPlatform();
  const org=platform.createOrganization('Example','owner-1');
  const packet=platform.blindEvidenceReview(org.id,'owner-1',{
    evidence:[{id:'e1',kind:'work-sample',capability:'backend engineering',statement:'Production API',verified:true}],
    identityFields:{name:'Candidate'},pedigreeFields:{school:'Prestige U'}
  });
  assert.deepEqual(packet.removedFields.sort(),['name','school']);
  assert.equal(packet.evidence.length,1);
});
