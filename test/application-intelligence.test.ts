import test from 'node:test';
import assert from 'node:assert/strict';
import { HiredEngine } from '../src/engine.js';
import { testCandidate, testEvidence, testJobs } from './test-records.js';
import { auditPositionedClaim, buildPositioningPortfolio, buildPositioningVariants, positionCapability, CANDIDATE_POSITIONING_POLICY } from '../src/candidate-positioning.js';
import {
  alignJobDescription,
  analyzeResumeBullets,
  buildApplicationPackage,
  buildApplicationStrategy,
  buildJobAcquisitionLoop,
  discoverHiddenRoles
} from '../src/application-intelligence.js';

const candidate=testCandidate();
const evidence=testEvidence();
const jobs=testJobs();
const opportunities = () => {
  const engine = new HiredEngine(candidate,evidence);
  return jobs.map(job=>engine.ingest(job));
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
  assert.ok(alignment.positionedRequirements.every(claim=>claim.defendabilityScore>=0 && claim.defendabilityScore<=100));
});

test('candidate positioning policy optimizes favorable framing without inventing material facts', () => {
  assert.match(CANDIDATE_POSITIONING_POLICY.objective,/strongest credible fit/i);
  assert.ok(CANDIDATE_POSITIONING_POLICY.evidenceLimitedLatitude.some(rule=>/transferable|adjacent/i.test(rule)));
  assert.ok(CANDIDATE_POSITIONING_POLICY.evidenceLimitedLatitude.some(rule=>/rhetorical strengthening/i.test(rule)));
  assert.ok(CANDIDATE_POSITIONING_POLICY.prohibited.some(rule=>/metrics/i.test(rule)));

  const supported = positionCapability({ profile:candidate, evidence, requirement:'AI agents' });
  assert.equal(supported.permitted,true);
  assert.ok(['verified','supported'].includes(supported.confidence));
  assert.ok(supported.defendabilityScore > 0);
  assert.ok(supported.proofPrompt.length > 0);

  const adjacent = positionCapability({ profile:candidate, evidence:[], requirement:'Kubernetes' });
  assert.equal(adjacent.permitted,true);
  assert.equal(adjacent.confidence,'evidence-limited');
  assert.equal(adjacent.risk,'medium');

  const unsupported = positionCapability({ profile:candidate, evidence:[], requirement:'registered nursing license' });
  assert.equal(unsupported.permitted,false);
  assert.equal(unsupported.confidence,'unsupported');
  assert.equal(auditPositionedClaim(unsupported).permitted,false);
});

test('positioning optimizer produces calibrated variants without relaxing factual boundaries', () => {
  const direct = positionCapability({ profile:candidate, evidence, requirement:'AI agents' });
  const directVariants = buildPositioningVariants(direct);
  assert.deepEqual(directVariants.map(v=>v.style),['precise','confident','assertive']);
  assert.ok(directVariants.every(v=>v.permitted));
  assert.ok(directVariants[0].defendabilityScore >= directVariants[2].defendabilityScore);

  const unsupported = positionCapability({ profile:candidate, evidence:[], requirement:'licensed physician' });
  const blocked = buildPositioningVariants(unsupported);
  assert.equal(blocked.length,1);
  assert.equal(blocked[0].permitted,false);
});

test('positioning portfolio ranks strongest proof ahead of evidence-limited claims', () => {
  const portfolio = buildPositioningPortfolio({
    profile:candidate,
    evidence,
    requirements:['AI agents','TypeScript','AWS','registered nursing license'],
    leadCount:2
  });
  assert.equal(portfolio.claims.length,4);
  assert.ok(portfolio.leadClaims.length<=2);
  assert.ok(portfolio.blockedClaims.some(claim=>claim.confidence==='unsupported'));
  assert.ok(portfolio.evidenceLimitedClaims.some(claim=>claim.confidence==='evidence-limited'));
  assert.ok(portfolio.coverageScore>0 && portfolio.coverageScore<100);
  assert.ok(portfolio.leadClaims.every((claim,index)=>index===0 || portfolio.leadClaims[index-1].defendabilityScore>=claim.defendabilityScore));
});

test('application package creates strongly positioned resume, cover-letter and recruiter outreach briefs', () => {
  const opportunity = opportunities()[0];
  const pack = buildApplicationPackage(candidate,evidence,opportunity,['Responsible for building backend services','Automated deployment workflow']);
  assert.equal(pack.outreach.maxWords,100);
  assert.ok(pack.outreach.message.split(/\s+/).length <= 100);
  assert.deepEqual(pack.outreach.followUpDays,[5,12]);
  assert.match(pack.positioning.objective,/strongest credible fit/i);
  assert.ok(pack.positioning.executionRules.some(rule=>/proof path/i.test(rule)));
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
  assert.ok(loop.positioning.executionRules.some(step=>/conversion optimization/i.test(step)));
  assert.ok(loop.feedbackLoop.some(step=>/outcomes/i.test(step)));
  assert.match(loop.truthGate,/Evidence-limited adjacent inferences are allowed/i);
  assert.match(loop.truthGate,/no artifact may invent a material fact/i);
});
