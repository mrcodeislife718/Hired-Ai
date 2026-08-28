import test from 'node:test';
import assert from 'node:assert/strict';
import { HiredEngine } from '../src/engine.js';
import { testCandidate, testEvidence, testJobs } from './test-records.js';

const candidate=testCandidate();
const evidence=testEvidence();
const jobs=testJobs();
const fresh = () => {
  const engine = new HiredEngine(candidate, evidence);
  jobs.forEach(job => engine.ingest(job));
  return engine;
};

test('selective opportunity decisions pursue only roles supported by readiness and value', () => {
  const engine = fresh();
  const decisions = engine.selectiveOpportunities(70);
  assert.ok(decisions.length >= 2);
  assert.ok(decisions.some(d => d.decision === 'pursue'));
  assert.ok(decisions.some(d => d.decision === 'skip'));
  for (const decision of decisions.filter(d => d.decision === 'pursue')) {
    assert.equal(decision.readiness.canOccupyRole, true);
    assert.ok(decision.opportunityScore >= 70);
  }
});

test('career audit detects stale resume and surfaces stronger verified evidence', () => {
  const engine = fresh();
  const staleResume = `Professional Summary\nSoftware Engineer\nExperience\nAcme Corp 2018 - 2022\nBuilt JavaScript applications.\nhttps://linkedin.com/in/example`;
  const plan = engine.auditCareer(staleResume, ['linkedin']);
  assert.equal(plan.resume.parsed.likelyOutdated, true);
  assert.ok(plan.resume.verifiedSkillsMissingFromResume.length > 0);
  assert.ok(plan.resume.modernization.recommendedActions.some(a => /verified portfolio evidence/i.test(a)));
  assert.ok(plan.nextActions.some(a => /modernize the resume/i.test(a)));
});

test('career audit produces network and development actions rather than only job applications', () => {
  const engine = fresh();
  const plan = engine.auditCareer('Software Engineer\n2026\nJavaScript TypeScript Node.js\nhttps://github.com/example\nhttps://linkedin.com/in/example', ['linkedin']);
  assert.ok(plan.network.some(a => a.kind === 'github'));
  assert.ok(plan.network.some(a => a.kind === 'social-positioning'));
  assert.ok(Array.isArray(plan.development.actions));
  assert.ok(plan.nextActions.some(a => /relationship|career-presence/i.test(a)));
});

test('application request remains blocked when the user cannot credibly operate in the role', () => {
  const engine = new HiredEngine(candidate, evidence);
  const opportunity = engine.ingest({
    ...jobs[0],
    sourceId: 'readiness-block',
    requirements: ['C++', 'Rust', 'CUDA', 'Kubernetes']
  });
  const readiness = engine.assessReadiness(opportunity.id);
  assert.equal(readiness.canOccupyRole, false);
  assert.throws(() => engine.requestApplication(opportunity.id), /role readiness gate blocked application/);
});

test('career status prioritizes pursuable roles and separates development candidates', () => {
  const engine = fresh();
  const status = engine.careerStatus();
  assert.ok(Array.isArray(status.priority));
  assert.ok(Array.isArray(status.developmentCandidates));
  assert.ok(status.priority.every(d => d.decision === 'pursue'));
  assert.ok(status.developmentCandidates.every(d => d.decision === 'develop-first'));
});
