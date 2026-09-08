import test from 'node:test';
import assert from 'node:assert/strict';
import { HiredEngine } from '../src/engine.js';
import { analyzeCompetitiveApplication, detectKeywordGaps, mapRequirementsToEvidence, simulateCompetitiveSelection } from '../src/candidate-selection-intelligence.js';
import { testCandidate, testEvidence, testJobs } from './test-records.js';

const candidate = testCandidate();
const evidence = testEvidence();
const opportunity = new HiredEngine(candidate,evidence).ingest(testJobs()[0]);
const resume = `
Test Candidate
Software Engineer
Built backend services with TypeScript and Node.js.
Implemented distributed systems and AI agents.
GitHub: https://github.com/test/candidate
`;

test('maps each role requirement to truthful evidence coverage and finds proof outside the resume', () => {
  const map = mapRequirementsToEvidence({ profile:candidate, evidence, opportunity, resumeText:resume });
  assert.equal(map.length,new Set([...opportunity.job.requirements,...opportunity.job.preferred]).size);
  assert.ok(map.some(item=>item.coverage==='Strong' || item.coverage==='Moderate'));
  assert.ok(map.some(item=>item.portfolioOnly));
  assert.ok(map.every(item=>item.claim.permitted || item.coverage==='Missing'));
  assert.ok(map.filter(item=>item.portfolioOnly).every(item=>item.evidenceIds.length>0));
});

test('keyword gap detection distinguishes supported missing terms from unsupported keyword stuffing', () => {
  const map = mapRequirementsToEvidence({ profile:candidate, evidence, opportunity, resumeText:resume });
  const gaps = detectKeywordGaps(map,resume);
  assert.ok(gaps.some(gap=>gap.status==='supported-but-missing' || gap.status==='weakly-supported'));
  assert.ok(gaps.every(gap=>gap.recommendation.length>0));
});

test('competitive analysis evaluates hiring manager, recruiter and ATS perspectives', () => {
  const analysis = analyzeCompetitiveApplication({
    profile:candidate,
    evidence,
    opportunity,
    resumeText:resume,
    applicantPool:200,
    interviewSlots:10
  });
  assert.deepEqual(analysis.perspectives.map(p=>p.perspective),['hiring-manager','senior-recruiter','ats']);
  assert.ok(analysis.perspectives.every(p=>p.score>=0 && p.score<=100));
  assert.equal(analysis.simulation.assumedApplicantPool,200);
  assert.equal(analysis.simulation.assumedInterviewSlots,10);
  assert.ok(analysis.simulation.estimatedInterviewProbability>=0 && analysis.simulation.estimatedInterviewProbability<=100);
  assert.match(analysis.simulation.estimateBasis[0],/heuristic estimate/i);
  assert.match(analysis.evidenceDiscoveryRule,/not present on the resume/i);
  assert.match(analysis.evidenceDiscoveryRule,/GitHub/i);
  assert.match(analysis.truthRule,/never invent/i);
  assert.ok(analysis.topFiveChanges.length<=5);
  assert.ok(analysis.roleSpecificResumePlan.length>=5);
});

test('selection simulation penalizes real missing evidence rather than fabricating fit', () => {
  const unsupportedCandidate = testCandidate({ headline:'General worker', skills:[] });
  const unsupportedOpportunity = new HiredEngine(unsupportedCandidate,[]).ingest(testJobs()[0]);
  const map = mapRequirementsToEvidence({ profile:unsupportedCandidate, evidence:[], opportunity:unsupportedOpportunity, resumeText:'General worker' });
  const perspectives = [
    { perspective:'hiring-manager' as const, score:20, positives:[], risks:['missing proof'], decisionSignal:'reject-risk' as const },
    { perspective:'senior-recruiter' as const, score:15, positives:[], risks:['missing proof'], decisionSignal:'reject-risk' as const },
    { perspective:'ats' as const, score:10, positives:[], risks:['missing proof'], decisionSignal:'reject-risk' as const }
  ];
  const simulation = simulateCompetitiveSelection({ perspectives, map, applicantPool:200, interviewSlots:10 });
  assert.equal(map.every(item=>item.coverage==='Missing'),true);
  assert.equal(simulation.verdict,'unlikely-shortlist');
  assert.ok(simulation.likelyRejectionReasons.length>0);
});
