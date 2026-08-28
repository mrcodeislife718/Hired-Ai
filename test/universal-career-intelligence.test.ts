import test from 'node:test';
import assert from 'node:assert/strict';
import type { CandidateProfile, Opportunity, RawJob } from '../src/domain.js';
import { HiredEngine } from '../src/engine.js';
import {
  MAYA_UNIVERSALITY_RULES,
  InterviewStoryBank,
  answerApplicationQuestion,
  buildPersonalConversionModel,
  buildUniversalCareerIntelligence,
  calibrateLearning,
  classifyApplicationQuestion,
  compileApplicationEvidencePackage,
  compileCareerArtifacts,
  counterfactualApplicationOptimizer,
  decomposeRequirements,
  diagnoseRejection,
  negotiationIntelligenceV2,
  opportunityExpectedValue,
  optimizeRelationshipPaths,
  simulateCareerPaths,
  timingIntelligence,
  type UniversalEvidence
} from '../src/universal-career-intelligence.js';

const nurse: CandidateProfile = {
  id:'candidate_nurse',
  name:'Jordan Lee',
  headline:'Registered Nurse | Acute Care | Patient Education',
  skills:['registered nursing','acute care','patient assessment','medication administration','patient education','care coordination'],
  constraints:{ targetLocations:['New York'], allowedWorkModes:['onsite'], requiresSponsorship:false, preferredTitles:['registered nurse'], excludedTerms:[] }
};

const nurseEvidence: UniversalEvidence[] = [
  { id:'rn-license',label:'NY RN License',kind:'credential',capability:'registered nursing license',claim:'Active registered nursing license.',strength:1,verified:true },
  { id:'acute',label:'Acute Care Employment',kind:'work',capability:'acute care',claim:'Provided direct patient care, assessment, medication administration, education, and multidisciplinary coordination in an acute-care setting.',strength:.92,verified:true },
  { id:'education',label:'Patient Education',kind:'work',capability:'patient education',claim:'Educated patients and families on treatment plans, discharge instructions, and follow-up care.',strength:.88,verified:true }
];

const raw: RawJob = {
  source:'hospital-careers', sourceId:'rn-1', url:'https://example.test/rn-1', company:'City Medical Center', title:'Registered Nurse - Medical Surgical', location:'New York, NY', workMode:'onsite',
  description:'Provide safe patient-centered nursing care. Coordinate with the interdisciplinary team, educate patients and families, and support quality outcomes. Equal opportunity employer.',
  requirements:['Active RN license required','Patient assessment','Medication administration','Care coordination'],
  preferred:['BSN preferred','Two years acute care experience preferred'], postedAt:new Date(Date.now()-2*86400000).toISOString(), applicantCount:18
};

const opportunity = ():Opportunity => new HiredEngine(nurse,[]).ingest(raw);

test('universal career intelligence is not technology-specific',()=>{
  const opp=opportunity();
  const result=buildUniversalCareerIntelligence(nurse,nurseEvidence,opp);
  assert.match(result.decomposition.coreHiringProblem,/patient|nursing|care/i);
  assert.ok(result.package.proofIndex.some(p=>p.kind==='credential'));
  assert.ok(result.employerDecision.evaluators.some(e=>/hiring-manager|functional/i.test(e.evaluator)));
  assert.ok(result.competitors.some(c=>/credentialed|domain specialist/i.test(c.name)));
  assert.ok(MAYA_UNIVERSALITY_RULES.some(r=>/healthcare/i.test(r)));
  assert.ok(MAYA_UNIVERSALITY_RULES.some(r=>/Do not recommend a portfolio or GitHub/i.test(r)));
});

test('requirement decomposition distinguishes hard gates, preferences, success criteria and boilerplate',()=>{
  const d=decomposeRequirements(opportunity());
  assert.ok(d.requirements.some(r=>r.classification==='hard'));
  assert.ok(d.requirements.some(r=>r.classification==='wishlist'));
  assert.ok(d.boilerplate.some(x=>/equal opportunity/i.test(x)));
  assert.ok(d.successCriteria.length>0);
});

test('application evidence package compiles consistent artifacts from one claim set',()=>{
  const pkg=compileApplicationEvidencePackage(nurse,nurseEvidence,opportunity());
  const artifacts=compileCareerArtifacts(pkg);
  assert.ok(pkg.immutableClaims.length>0);
  assert.ok(artifacts.resumeBrief.length>0);
  assert.ok(artifacts.interviewNarrative.length>0);
  assert.match(artifacts.consistencyRule,/same immutable claim set/i);
});

