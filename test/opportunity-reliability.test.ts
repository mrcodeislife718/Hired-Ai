import test from 'node:test';
import assert from 'node:assert/strict';
import { assessOpportunityReliability, canonicalOpportunityKey, shouldRecommendWithoutReverification } from '../src/opportunity-reliability.js';
import { HiredEngine } from '../src/engine.js';
import { candidate, evidence } from '../src/seed.js';
import { demoJobs } from '../src/demo-data.js';

test('fresh complete listings receive a recommendable reliability envelope', () => {
  const job = { ...demoJobs[0], postedAt: new Date().toISOString() };
  const reliability = assessOpportunityReliability(job);
  assert.equal(reliability.freshnessStatus, 'fresh');
  assert.ok(reliability.confidence >= 0.55);
  assert.equal(shouldRecommendWithoutReverification(reliability), true);
  assert.equal(reliability.unknowns.length, 0);
});

test('stale listings are blocked pending source re-verification', () => {
  const postedAt = new Date(Date.now() - 60 * 86_400_000).toISOString();
  const reliability = assessOpportunityReliability({ ...demoJobs[0], postedAt });
  assert.equal(reliability.freshnessStatus, 'stale');
  assert.equal(shouldRecommendWithoutReverification(reliability), false);
});

test('canonical identity survives source changes for syndicated duplicates', () => {
  const first = { ...demoJobs[0], source: 'greenhouse', sourceId: 'req-123' };
  const second = { ...demoJobs[0], source: 'aggregator', sourceId: 'req-123' };
  assert.equal(canonicalOpportunityKey(first), canonicalOpportunityKey(second));
});

test('engine rejects the same canonical role arriving from another source', () => {
  const engine = new HiredEngine(candidate, evidence);
  const first = { ...demoJobs[0], source: 'greenhouse', sourceId: 'req-123' };
  const second = { ...demoJobs[0], source: 'aggregator', sourceId: 'req-123' };
  engine.ingest(first);
  assert.throws(() => engine.ingest(second), /duplicate opportunity across sources/);
});
