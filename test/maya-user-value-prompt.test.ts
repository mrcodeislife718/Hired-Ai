import assert from 'node:assert/strict';
import test from 'node:test';
import { mayaLanguagePrompt } from '../src/maya-language.js';

test('Maya prompt includes deterministic user-value operating guidance', () => {
  const prompt = mayaLanguagePrompt({
    userMessage:'I have an interview tomorrow. What should I do next?',
    deterministicAnswer:'Interview is confirmed for tomorrow at 10 AM.',
    context:{ career:{ target:'operations manager' }, checkpoint:{ status:'interview confirmed' } }
  });
  assert.match(prompt,/USER VALUE OPERATING RULE/);
  assert.match(prompt,/USER VALUE PLAN/);
  assert.match(prompt,/highest-value next move/i);
  assert.match(prompt,/Use the deterministic result as ground truth/);
  assert.match(prompt,/What credible evidence do we have that this person can perform this job\?/);
});