test('application question intelligence handles regulated-profession screening accurately',()=>{
  const pkg=compileApplicationEvidencePackage(nurse,nurseEvidence,opportunity());
  assert.equal(classifyApplicationQuestion('Do you hold an active RN license?'),'eliminatory');
  assert.equal(classifyApplicationQuestion('What are your salary expectations?'),'compensation');
  const answer=answerApplicationQuestion('Describe your patient education experience.',pkg);
  assert.equal(answer.kind,'competency');
  assert.match(answer.instruction,/only facts/i);
});

test('story bank retrieves reusable evidence-backed interview stories',()=>{
  const bank=new InterviewStoryBank();
  bank.add({id:'story-1',title:'Complex discharge',tags:['patient education','care coordination'],situation:'Patient had a complex discharge plan.',task:'Ensure safe transition.',action:'Coordinated the team and educated patient and family.',result:'Completed a safe documented discharge plan.',evidenceIds:['acute','education'],confidence:90});
  bank.add({id:'story-2',title:'Shift handoff',tags:['communication'],situation:'Busy shift.',task:'Transfer care.',action:'Used structured handoff.',result:'Continuity preserved.',evidenceIds:['acute'],confidence:80});
  assert.equal(bank.retrieve(['patient education'],['education'])[0].id,'story-1');
});

test('counterfactual and personal conversion models learn without overfitting',()=>{
  const experiments=[
    {id:'1',opportunityId:'a',variant:'A',dimensions:{headline:'A'},outcome:'screen' as const,at:new Date().toISOString()},
    {id:'2',opportunityId:'b',variant:'B',dimensions:{headline:'B'},outcome:'offer' as const,at:new Date().toISOString()},
    {id:'3',opportunityId:'c',variant:'B',dimensions:{headline:'B'},outcome:'interview' as const,at:new Date().toISOString()}
  ];
  const cf=counterfactualApplicationOptimizer(experiments);
  const model=buildPersonalConversionModel(experiments);
  assert.equal(cf.variants[0].variant,'B');
  assert.ok(model.confidence<1);
  assert.ok(model.warning);
  assert.equal(calibrateLearning(5,.3).shouldChangeStrategy,false);
});

test('expected value includes conversion probabilities and economic tradeoffs',()=>{
  const model=buildPersonalConversionModel(Array.from({length:12},(_,i)=>({id:String(i),opportunityId:String(i),variant:'A',dimensions:{},outcome:i<6?'screen' as const:i<9?'interview' as const:i===9?'offer' as const:'rejection' as const,at:new Date().toISOString()})));
  const ev=opportunityExpectedValue(model,{compensationValue:100,careerUpside:80,fulfillment:90,networkValue:60,optionValue:70,applicationCost:3,relocationCost:0,riskCost:4});
  assert.ok(ev.acquisitionProbability>0&&ev.acquisitionProbability<1);
  assert.ok(Number.isFinite(ev.expectedValue));
});

test('timing intelligence detects fresh opportunities',()=>{
  const signal=timingIntelligence(opportunity());
  assert.ok(['apply-now','apply-soon','verify-first','deprioritize'].includes(signal.recommendation));
  assert.ok(signal.freshnessScore>0);
});

test('relationship optimizer is profession-neutral',()=>{
  const paths=optimizeRelationshipPaths([{id:'r1',name:'Taylor',role:'Nurse Recruiter',company:'City Medical Center',relationshipType:'recruiter',channels:['email'],publicUrls:[],source:'career fair',confidence:.9,interactionCount:2}], 'City Medical Center');
  assert.equal(paths[0].people[0],'Taylor');
  assert.ok(paths[0].credibilityScore>paths[0].frictionScore);
});

test('negotiation, rejection diagnosis and career path simulation remain general-purpose',()=>{
  const negotiation=negotiationIntelligenceV2({minimum:90000,target:110000,currentOffer:100000,nonSalaryPriorities:['schedule','education support']});
  assert.equal(negotiation.walkAwayValue,90000);
  const rejection=diagnoseRejection({stage:'screen',knownGapCount:1});
  assert.ok(rejection.unknownProbability>=.2);
  const paths=simulateCareerPaths([
    {name:'clinical leadership',steps:['RN','Charge Nurse','Nurse Manager'],expectedCompensation:135000,timeMonths:48,learningCost:45,optionality:.8,fulfillment:.75,evidenceRequirements:['leadership evidence'],evidenceCoverage:.6,marketSignal:.8},
    {name:'advanced practice',steps:['RN','Graduate study','NP'],expectedCompensation:150000,timeMonths:60,learningCost:80,optionality:.85,fulfillment:.8,evidenceRequirements:['graduate degree','license'],evidenceCoverage:.3,marketSignal:.85}
  ]);
  assert.equal(paths.length,2);
  assert.ok(paths.every(p=>p.probability>=0&&p.probability<=1));
});
