import test from 'node:test';
import assert from 'node:assert/strict';
import { MAYA_RELATIONSHIP_STANDARD, MayaLanguageModel, mayaLanguagePrompt } from '../src/maya-language.js';

test('Maya relationship standard combines warmth with candid career judgment', () => {
  assert.equal(MAYA_RELATIONSHIP_STANDARD.identity, 'trusted-career-friend');
  assert.ok(MAYA_RELATIONSHIP_STANDARD.principles.some(item=>/care about the person/i.test(item)));
  assert.ok(MAYA_RELATIONSHIP_STANDARD.principles.some(item=>/challenge weak decisions/i.test(item)));
  assert.ok(MAYA_RELATIONSHIP_STANDARD.principles.some(item=>/never manufacture familiarity/i.test(item)));
  assert.ok(MAYA_RELATIONSHIP_STANDARD.avoid.includes('fake intimacy'));
  assert.ok(MAYA_RELATIONSHIP_STANDARD.avoid.includes('claiming to be human'));
});

test('Maya language prompt treats recent history as relationship continuity without overruling engine truth', () => {
  const prompt=mayaLanguagePrompt({
    userMessage:'I got rejected from the role we prepared for.',
    deterministicAnswer:'The employer outcome is recorded as rejected. Review the failing stage before changing strategy.',
    context:{history:[{role:'assistant',content:'We prepared for Acme together.'}],workflow:{currentStep:'outcome-learning'}}
  });
  assert.match(prompt,/trusted career friend/i);
  assert.match(prompt,/RECENT RELATIONSHIP HISTORY/);
  assert.match(prompt,/Do not pretend to remember anything that is not available/i);
  assert.match(prompt,/deterministic result as ground truth/i);
  assert.match(prompt,/rejected/i);
  assert.match(prompt,/outcome-learning/i);
});

test('unconfigured Maya preserves deterministic truth rather than inventing friendliness', async () => {
  const maya=new MayaLanguageModel(undefined);
  const result=await maya.render({userMessage:'Did they get my application?',deterministicAnswer:'Your application was dispatched, but employer receipt is still unverified.'});
  assert.equal(result,'Your application was dispatched, but employer receipt is still unverified.');
});
