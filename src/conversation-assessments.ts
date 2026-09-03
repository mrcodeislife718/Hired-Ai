import { createHash } from 'node:crypto';

export type ConversationAssessmentMode = 'candidate-practice'|'candidate-verification'|'employer-requested';
export type QuestionFormat = 'conversation'|'single-choice'|'scenario'|'short-answer';

export interface ConversationQuestion {
  id: string;
  competency: string;
  prompt: string;
  format: QuestionFormat;
  options?: string[];
  expectedSignals: string[];
  disallowedInference?: string[];
}

export interface ConversationAnswer {
  questionId: string;
  answer: string;
  selectedOption?: number;
  observedSignals?: string[];
}

export interface ConversationAssessment {
  id: string;
  profession: string;
  role: string;
  mode: ConversationAssessmentMode;
  questions: ConversationQuestion[];
}

export interface ConversationAssessmentResult {
  assessmentId: string;
  demonstrated: string[];
  notYetDemonstrated: string[];
  unknown: string[];
  evidenceDigest: string;
  explanation: string;
}

export function buildConversationAssessment(input: {
  id: string;
  profession: string;
  role: string;
  mode: ConversationAssessmentMode;
  competencies: string[];
}): ConversationAssessment {
  const questions = input.competencies.flatMap((competency, index): ConversationQuestion[] => [
    {
      id: `${input.id}-${index + 1}-conversation`,
      competency,
      format: 'conversation',
      prompt: `Tell me about a real situation where you had to use ${competency}. What was happening, what did you do, and what happened next?`,
      expectedSignals: ['specific context','candidate action','reasoning','observable result'],
      disallowedInference: ['protected traits','personality diagnosis','motivation inferred from style alone']
    },
    {
      id: `${input.id}-${index + 1}-scenario`,
      competency,
      format: 'scenario',
      prompt: `Imagine you are doing the ${input.role} job and a realistic problem requires ${competency}. Explain what you would check first, what you would do, and how you would know it worked.`,
      expectedSignals: ['prioritization','job-relevant reasoning','verification','risk awareness'],
      disallowedInference: ['pedigree','accent','non-job-relevant fluency','background prestige']
    }
  ]);
  return {...input, questions};
}

export function buildQuizQuestion(input: {
  id: string;
  competency: string;
  prompt: string;
  options: [string,string,string,string];
  correctIndex: 0|1|2|3;
}): ConversationQuestion & { correctIndex: 0|1|2|3 } {
  return {
    id: input.id,
    competency: input.competency,
    prompt: input.prompt,
    format: 'single-choice',
    options: input.options,
    correctIndex: input.correctIndex,
    expectedSignals: ['objective knowledge for the specified competency']
  };
}

export function evaluateConversationAssessment(assessment: ConversationAssessment, answers: ConversationAnswer[]): ConversationAssessmentResult {
  const byQuestion = new Map(answers.map(answer => [answer.questionId, answer]));
  const demonstrated = new Set<string>();
  const notYetDemonstrated = new Set<string>();
  const unknown = new Set<string>();

  for (const question of assessment.questions) {
    const answer = byQuestion.get(question.id);
    if (!answer || !answer.answer.trim()) { unknown.add(question.competency); continue; }
    const observed = answer.observedSignals ?? [];
    const hits = question.expectedSignals.filter(signal => observed.includes(signal)).length;
    if (hits >= Math.max(1, Math.ceil(question.expectedSignals.length * 0.6))) demonstrated.add(question.competency);
    else notYetDemonstrated.add(question.competency);
  }

  for (const value of demonstrated) { notYetDemonstrated.delete(value); unknown.delete(value); }
  const evidenceDigest = createHash('sha256').update(JSON.stringify({assessment,answers})).digest('hex');
  return {
    assessmentId: assessment.id,
    demonstrated: [...demonstrated],
    notYetDemonstrated: [...notYetDemonstrated],
    unknown: [...unknown],
    evidenceDigest,
    explanation: 'This result reports job-relevant evidence observed in the assessment. It is not a personality score, protected-trait inference, or guarantee of job performance.'
  };
}
