import test from 'node:test';
import assert from 'node:assert/strict';
import { candidateAccessTier, candidateCapabilityDecision, employerAccessTier, employerCapabilityDecision } from '../src/runtime-entitlements.js';
import type { EmployerSubscription } from '../src/employer-platform.js';

test('candidate inactive billing resolves to free while paid active plans unlock named capability',()=>{
  const inactive={subscription:{plan:'pro' as const,status:'canceled' as const,updatedAt:new Date().toISOString()}};
  const active={subscription:{plan:'pro' as const,status:'active' as const,updatedAt:new Date().toISOString()}};
  assert.equal(candidateAccessTier(inactive),'free');
  assert.equal(candidateCapabilityDecision(inactive,'candidate-conversation').allowed,true);
  assert.equal(candidateCapabilityDecision(inactive,'candidate-acquisition-orchestration').allowed,false);
  assert.equal(candidateAccessTier(active),'pro');
  assert.equal(candidateCapabilityDecision(active,'candidate-acquisition-orchestration').allowed,true);
});

test('employer billing resolves canceled and past-due organizations to free capabilities',()=>{
  const sub=(plan:EmployerSubscription['plan'],status:EmployerSubscription['status']):EmployerSubscription=>({plan,status,updatedAt:new Date().toISOString()});
  assert.equal(employerAccessTier(sub('pro','past_due')),'free');
  assert.equal(employerCapabilityDecision(sub('starter','canceled'),'employer-basic-pipeline').allowed,true);
  assert.equal(employerCapabilityDecision(sub('starter','canceled'),'employer-sourcing').allowed,false);
  assert.equal(employerCapabilityDecision(sub('starter','active'),'employer-sourcing').allowed,true);
  assert.equal(employerCapabilityDecision(sub('enterprise','active'),'employer-enterprise-integrations').allowed,true);
});
