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

test('onboarding voice asks progressively instead of turning into a setup questionnaire',()=>{
  const plan=buildMayaVoicePlan({message:'I just joined. Onboard me.',moment:'onboarding'});
  assert.ok(plan.responseMoves.some(move=>move.includes('instead of a questionnaire')));
  assert.ok(plan.responseMoves.some(move=>move.includes('progressively build direction')));
  assert.ok(plan.prohibitedMoves.some(move=>move.includes('voice required')));
});

test('spoken delivery preserves explicit microphone and interruption boundaries',()=>{
  const plan=buildMayaVoicePlan({message:'Talk me through my next move',spoken:true});
  assert.equal(plan.spokenDelivery.enabled,true);
  assert.match(plan.spokenDelivery.interruptionRule,/stop speaking/i);
  assert.ok(plan.prohibitedMoves.some(move=>move.includes('activating listening without an explicit user action')));
});
