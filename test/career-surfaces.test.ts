import test from 'node:test';
import assert from 'node:assert/strict';
import { auditGithubForCareer, buildInterviewPractice, buildNetworkingPlan, buildSocialCareerPlan, careerSurfaces, compareAndNegotiateOffers, surfaceCoverage } from '../src/career-surfaces.js';
import { HiredEngine } from '../src/engine.js';
import { testCandidate, testEvidence, testJobs } from './test-records.js';

const candidate=testCandidate();
const evidence=testEvidence();
const jobs=testJobs();

test('career surface map covers both sides and advanced Maya-only surfaces', () => {
  const coverage = surfaceCoverage();
  assert.ok(coverage.total >= 25);
  assert.ok(coverage.candidate >= 15);
  assert.ok(coverage.employer >= 8);
  for (const required of ['job-search','resume-studio','company-research','salary-intelligence','messages','interview-practice','offer-negotiation','github-career','social-career','networking','employer-sourcing','employer-screening','outcome-followup']) {
    assert.ok(careerSurfaces.some(surface => surface.id === required), `missing ${required}`);
  }
});

test('GitHub career audit rewards recruiter-readable proof and finds weak presentation', () => {
  const audit = auditGithubForCareer({
    repositories:[
      { name:'strong', description:'A strong system', hasReadme:true, hasTests:true, hasCi:true, hasDemo:true },
      { name:'messy', hasReadme:false, hasTests:false, hasCi:false, hasDemo:false }
    ],
    pinned:[]
  });
  assert.equal(audit.strongest[0].name, 'strong');
  assert.ok(audit.weakPresentation.some(repo => repo.name === 'messy'));
  assert.ok(audit.pinnedGaps.some(item => item.includes('strong')));
});

test('social and networking plans optimize for professional relevance not connection count', () => {
  const social = buildSocialCareerPlan(['linkedin'], ['AI Engineer'], evidence);
  assert.equal(social.platforms[0].platform, 'linkedin');
  assert.match(social.rule, /never manufacture engagement/i);
  const network = buildNetworkingPlan({ targetCompanies:['Test Systems'] });
  assert.match(network.antiSpamRule, /quality relationships/i);
  assert.ok(network.lanes.includes('hiring managers'));
});

test('offer comparison calculates economic totals without fabricating leverage', () => {
  const result = compareAndNegotiateOffers([
    { employer:'A', title:'Engineer', base:150000, bonus:10000 },
    { employer:'B', title:'Engineer', base:145000, equityAnnualized:30000 }
  ], 160000);
  assert.equal(result.strongestEconomicOffer, 'B');
  assert.match(result.truthRule, /never invent/i);
});

test('interview practice is grounded in an actual opportunity and includes candidate questions', () => {
  const engine = new HiredEngine(candidate, evidence);
  const opportunity = engine.ingest(jobs[0]);
  const plan = buildInterviewPractice(opportunity);
  assert.match(plan.role, /Test Systems/);
  assert.ok(plan.rounds.some(round => round.type === 'candidate-questions'));
  assert.ok(plan.scoring.includes('truthful handling of unknowns'));
});
