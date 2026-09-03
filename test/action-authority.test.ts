import test from 'node:test';
import assert from 'node:assert/strict';
import { CareerActionAuthority, createExternalActionReceipt } from '../src/action-authority.js';

test('keeps consequential career actions inside explicit authority boundaries', () => {
  const authority = new CareerActionAuthority();
  assert.equal(authority.decide('search_jobs').allowed, true);
  assert.equal(authority.decide('submit_application').approvalRequired, true);
  assert.equal(authority.decide('submit_application', ['submit_application']).allowed, true);
  assert.equal(authority.decide('accept_offer').allowed, false);
});

test('requires proof before an external action is called verified', () => {
  assert.throws(() => createExternalActionReceipt({ id: 'r1', action: 'submit_application', target: 'job-1', verified: true, reversible: false }), /requires evidence/);
  const receipt = createExternalActionReceipt({ id: 'r2', action: 'submit_application', target: 'job-1', verified: true, reversible: false, externalReference: 'ats:123' });
  assert.equal(receipt.verified, true);
});
