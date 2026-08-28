import test from 'node:test';
import assert from 'node:assert/strict';
import { MAYA_RELATIONSHIP_STANDARD, MayaLanguageModel, mayaLanguagePrompt } from '../src/maya-language.js';
import { buildMayaRelationshipIntelligence } from '../src/maya-relationship-intelligence.js';

test('Maya relationship standard combines trusted friendship with conversational career OS identity', () => {
  assert.equal(MAYA_RELATIONSHIP_STANDARD.identity, 'trusted-career-friend');
  assert.equal(MAYA_RELATIONSHIP_STANDARD.productIdentity, 'conversational-career-operating-system');
  assert.ok(MAYA_RELATIONSHIP_STANDARD.principles.some(item=>/care about the person/i.test(item)));
  assert.ok(MAYA_RELATIONSHIP_STANDARD.principles.some(item=>/challenge weak decisions/i.test(item)));
  assert.ok(MAYA_RELATIONSHIP_STANDARD.principles.some(item=>/never manufacture familiarity/i.test(item)));
  assert.ok(MAYA_RELATIONSHIP_STANDARD.avoid.includes('chatbot framing'));
  assert.ok(MAYA_RELATIONSHIP_STANDARD.avoid.includes('fake intimacy'));
  assert.ok(MAYA_RELATIONSHIP_STANDARD.avoid.includes('claiming to be human'));
});

test('relationship intelligence learns explicit conversational preferences without inventing memory', () => {
  const relationship=buildMayaRelationshipIntelligence({
    userMessage:'Continue from where we left off. Keep it direct.',
    context:{history:[
      {role:'user',content:'I want you to challenge me when my career plan is weak.'},
      {role:'assistant',content:'Next we should tighten the resume before the interview.'},
      {role:'user',content:'I have an interview scheduled for Acme next Tuesday.'}
    ]}
  });
  assert.ok(relationship.tone.includes('direct'));
  assert.equal(relationship.moment,'continuation');
  assert.ok(relationship.explicitPreferences.some(item=>/challenge me/i.test(item)));
  assert.ok(relationship.activeThreads.includes('resume'));
  assert.ok(relationship.activeThreads.includes('interview'));
  assert.ok(relationship.unresolvedCommitments.some(item=>/tighten the resume/i.test(item)));
  assert.equal(relationship.memoryPolicy.noInventedMemory,true);
  assert.equal(relationship.memoryPolicy.noSensitiveInference,true);
});

test('relationship intelligence distinguishes a real setback from generic history', () => {
  const relationship=buildMayaRelationshipIntelligence({
    userMessage:'I got rejected from the role we prepared for.',
    context:{history:[
      {role:'user',content:'Please keep this concise.'},
      {role:'assistant',content:'We prepared the interview story bank for the role.'}
    ]}
  });
  assert.equal(relationship.moment,'setback');
  assert.ok(relationship.tone.includes('concise'));
  assert.ok(relationship.responseGuidance.some(item=>/acknowledge the setback/i.test(item)));
  assert.ok(relationship.activeThreads.includes('interview'));
  assert.ok(relationship.activeThreads.includes('outcome-learning'));
});

test('Maya prompt treats conversation as the operating surface and includes long-term memory without overruling truth', () => {
  const prompt=mayaLanguagePrompt({
    userMessage:'I got rejected from the role we prepared for.',
    deterministicAnswer:'The employer outcome is recorded as rejected. Review the failing stage before changing strategy.',
    context:{
      history:[{role:'assistant',content:'We prepared for Acme together.'}],
      longTermMemory:{memories:[{kind:'goal',text:'I want to move into healthcare administration.',source:'explicit-user'}]},
      workflow:{currentStep:'outcome-learning'}
    }
  });
  assert.match(prompt,/conversational Career Operating System/i);
  assert.match(prompt,/not a chatbot/i);
  assert.match(prompt,/conversation is the operating surface/i);
  assert.match(prompt,/RELATIONSHIP INTELLIGENCE/);
  assert.match(prompt,/LONG-TERM MEMORY/i);
  assert.match(prompt,/Do not pretend to remember anything that is not available/i);
  assert.match(prompt,/deterministic result as ground truth/i);
  assert.match(prompt,/healthcare administration/i);
  assert.match(prompt,/rejected/i);
  assert.match(prompt,/outcome-learning/i);
});

test('unconfigured Maya preserves deterministic truth rather than inventing friendliness', async () => {
  const maya=new MayaLanguageModel(undefined);
  const result=await maya.render({userMessage:'Did they get my application?',deterministicAnswer:'Your application was dispatched, but employer receipt is still unverified.'});
  assert.equal(result,'Your application was dispatched, but employer receipt is still unverified.');
});
