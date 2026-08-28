import test from 'node:test';
import assert from 'node:assert/strict';
import { HiredEngine } from '../src/engine.js';
import { testCandidate } from './test-records.js';

const candidate=testCandidate();
const job = {
  source:'test', sourceId:'job-1', url:'https://test.invalid/job-1', company:'Test Co', title:'Software Engineer', location:'New York, NY', workMode:'hybrid' as const,
  description:'Build TypeScript services.', requirements:['TypeScript'], preferred:[], salaryMin:120000, salaryMax:150000, postedAt:new Date().toISOString()
};

test('Career Twin, outcomes, saved opportunities and watch rules survive engine restore', () => {
  const engine = new HiredEngine(candidate, [{ id:'e1',skill:'TypeScript',repository:'repo',url:'https://test.invalid/repo',claim:'Built TypeScript services',verification:'repository',strength:0.95 }]);
  const opportunity = engine.ingest(job);
  const observedAt = new Date().toISOString();
  engine.updateCareerTwin('preferredWork', { key:'preferredWork', value:['systems design'], source:'user', confidence:'confirmed', evidenceIds:[], observedAt });
  engine.saveOpportunity(opportunity.id, 'Strong role', 'high');
  engine.upsertOpportunityWatch({ id:'watch-1', candidateId:candidate.id, query:'software engineer', targetTitles:['software engineer'], locations:['New York'], workModes:['hybrid','remote'], minimumSalary:120000, minimumFitScore:70, cadence:'daily', enabled:true, createdAt:observedAt, updatedAt:observedAt });
  engine.recordCareerOutcome({ id:'outcome-1', candidateId:candidate.id, opportunityId:opportunity.id, checkpoint:'offer', at:observedAt, compensationDelta:25000 });

  const restored = new HiredEngine(candidate, [...engine.store.evidence.values()], engine.durableState());
  restored.store.restore(engine.store.snapshot());

  assert.deepEqual(restored.careerTwin.current().preferredWork.value, ['systems design']);
  assert.equal(restored.savedOpportunities()[0]?.priority, 'high');
  assert.equal(restored.opportunityWatches()[0]?.minimumSalary, 120000);
  assert.equal(restored.careerOutcomeSummary().totalEvents, 1);
});

test('watch rules are scoped to the current candidate', () => {
  const engine = new HiredEngine(candidate);
  const at = new Date().toISOString();
  assert.throws(() => engine.upsertOpportunityWatch({ id:'bad', candidateId:'someone-else', query:'engineer', cadence:'daily', enabled:true, createdAt:at, updatedAt:at }), /candidate/);
});
