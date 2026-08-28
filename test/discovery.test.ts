import test from 'node:test';
import assert from 'node:assert/strict';
import { DiscoveryOrchestrator, sourcesFromEnv, type JobSource } from '../src/discovery.js';
import { testJobs } from './test-records.js';

const jobs=testJobs();

test('discovery isolates source failures and keeps healthy results', async () => {
  const good:JobSource={name:'good',discover:async()=>[jobs[0]]}; const bad:JobSource={name:'bad',discover:async()=>{throw new Error('down')}};
  const result=await new DiscoveryOrchestrator([bad,good]).run(); assert.equal(result.jobs.length,1); assert.equal(result.failures.length,1); assert.equal(result.failures[0].source,'bad');
});

test('sources are explicitly configured rather than scraping arbitrary sites', () => {
  const sources=sourcesFromEnv({GREENHOUSE_BOARDS:'alpha,beta',LEVER_COMPANIES:'gamma',JOB_JSON_FEEDS:''} as NodeJS.ProcessEnv);
  assert.equal(sources.length,3);
});
