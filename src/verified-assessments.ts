import { createHash } from 'node:crypto';

export type AssessmentMode = 'practice' | 'candidate-requested' | 'employer-requested';
export type AssessmentKind = 'structured-interview' | 'work-sample' | 'scenario' | 'technical' | 'communication' | 'writing' | 'analysis' | 'role-knowledge' | 'problem-solving';

export interface AssessmentCriterion {
  id: string;
  label: string;
  weight: number;
  minimum?: number;
}

export interface AssessmentDefinition {
  id: string;
  title: string;
  profession: string;
  kind: AssessmentKind;
  criteria: AssessmentCriterion[];
  instructions: string[];
}

export interface AssessmentObservation {
  criterionId: string;
  score: number;
  evidence: string;
  evaluator: 'ai' | 'human' | 'hybrid';
}

export interface AssessmentResult {
  assessmentId: string;
  candidateId: string;
  mode: AssessmentMode;
  score: number;
  passed: boolean;
  observations: AssessmentObservation[];
  strengths: string[];
  growthAreas: string[];
  integrityDigest: string;
  completedAt: string;
}

export interface SkillBadge {
  id: string;
  candidateId: string;
  label: string;
  profession: string;
  assessmentId: string;
  score: number;
  evidenceDigest: string;
  issuedAt: string;
  expiresAt?: string;
  status: 'active' | 'expired' | 'revoked';
}

function clamp(value: number) { return Math.max(0, Math.min(100, value)); }
function digest(value: unknown) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }

export function evaluateAssessment(definition: AssessmentDefinition, candidateId: string, mode: AssessmentMode, observations: AssessmentObservation[], completedAt = new Date().toISOString()): AssessmentResult {
  const criterionMap = new Map(definition.criteria.map(item => [item.id, item]));
  for (const observation of observations) {
    if (!criterionMap.has(observation.criterionId)) throw new Error(`unknown criterion: ${observation.criterionId}`);
    if (!Number.isFinite(observation.score) || observation.score < 0 || observation.score > 100) throw new Error(`invalid score for ${observation.criterionId}`);
    if (!observation.evidence.trim()) throw new Error(`evidence required for ${observation.criterionId}`);
  }
  const observedByCriterion = new Map(observations.map(item => [item.criterionId, item]));
  const weightTotal = definition.criteria.reduce((sum, criterion) => sum + Math.max(0, criterion.weight), 0) || 1;
  const weighted = definition.criteria.reduce((sum, criterion) => sum + (observedByCriterion.get(criterion.id)?.score ?? 0) * Math.max(0, criterion.weight), 0);
  const score = clamp(Math.round(weighted / weightTotal));
  const passed = definition.criteria.every(criterion => {
    const observation = observedByCriterion.get(criterion.id);
    return Boolean(observation) && observation!.score >= (criterion.minimum ?? 0);
  });
  const strengths = observations.filter(item => item.score >= 80).map(item => criterionMap.get(item.criterionId)!.label);
  const growthAreas = observations.filter(item => item.score < 70).map(item => criterionMap.get(item.criterionId)!.label);
  const canonical = { assessmentId: definition.id, candidateId, mode, score, passed, observations, completedAt };
  return { ...canonical, strengths, growthAreas, integrityDigest: digest(canonical) };
}

export function issueVerifiedBadge(definition: AssessmentDefinition, result: AssessmentResult, label = definition.title, expiresAt?: string): SkillBadge {
  if (!result.passed) throw new Error('badge requires a passing verified assessment');
  if (result.assessmentId !== definition.id) throw new Error('assessment mismatch');
  const issuedAt = new Date().toISOString();
  const evidenceDigest = digest({ definition, result });
  return {
    id: `badge_${evidenceDigest.slice(0, 20)}`,
    candidateId: result.candidateId,
    label,
    profession: definition.profession,
    assessmentId: definition.id,
    score: result.score,
    evidenceDigest,
    issuedAt,
    expiresAt,
    status: expiresAt && Date.parse(expiresAt) < Date.now() ? 'expired' : 'active'
  };
}

export interface InterviewTurn {
  question: string;
  competency: string;
  followUps: string[];
}

export function buildAIInterview(definition: AssessmentDefinition): InterviewTurn[] {
  if (definition.kind !== 'structured-interview') throw new Error('AI interview requires a structured-interview assessment');
  return definition.criteria.map(criterion => ({
    question: `Tell me about a specific situation that demonstrates ${criterion.label.toLowerCase()}. What was the context, what did you personally do, and what happened?`,
    competency: criterion.label,
    followUps: [
      'What part of that outcome was directly attributable to your actions?',
      'What evidence could verify the result?',
      'What would you do differently with what you know now?'
    ]
  }));
}
