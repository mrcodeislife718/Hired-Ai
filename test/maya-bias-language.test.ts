import test from 'node:test';
import assert from 'node:assert/strict';
import { MayaLanguageModel, mayaLanguagePrompt } from '../src/maya-language.js';

test('Maya system prompt includes two-sided bias protection when relevant', () => {
  const prompt = mayaLanguagePrompt({
    userMessage: 'I was laid off and now I have an employment gap. Will recruiters reject me?',
    deterministicAnswer: 'Build a reentry plan.'
  });
  assert.match(prompt, /TWO-SIDED HIRING BIAS AND WEAK-PROXY STANDARD/);
  assert.match(prompt, /HIRING BIAS \/ WEAK-PROXY CHECK/);
  assert.match(prompt, /Do not infer:/);
  assert.match(prompt, /What credible evidence do we have that this person can perform this job\?/);
});

test('deterministic Maya fallback warns candidates about weak proxies', async () => {
  const maya = new MayaLanguageModel(undefined);
  const answer = await maya.render({
    userMessage: 'I got laid off and I am unemployed. How do I explain the gap?',
    deterministicAnswer: 'Lead with what you can do now.'
  });
  assert.match(answer, /Lead with what you can do now/);
  assert.match(answer, /protect you from/i);
  assert.match(answer, /does not directly predict job performance/i);
});

test('deterministic Maya fallback challenges employer proxy screens', async () => {
  const maya = new MayaLanguageModel(undefined);
  const answer = await maya.render({
    userMessage: 'We are hiring. Should we screen candidates who have an employment gap or no degree?',
    deterministicAnswer: 'Use job-relevant criteria.'
  });
  assert.match(answer, /hiring-quality warning/i);
  assert.match(answer, /does not by itself justify the inference/i);
});

test('deterministic fallback stays unchanged when no proxy signal is detected', async () => {
  const maya = new MayaLanguageModel(undefined);
  const answer = await maya.render({
    userMessage: 'Prepare me for my interview.',
    deterministicAnswer: 'Here is your interview plan.'
  });
  assert.equal(answer, 'Here is your interview plan.');
});
