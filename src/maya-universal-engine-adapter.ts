import type { HiredEngine } from './engine.js';
import { analyzeCompetitiveApplication } from './candidate-selection-intelligence.js';
import { buildMayaUniversalPlan, type MayaUniversalPlanInput } from './maya-universal-orchestrator.js';
import { toUniversalEvidence, type UniversalEvidence } from './universal-career-intelligence.js';

export function buildUniversalPlanFromEngine(
  engine: HiredEngine,
  opportunityId: string,
  options: Omit<MayaUniversalPlanInput,'profile'|'evidence'|'opportunity'> & { additionalEvidence?: UniversalEvidence[]; resumeText?: string } = {}
) {
  const packaged=engine.package(opportunityId);
  const legacyEvidence=[...engine.store.evidence.values()];
  const evidence=[...toUniversalEvidence(legacyEvidence),...(options.additionalEvidence??[])];
  const { additionalEvidence: _ignored, resumeText, ...rest } = options;
  const universal=buildMayaUniversalPlan({
    ...rest,
    profile:engine.profile,
    evidence,
    opportunity:packaged.opportunity
  });
  const competitiveSelection=analyzeCompetitiveApplication({
    profile:engine.profile,
    evidence:legacyEvidence,
    opportunity:packaged.opportunity,
    resumeText:resumeText?.trim() || JSON.stringify(packaged.resume),
    applicantPool:packaged.opportunity.job.applicantCount
  });
  return {...universal,competitiveSelection};
}
