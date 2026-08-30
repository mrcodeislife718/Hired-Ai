import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeHiringBias, inferHiringAudience, mayaBiasContext } from '../src/hiring-bias-intelligence.js';

test('detects layoff and employment-gap proxies for candidates', () => {
  const result = analyzeHiringBias('I was laid off and now I have an employment gap on my resume. Help me get hired.');
  assert.equal(result.audience, 'candidate');
  assert.equal(result.detected, true);
  assert.deepEqual(result.signals.map(signal => signal.signal), ['layoff', 'employment-gap']);
  assert.ok(result.candidateGuidance.some(item => /role-relevant evidence/i.test(item)));
  assert.ok(result.signals.every(signal => signal.unsupportedInference.length > 0));
});

test('warns employers away from degree and gap proxies while preserving real gates', () => {
  const result = analyzeHiringBias('We are hiring and want to screen candidates with an employment gap or without a bachelor degree.');
  assert.equal(result.audience, 'employer');
  assert.equal(result.detected, true);
  assert.ok(result.signals.some(signal => signal.signal === 'employment-gap'));
  assert.ok(result.signals.some(signal => signal.signal === 'degree'));
  assert.ok(result.evaluatorGuidance.some(item => /credential, licensing, safety/i.test(item)));
});

test('distinguishes recruiter audience', () => {
  assert.equal(inferHiringAudience("I'm a recruiter sourcing candidates for my client"), 'recruiter');
});

test('produces prompt-safe fact versus inference context', () => {
  const context = mayaBiasContext('I got laid off and I am returning to work after a career gap.');
  assert.match(context, /HIRING BIAS \/ WEAK-PROXY CHECK/);
  assert.match(context, /Do not infer:/);
  assert.match(context, /Prefer:/);
  assert.match(context, /Protect candidates from unfair inference/);
});

test('does not invent a bias warning when no supported proxy signal is present', () => {
  const result = analyzeHiringBias('Help me prepare for a technical interview tomorrow.');
  assert.equal(result.detected, false);
  assert.equal(result.signals.length, 0);
  assert.equal(mayaBiasContext('Help me prepare for a technical interview tomorrow.'), '');
});
