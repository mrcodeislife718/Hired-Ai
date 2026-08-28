import type { HiredEngine } from './engine.js';
import { buildMayaUniversalPlan, type MayaUniversalPlanInput } from './maya-universal-orchestrator.js';
import { toUniversalEvidence, type UniversalEvidence } from './universal-career-intelligence.js';

export function buildUniversalPlanFromEngine(
  engine: HiredEngine,
  opportunityId: string,
  options: Omit<MayaUniversalPlanInput,'profile'|'evidence'|'opportunity'> & { additionalEvidence?: UniversalEvidence[] } = {}
) {
  const packaged=engine.package(opportunityId);
  const legacyEvidence=[...engine.store.evidence.values()];
  const evidence=[...toUniversalEvidence(legacyEvidence),...(options.additionalEvidence??[])];
  const { additionalEvidence: _ignored, ...rest } = options;
  return buildMayaUniversalPlan({
    ...rest,
    profile:engine.profile,
    evidence,
    opportunity:packaged.opportunity
  });
}
