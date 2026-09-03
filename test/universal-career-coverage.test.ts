import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCareerTransitionPlan, supportedCareerDomains } from '../src/universal-career-coverage.js';

test('career planning works across professions and preserves mandatory gates', () => {
  const plan = buildCareerTransitionPlan(
    { title: 'Registered Nurse', domain: 'healthcare', compensationTarget: 120000 },
    [
      { id: 'license', label: 'Active RN license', mandatory: true, acceptableProof: ['license'], weight: 5 },
      { id: 'patient-care', label: 'Patient-care capability', mandatory: false, acceptableProof: ['employment','assessment','work-sample'], weight: 3 }
    ],
    [{ id: 'proof_1', kind: 'assessment', label: 'Clinical simulation', verified: true, strength: 88 }]
  );
  assert.equal(plan.readiness, 38);
  assert.equal(plan.hardGates[0].id, 'license');
  assert.match(plan.nextActions[0], /mandatory requirement/i);
});

test('coverage explicitly includes broad work domains without making technology the default', () => {
  assert.ok(supportedCareerDomains.includes('healthcare'));
  assert.ok(supportedCareerDomains.includes('skilled-trades'));
  assert.ok(supportedCareerDomains.includes('creative'));
  assert.ok(supportedCareerDomains.includes('agriculture'));
  assert.ok(supportedCareerDomains.includes('technology'));
});
