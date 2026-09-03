import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAIInterview, evaluateAssessment, issueVerifiedBadge, type AssessmentDefinition } from '../src/verified-assessments.js';

const definition: AssessmentDefinition = {
  id: 'assessment_sales_manager_v1',
  title: 'Verified Sales Manager',
  profession: 'sales management',
  kind: 'structured-interview',
  instructions: ['Use concrete examples and attributable outcomes.'],
  criteria: [
    { id: 'leadership', label: 'Team leadership', weight: 2, minimum: 70 },
    { id: 'forecasting', label: 'Forecasting discipline', weight: 1, minimum: 70 }
  ]
};

test('assessment requires evidence and issues a verifiable badge only after passing', () => {
  const result = evaluateAssessment(definition, 'candidate_1', 'employer-requested', [
    { criterionId: 'leadership', score: 90, evidence: 'Led eight-person team with documented quota results', evaluator: 'hybrid' },
    { criterionId: 'forecasting', score: 80, evidence: 'Explained forecast process and variance controls', evaluator: 'ai' }
  ], '2026-09-03T12:00:00.000Z');
  assert.equal(result.passed, true);
  assert.equal(result.score, 87);
  assert.equal(result.integrityDigest.length, 64);
  const badge = issueVerifiedBadge(definition, result);
  assert.equal(badge.status, 'active');
  assert.equal(badge.evidenceDigest.length, 64);
});

test('AI interviewer derives a structured question for every competency', () => {
  const interview = buildAIInterview(definition);
  assert.equal(interview.length, 2);
  assert.match(interview[0].question, /specific situation/i);
  assert.equal(interview[0].followUps.length, 3);
});
