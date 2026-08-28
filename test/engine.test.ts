import test from 'node:test';
import assert from 'node:assert/strict';
import { HiredEngine } from '../src/engine.js';
import { testCandidate, testEvidence, testJobs } from './test-records.js';

const candidate = testCandidate();
const evidence = testEvidence();
const jobs = testJobs();
const fresh = () => new HiredEngine(candidate, evidence);

test('qualifies a strong NYC opportunity and produces evidence-grounded score', () => {
  const engine = fresh(); const opp = engine.ingest(jobs[0]);
  assert.equal(opp.state, 'QUALIFIED'); assert.equal(opp.hardRejected, false); assert.ok(opp.score.total >= 70); assert.ok(opp.evidenceIds.length >= 3);
});

test('hard-rejects an out-of-area onsite job', () => {
  const engine = fresh(); const opp = engine.ingest(jobs[1]);
  assert.equal(opp.state, 'REJECTED'); assert.equal(opp.hardRejected, true); assert.match(opp.rejectionReasons.join(' '), /location/);
});

test('blocks duplicate job ingestion', () => {
  const engine = fresh(); engine.ingest(jobs[0]); assert.throws(() => engine.ingest(jobs[0]), /duplicate/);
});

test('does not execute identity-bearing action without explicit approval', () => {
  const engine = fresh(); const opp = engine.ingest(jobs[0]); const request = engine.requestApplication(opp.id);
  assert.equal(request.status, 'PENDING'); assert.throws(() => engine.governor.executeApproved(request.id), /explicit approval/);
  engine.governor.approve(request.id); const payload = engine.governor.executeApproved(request.id); assert.ok(payload);
});

test('creates truthful gap disclosures instead of fabricating missing skills', () => {
  const engine = fresh(); const opp = engine.ingest({ ...jobs[0], sourceId:'gap-1', requirements:['Python','C++'] }); const pkg = engine.package(opp.id);
  assert.ok(opp.gaps.some(g => g.skill === 'C++' && g.strength === 'missing'));
  assert.ok(pkg.resume.gapDisclosures.some(x => x.includes('C++')));
});
