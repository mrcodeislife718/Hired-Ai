import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateInsights, buildTrainingCorpus, trainingEligible, type InsightEvent } from '../src/career-insight-network.js';

const example: InsightEvent = {id:'1',subjectId:'candidate-1',kind:'hire',occurredAt:'2026-09-03T12:00:00Z',profession:'sales',industry:'software',employerSegment:'startup',outcome:'hired',source:'hired-ai',verified:true,analyticsConsent:true,modelTrainingConsent:true,sensitive:false};

test('training data must be eligible and consented',()=>{
  assert.equal(trainingEligible(example),true);
  assert.equal(trainingEligible({...example,modelTrainingConsent:false}),false);
  assert.equal(trainingEligible({...example,verified:false}),false);
  assert.equal(buildTrainingCorpus([example])[0].subjectKey.length,24);
});

test('aggregate insights require a minimum cohort',()=>{
  const events=Array.from({length:5},(_,i)=>({...example,id:String(i),subjectId:`candidate-${i}`,numericValue:100+i}));
  assert.equal(aggregateInsights(events,5).length,1);
  assert.equal(aggregateInsights(events,6).length,0);
});
