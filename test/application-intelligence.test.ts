import test from 'node:test';
import assert from 'node:assert/strict';
import { HiredEngine } from '../src/engine.js';
import { candidate, evidence } from '../src/seed.js';
import { demoJobs } from '../src/demo-data.js';
import { positionCapability, CANDIDATE_POSITIONING_POLICY } from '../src/candidate-positioning.js';
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

test('job alignment separates supported, evidence-limited and unsupported requirements', () => {
  const opportunity = opportunities()[0];
  const alignment = alignJobDescription(candidate,evidence,opportunity);
  assert.equal(alignment.opportunityId,opportunity.id);
  assert.ok(alignment.fitScore >= 0 && alignment.fitScore <= 100);
  assert.match(alignment.rule,/strongest credible fit/i);
  assert.match(alignment.rule,/never convert weak evidence into false facts/i);
  const all = alignment.matchedRequirements.length + alignment.underemphasizedRequirements.length + alignment.unsupportedRequirements.length;
  assert.equal(all,new Set([...opportunity.job.requirements,...opportunity.job.preferred]).size);
  assert.equal(alignment.positionedRequirements.length,all);
});

test('candidate positioning policy optimizes favorable framing without inventing material facts', () => {
  assert.match(CANDIDATE_POSITIONING_POLICY.objective,/strongest credible fit/i);
  assert.ok(CANDIDATE_POSITIONING_POLICY.evidenceLimitedLatitude.some(rule=>/transferable|adjacent/i.test(rule)));
  assert.ok(CANDIDATE_POSITIONING_POLICY.prohibited.some(rule=>/metrics/i.test(rule)));

  const supported = positionCapability({ profile:candidate, evidence, requirement:'AI agents' });
  assert.equal(supported.permitted,true);
  assert.ok(['verified','supported'].includes(supported.confidence));

  const adjacent = positionCapability({ profile:candidate, evidence:[], requirement:'Kubernetes' });
  assert.equal(adjacent.permitted,true);
  assert.equal(adjacent.confidence,'evidence-limited');

  const unsupported = positionCapability({ profile:candidate, evidence:[], requirement:'registered nursing license' });
  assert.equal(unsupported.permitted,false);
  assert.equal(unsupported.confidence,'unsupported');
});

test('application package creates strongly positioned resume, cover-letter and recruiter outreach briefs', () => {
  const opportunity = opportunities()[0];
  const pack = buildApplicationPackage(candidate,evidence,opportunity,['Responsible for building backend services','Automated deployment workflow']);
  assert.equal(pack.outreach.maxWords,100);
  assert.ok(pack.outreach.message.split(/\s+/).length <= 100);
  assert.deepEqual(pack.outreach.followUpDays,[5,12]);
  assert.match(pack.positioning.objective,/strongest credible fit/i);
  assert.ok(pack.resume.rewriteRules.some(rule=>/strongest defensible interpretation/i.test(rule)));
  assert.ok(pack.coverLetter.rules.some(rule=>/transferable|adjacent/i.test(rule)));
  assert.ok(pack.coverLetter.rules.some(rule=>/never invent/i.test(rule)));
  assert.equal(pack.bulletInstructions.length,2);
});

test('bullet analysis permits favorable qualitative framing but refuses fabricated facts', () => {
  const [bullet] = analyzeResumeBullets(['Responsible for APIs']);
  assert.ok(bullet.actionVerb);
  assert.equal(bullet.needsOutcome,true);
  assert.equal(bullet.needsSpecificity,true);
  assert.match(bullet.instruction,/qualitative impact/i);
  assert.match(bullet.instruction,/Do not invent/i);
});

test('hidden role finder ranks adjacent titles from candidate capability evidence', () => {
  const roles = discoverHiddenRoles(candidate,evidence,['Agent Engineer','AI Systems Engineer','Backend Engineer','Registered Nurse','Accountant']);
  assert.ok(roles.length > 0);
  assert.ok(roles.some(role=>/engineer/i.test(role.title)));
  assert.ok(roles.every((role,index)=>index===0 || roles[index-1].score >= role.score));
});

test('application strategy prefers selective quality and tracks positioning variants', () => {
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
  assert.ok(strategy.metrics.includes('response rate by positioning variant'));
  assert.ok(strategy.diagnosticRules.some(rule=>/strengthen candidate positioning/i.test(rule)));
});

test('job acquisition loop composes positioning, discovery, application artifacts and outcome learning', () => {
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
  assert.match(loop.positioning.selectionRule,/strongest credible positioning/i);
  assert.ok(loop.feedbackLoop.some(step=>/outcomes/i.test(step)));
  assert.match(loop.truthGate,/Evidence-limited adjacent inferences are allowed/i);
  assert.match(loop.truthGate,/no artifact may invent a material fact/i);
});
