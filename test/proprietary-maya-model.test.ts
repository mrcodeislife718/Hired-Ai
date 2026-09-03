import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProprietaryTrainingDataset, createTrainingManifest } from '../src/proprietary-maya-model.js';
import type { InsightEvent } from '../src/career-insight-network.js';

const event: InsightEvent = {id:'e1',subjectId:'u1',kind:'hire',occurredAt:'2026-09-03T12:00:00Z',profession:'operations',source:'hired-ai',verified:true,analyticsConsent:true,modelTrainingConsent:true,sensitive:false};

test('proprietary dataset combines approved company examples with consented verified outcomes',()=>{
  const examples=[{id:'c1',task:'career-plan',input:'target',idealOutput:'evidence-based plan',source:'hired-ai-policy' as const,approved:true}];
  const dataset=buildProprietaryTrainingDataset(examples,[event]);
  assert.equal(dataset.rows.length,2);
  assert.equal(dataset.datasetDigest.length,64);
  const manifest=createTrainingManifest(examples,[event],'2026-09-03T12:00:00Z');
  assert.equal(manifest.releaseBlockedUntilPassed,true);
  assert.ok(manifest.requiredEvaluations.includes('career-outcome-quality'));
});
