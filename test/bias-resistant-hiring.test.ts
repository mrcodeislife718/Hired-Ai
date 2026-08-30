import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FairnessAuditTrail,
  auditFactInference,
  buildBlindEvidencePacket,
  buildCandidateRiskMap,
  buildStructuredInterview,
  checkRejectionReason,
  classifyCandidateRecovery,
  counterfactualCandidateReview,
  evaluateEvidenceSubstitution,
  summarizeHiringSignalQuality,
  type CapabilityEvidence,
  type HiringRequirement
} from '../src/bias-resistant-hiring.js';

const evidence:CapabilityEvidence[]=[
  {id:'e1',kind:'work-sample',capability:'backend engineering',statement:'Built and shipped production API',verified:true,confidence:.9},
  {id:'e2',kind:'outcome',capability:'backend engineering',statement:'Reduced latency by 35%',verified:true,confidence:.9}
];

const experienceRequirement:HiringRequirement={id:'r1',label:'5+ years backend engineering',capability:'backend engineering',type:'experience-proxy',years:5};

test('candidate risk map separates fact from unsupported inference',()=>{
  const map=buildCandidateRiskMap('I was laid off and now have an employment gap');
  assert.equal(map.risks.length,2);
  assert.match(map.risks[0].unsupportedInference,/performance|ability|value/i);
  assert.ok(map.recommendedProof.length>0);
});

test('evidence substitution challenges tenure proxies but preserves hard gates',()=>{
  const substitute=evaluateEvidenceSubstitution(experienceRequirement,evidence);
  assert.equal(substitute.substitutable,true);
  const license=evaluateEvidenceSubstitution({id:'r2',label:'Active RN license',capability:'registered nursing license',type:'hard-gate',requiredCredential:true},evidence);
  assert.equal(license.hardGate,true);
  assert.equal(license.substitutable,false);
});

test('structured interview is competency and evidence based',()=>{
  const questions=buildStructuredInterview([experienceRequirement]);
  assert.equal(questions.length,1);
  assert.match(questions[0].question,/specific time/i);
  assert.match(questions[0].anchors.weak,/unsupported/i);
});

test('fact inference audit challenges unsupported conclusions',()=>{
  const result=auditFactInference({fact:'Candidate has a six month gap',inference:'Candidate is unreliable',evidence:[]});
  assert.equal(result.supported,false);
  assert.match(result.challenge??'',/not sufficiently supported/i);
});

test('rejection quality check rejects vague tenure proxy when direct evidence exists',()=>{
  const result=checkRejectionReason('Not enough experience',[experienceRequirement],evidence);
  assert.equal(result.valid,false);
  assert.equal(result.unsupportedProxy,true);
});

test('counterfactual review detects proxy-sensitive decision',()=>{
  const result=counterfactualCandidateReview({decisionWithProxy:'reject',decisionWithoutProxy:'advance',proxyLabel:'employment gap'});
  assert.equal(result.inconsistent,true);
});

test('blind review removes supplied identity and pedigree fields without deleting evidence',()=>{
  const packet=buildBlindEvidencePacket({evidence,identityFields:{name:'A',age:45},pedigreeFields:{school:'X'}});
  assert.equal(packet.evidence.length,2);
  assert.deepEqual(packet.removedFields.sort(),['age','name','school']);
  assert.equal(packet.evidence[0].source,undefined);
});

test('candidate recovery does not equate rejection with failure',()=>{
  const result=classifyCandidateRecovery({reason:'position closed because of budget'});
  assert.equal(result.classification,'process-issue');
  assert.match(result.nextActions[0],/do not downgrade capability/i);
});

test('hiring quality feedback summarizes later outcomes by signal',()=>{
  const result=summarizeHiringSignalQuality([
    {signal:'degree',signalValue:false,hired:true,performance90:90,satisfaction90:88},
    {signal:'degree',signalValue:false,hired:true,performance90:80,satisfaction90:84}
  ]);
  assert.equal(result.length,1);
  assert.equal(result[0].meanPerformance,85);
  assert.equal(result[0].meanSatisfaction,86);
});

test('fairness audit trail records explainable decision events',()=>{
  const trail=new FairnessAuditTrail();
  trail.record({actor:'recruiter-1',action:'challenge',evidenceIds:['e1'],decision:'challenge',rationale:'Years alone do not establish capability.'});
  assert.equal(trail.list().length,1);
  assert.match(trail.list()[0].at,/T/);
});
