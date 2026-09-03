import { createHash } from 'node:crypto';
import type { InsightEvent } from './career-insight-network.js';
import { buildTrainingCorpus } from './career-insight-network.js';

export interface CuratedCompanyExample {
  id: string;
  task: string;
  input: string;
  idealOutput: string;
  source: 'hired-ai-policy'|'career-research'|'verified-outcome-pattern'|'assessment-rubric';
  approved: boolean;
}

export interface TrainingManifest {
  id: string;
  createdAt: string;
  companyExamples: number;
  userDerivedExamples: number;
  datasetDigest: string;
  requiredEvaluations: string[];
  releaseBlockedUntilPassed: boolean;
}

export function buildProprietaryTrainingDataset(companyExamples: CuratedCompanyExample[], events: InsightEvent[]) {
  const curated = companyExamples.filter(example=>example.approved).map(example=>({
    kind:'company-example' as const,
    id:example.id,
    task:example.task,
    input:example.input,
    idealOutput:example.idealOutput,
    source:example.source
  }));
  const userDerived = buildTrainingCorpus(events).map(event=>({kind:'consented-outcome-signal' as const,event}));
  const rows = [...curated,...userDerived];
  const datasetDigest = createHash('sha256').update(JSON.stringify(rows)).digest('hex');
  return { rows, datasetDigest };
}

export function createTrainingManifest(companyExamples: CuratedCompanyExample[], events: InsightEvent[], createdAt = new Date().toISOString()): TrainingManifest {
  const dataset = buildProprietaryTrainingDataset(companyExamples,events);
  return {
    id:`maya_training_${dataset.datasetDigest.slice(0,16)}`,
    createdAt,
    companyExamples:dataset.rows.filter(row=>row.kind==='company-example').length,
    userDerivedExamples:dataset.rows.filter(row=>row.kind==='consented-outcome-signal').length,
    datasetDigest:dataset.datasetDigest,
    requiredEvaluations:[
      'career-truthfulness','application-fact-integrity','bounded-autonomy','cross-industry-coverage','bias-resistance','assessment-grounding','Maya-voice-consistency','career-outcome-quality'
    ],
    releaseBlockedUntilPassed:true
  };
}

export const PROPRIETARY_MODEL_DOCTRINE = {
  objective:'Build proprietary career intelligence from first-party company knowledge plus explicitly consented, privacy-protected, outcome-linked data.',
  rules:[
    'Do not train on private user conversations merely because Hired AI can access them.',
    'User-derived training requires explicit model-training consent and analytics eligibility.',
    'Exclude sensitive data and protected-trait inference from model-training datasets.',
    'Prefer verified outcome-linked examples over engagement signals.',
    'Keep holdout evaluations separate from training data.',
    'Every model release must have a dataset manifest, lineage digest, evaluation results, rollback target, and version identifier.',
    'The proprietary model may advise and rank, but deterministic systems retain authority over billing, identity-bearing actions, verified evidence, and external delivery.'
  ]
} as const;
