import test from 'node:test';
import assert from 'node:assert/strict';
import { SavedOpportunityStore } from '../src/saved-opportunities.js';
import type { Opportunity } from '../src/domain.js';

const opportunity = {
  id:'opp-1',
  job:{ source:'test',sourceId:'1',url:'https://example.com/1',company:'Acme',title:'Senior Software Engineer',location:'New York, NY',workMode:'hybrid',description:'Build TypeScript backend systems',requirements:['TypeScript'],preferred:[],salaryMin:150000,salaryMax:180000,postedAt:new Date().toISOString() },
  state:'QUALIFIED', hardRejected:false, rejectionReasons:[], intelligence:{normalizedRequirements:['typescript'],likelyInterviewAreas:[],seniority:'senior',teamSignals:[]}, gaps:[], evidenceIds:[],
  score:{technicalFit:95,compensation:90,careerUpside:90,location:100,evidenceStrength:95,competition:50,freshness:100,interviewProbability:85,total:91}, humanPaths:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()
} satisfies Opportunity;

test('enabled watch returns only opportunities meeting explicit constraints', () => {
  const store = new SavedOpportunityStore();
  const now = new Date().toISOString();
  store.upsertWatch({ id:'w1',candidateId:'c1',query:'software engineer',targetTitles:['software engineer'],locations:['New York'],workModes:['hybrid'],minimumSalary:160000,minimumFitScore:85,cadence:'daily',enabled:true,createdAt:now,updatedAt:now });
  const matches = store.evaluate([opportunity], 'c1', now);
  assert.equal(matches.length, 1);
  assert.equal(matches[0]?.opportunityId, 'opp-1');
  assert.ok(matches[0]?.reasons.includes('fit threshold met'));
});

test('disabled or under-threshold watches do not generate matches', () => {
  const store = new SavedOpportunityStore();
  const now = new Date().toISOString();
  store.upsertWatch({ id:'w1',candidateId:'c1',query:'software engineer',minimumSalary:250000,cadence:'daily',enabled:true,createdAt:now,updatedAt:now });
  store.upsertWatch({ id:'w2',candidateId:'c1',query:'software engineer',cadence:'daily',enabled:false,createdAt:now,updatedAt:now });
  assert.deepEqual(store.evaluate([opportunity], 'c1', now), []);
});
