import test from 'node:test';
import assert from 'node:assert/strict';
import { HiredEngine } from '../src/engine.js';
import { candidate, evidence } from '../src/seed.js';
import { demoJobs } from '../src/demo-data.js';
import {
  alignJobDescription,
  analyzeResumeBullets,
  buildApplicationPackage,
  buildApplicationStrategy,
  buildJobAcquisitionLoop,
  discoverHiddenRoles
} from '../src/application-intelligence.js';

const opportunities = () => {
  const engine = new HiredEngine(candidate,evidence);
  return demoJobs.map(job=>engine.ingest(job));
};

test('job alignment separates supported, underemphasized and unsupported requirements', () => {
  const opportunity = opportunities()[0];
  const alignment = alignJobDescription(candidate,evidence,opportunity);
  assert.equal(alignment.opportunityId,opportunity.id);
  assert.ok(alignment.fitScore >= 0 && alignment.fitScore <= 100);
  assert.ok(alignment.rule.includes('never invent'));
  const all = alignment.matchedRequirements.length + alignment.underemphasizedRequirements.length + alignment.unsupportedRequirements.length;
  assert.equal(all,new Set([...opportunity.job.requirements,...opportunity.job.preferred]).size);
});

test('application package creates evidence-grounded resume, cover-letter and recruiter outreach briefs', () => {
  const opportunity = opportunities()[0];
  const pack = buildApplicationPackage(candidate,evidence,opportunity,['Responsible for building backend services','Automated deployment workflow']);
  assert.equal(pack.outreach.maxWords,100);
  assert.ok(pack.outreach.message.split(/\s+/).length <= 100);
  assert.deepEqual(pack.outreach.followUpDays,[5,12]);
  assert.ok(pack.resume.rewriteRules.some(rule=>/never manufacture/i.test(rule)));
  assert.ok(pack.coverLetter.rules.some(rule=>/unsupported/i.test(rule)));
  assert.equal(pack.bulletInstructions.length,2);
});

test('bullet analysis refuses to fabricate outcomes and flags weak responsibility language', () => {
  const [bullet] = analyzeResumeBullets(['Responsible for APIs']);
  assert.ok(bullet.actionVerb);
  assert.equal(bullet.needsOutcome,true);
  assert.equal(bullet.needsSpecificity,true);
  assert.match(bullet.instruction,/do not create one/i);
});

test('hidden role finder ranks adjacent titles from candidate capability evidence', () => {
  const roles = discoverHiddenRoles(candidate,evidence,['Agent Engineer','AI Systems Engineer','Backend Engineer','Registered Nurse','Accountant']);
  assert.ok(roles.length > 0);
  assert.ok(roles.some(role=>/engineer/i.test(role.title)));
  assert.ok(roles.every((role,index)=>index===0 || roles[index-1].score >= role.score));
});

test('application strategy prefers selective quality and carries conversion diagnostics', () => {
  const strategy = buildApplicationStrategy({
    weeklyAvailabilityHours:15,
    opportunities:opportunities(),
    priorApplications:20,
    priorRecruiterScreens:1,
    priorInterviews:0,
    priorOffers:0
  });
  assert.ok(strategy.weeklyHighQualityApplications >= 3);
  assert.ok(strategy.weeklyHighQualityApplications <= 25);
  assert.ok(strategy.metrics.includes('application-to-screen rate'));
  assert.ok(strategy.diagnosticRules.some(rule=>/tighten targeting/i.test(rule)));
});

test('job acquisition loop composes discovery, prioritization, application artifacts and outcome learning', () => {
  const loop = buildJobAcquisitionLoop({
    profile:candidate,
    evidence,
    opportunities:opportunities(),
    weeklyAvailabilityHours:12,
    roleCatalog:['Agent Engineer','AI Platform Engineer','Backend Engineer'],
    resumeBullets:['Built agent workflows','Worked on APIs']
  });
  assert.ok(loop.hiddenRoles.length > 0);
  assert.equal(loop.packages.length,loop.strategy.priorityOrder.length);
  assert.ok(loop.feedbackLoop.some(step=>/outcomes/i.test(step)));
  assert.match(loop.truthGate,/No generated application artifact/);
});
