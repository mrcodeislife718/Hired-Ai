import test from 'node:test';
import assert from 'node:assert/strict';
import { capabilitiesFor, canUseCapability, competitiveDesignControls, lockedCapabilitiesFor, validateCapabilityArchitecture } from '../src/two-sided-capabilities.js';

test('two-sided capability architecture keeps trust-critical protections free',()=>{
  const result=validateCapabilityArchitecture();
  assert.equal(result.valid,true,result.problems.join('; '));
  const candidateFree=capabilitiesFor('candidate','free');
  const employerFree=capabilitiesFor('employer','free');
  assert.ok(candidateFree.some(item=>item.id==='candidate-privacy-controls'));
  assert.ok(candidateFree.some(item=>item.id==='candidate-master-docs'));
  assert.ok(employerFree.some(item=>item.id==='employer-data-controls'));
  assert.ok(employerFree.some(item=>item.id==='employer-consented-preview'));
  assert.ok([...candidateFree,...employerFree].filter(item=>item.trustCritical).every(item=>item.minimumTier==='free'));
});

test('paid tiers add capability without removing lower-tier value',()=>{
  const candidateFree=capabilitiesFor('candidate','free').map(item=>item.id);
  const candidatePro=capabilitiesFor('candidate','pro').map(item=>item.id);
  assert.ok(candidateFree.every(id=>candidatePro.includes(id)));
  assert.equal(canUseCapability('candidate','free','candidate-competitive-selection'),false);
  assert.equal(canUseCapability('candidate','pro','candidate-competitive-selection'),true);

  const employerFree=capabilitiesFor('employer','free').map(item=>item.id);
  const employerEnterprise=capabilitiesFor('employer','enterprise').map(item=>item.id);
  assert.ok(employerFree.every(id=>employerEnterprise.includes(id)));
  assert.equal(canUseCapability('employer','free','employer-ai-interviewer'),false);
  assert.equal(canUseCapability('employer','pro','employer-ai-interviewer'),true);
  assert.ok(lockedCapabilitiesFor('employer','free').some(item=>item.id==='employer-enterprise-integrations'));
});

test('competitive controls address consent, ownership, scale, evidence, human judgment and ranking integrity',()=>{
  const joined=competitiveDesignControls.map(item=>`${item.protectsAgainst} ${item.architecture}`).join(' ');
  assert.match(joined,/deny-by-default/i);
  assert.match(joined,/employers retain durable role, pipeline/i);
  assert.match(joined,/authorized external/i);
  assert.match(joined,/attributable evidence/i);
  assert.match(joined,/human-authorized/i);
  assert.match(joined,/cannot purchase higher organic/i);
});
