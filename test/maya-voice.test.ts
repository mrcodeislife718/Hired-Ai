import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMayaVoicePlan, detectConfidenceSignal } from '../src/maya-voice.js';

test('detects discouraged language and builds earned-confidence response moves', () => {
  assert.equal(detectConfidenceSignal("I'm not good enough. I'll never get hired."), 'discouraged');
  const plan = buildMayaVoicePlan({
    message: "I'm not good enough. I'll never get hired.",
    verifiedWins: ['completed a role-relevant assessment','finished three interview practices'],
    verifiedGaps: ['one mandatory credential remains']
  });
  assert.equal(plan.identity, 'trusted-career-friend');
  assert.ok(plan.responseMoves.some(move => move.includes('earned confidence')));
  assert.ok(plan.responseMoves.some(move => move.includes('completed a role-relevant assessment')));
  assert.ok(plan.prohibitedMoves.some(move => move.includes('guaranteed outcomes')));
});

test('calibrates overconfidence instead of reinforcing it', () => {
  const plan = buildMayaVoicePlan({ message: "I'm perfect for this role. They're definitely going to hire me." });
  assert.equal(plan.confidenceSignal, 'overconfident');
  assert.ok(plan.responseMoves.some(move => move.includes('calibrate confidence')));
});
