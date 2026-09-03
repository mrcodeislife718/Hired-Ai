import test from 'node:test';
import assert from 'node:assert/strict';
import { buildConversationAssessment, buildQuizQuestion, evaluateConversationAssessment } from '../src/conversation-assessments.js';

test('builds profession-neutral conversational assessments for employer use', () => {
  const assessment = buildConversationAssessment({
    id: 'rn-screen',
    profession: 'healthcare',
    role: 'Registered Nurse',
    mode: 'employer-requested',
    competencies: ['patient prioritization']
  });
  assert.equal(assessment.questions.length, 2);
  assert.ok(assessment.questions.every(question => question.competency === 'patient prioritization'));
  assert.ok(assessment.questions.some(question => question.format === 'conversation'));
  assert.ok(assessment.questions.some(question => question.format === 'scenario'));
});

test('supports quiz-style objective knowledge questions', () => {
  const question = buildQuizQuestion({
    id: 'q1', competency: 'basic arithmetic', prompt: 'What is 2 + 2?',
    options: ['3','4','5','6'], correctIndex: 1
  });
  assert.equal(question.format, 'single-choice');
  assert.equal(question.options?.[question.correctIndex], '4');
});

test('reports demonstrated, not-yet-demonstrated, and unknown rather than opaque candidate quality', () => {
  const assessment = buildConversationAssessment({
    id: 'sales', profession: 'sales', role: 'Account Executive', mode: 'candidate-verification',
    competencies: ['discovery','objection handling']
  });
  const first = assessment.questions.find(q => q.competency === 'discovery')!;
  const result = evaluateConversationAssessment(assessment, [{
    questionId: first.id,
    answer: 'A concrete customer example',
    observedSignals: ['specific context','candidate action','reasoning','observable result']
  }]);
  assert.ok(result.demonstrated.includes('discovery'));
  assert.ok(result.unknown.includes('objection handling'));
  assert.equal(result.evidenceDigest.length, 64);
});
