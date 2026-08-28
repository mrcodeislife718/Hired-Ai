import test from 'node:test';
import assert from 'node:assert/strict';
import { assessOpportunityReliability, canonicalOpportunityKey, shouldRecommendWithoutReverification } from '../src/opportunity-reliability.js';
import { HiredEngine } from '../src/engine.js';
import { testCandidate, testEvidence, testJobs } from './test-records.js';

const candidate=testCandidate();
const evidence=testEvidence();
const jobs=testJobs();

test('fresh complete listings receive a recommendable reliability envelope', () => {
  const job = { ...jobs[0], postedAt: new Date().toISOString() };
  const reliability = assessOpportunityReliability(job);
  assert.equal(reliability.freshnessStatus, 'fresh');
  assert.ok(reliability.confidence >= 0.55);
  assert.equal(shouldRecommendWithoutReverification(reliability), true);
  assert.equal(reliability.unknowns.length, 0);
});

test('stale listings are blocked pending source re-verification', () => {
  const postedAt = new Date(Date.now() - 60 * 86_400_000).toISOString();
  const reliability = assessOpportunityReliability({ ...jobs[0], postedAt });
  assert.equal(reliability.freshnessStatus, 'stale');
  assert.equal(shouldRecommendWithoutReverification(reliability), false);
});

test('canonical identity survives source changes for syndicated duplicates', () => {
  const first = { ...jobs[0], source: 'greenhouse', sourceId: 'req-123' };
  const second = { ...jobs[0], source: 'aggregator', sourceId: 'req-123' };
  assert.equal(canonicalOpportunityKey(first), canonicalOpportunityKey(second));
});

test('engine rejects the same canonical role arriving from another source', () => {
  const engine = new HiredEngine(candidate, evidence);
  const first = { ...jobs[0], source: 'greenhouse', sourceId: 'req-123' };
  const second = { ...jobs[0], source: 'aggregator', sourceId: 'req-123' };
  engine.ingest(first);
  assert.throws(() => engine.ingest(second), /duplicate opportunity across sources/);
});
