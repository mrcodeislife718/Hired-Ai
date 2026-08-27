import type { WorkMode } from './domain.js';

export interface FulfillmentPreferences {
  desiredWorkModes: WorkMode[];
  minimumBaseSalary?: number;
  targetBaseSalary?: number;
  preferredResponsibilities: string[];
  dislikedResponsibilities: string[];
  desiredGrowth: string[];
  desiredValues: string[];
  desiredIndustries: string[];
  desiredImpact: string[];
  managementPreferences: string[];
  pacePreference?: 'fast' | 'balanced' | 'steady';
  autonomyPreference?: 'high' | 'balanced' | 'structured';
  locationPreferences: string[];
  commuteToleranceMiles?: number;
}

export interface RoleExperienceProfile {
  workMode: WorkMode;
  salaryMin?: number;
  salaryMax?: number;
  responsibilities: string[];
  growthSignals: string[];
  values: string[];
  industry?: string;
  impactSignals: string[];
  managementSignals: string[];
  pace?: 'fast' | 'balanced' | 'steady';
  autonomy?: 'high' | 'balanced' | 'structured';
  location: string;
}

export interface FulfillmentAssessment {
  score: number;
  confidence: number;
  dimensions: {
    compensation: number;
    workMode: number;
    workContent: number;
    growth: number;
    values: number;
    impact: number;
    management: number;
    pace: number;
    autonomy: number;
    location: number;
  };
  positiveSignals: string[];
  concerns: string[];
  unknowns: string[];
  recommendation: 'strong-fit' | 'worth-exploring' | 'caution' | 'poor-fit';
}

const norm = (value: string) => value.trim().toLowerCase();
const overlap = (wanted: string[], offered: string[]) => {
  if (!wanted.length) return { score: 100, unknown: true };
  const offeredSet = new Set(offered.map(norm));
  const matched = wanted.filter(item => offeredSet.has(norm(item))).length;
  return { score: Math.round((matched / wanted.length) * 100), unknown: false };
};
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function assessFulfillment(preferences: FulfillmentPreferences, role: RoleExperienceProfile): FulfillmentAssessment {
  const unknowns: string[] = [];
  const concerns: string[] = [];
  const positiveSignals: string[] = [];

  const workMode = preferences.desiredWorkModes.includes(role.workMode) ? 100 : 25;
  if (workMode === 100) positiveSignals.push(`work mode matches ${role.workMode}`); else concerns.push(`work mode ${role.workMode} is outside stated preferences`);

  let compensation = 70;
  if (preferences.minimumBaseSalary !== undefined) {
    if (role.salaryMax === undefined) { compensation = 50; unknowns.push('maximum compensation is unknown'); }
    else if (role.salaryMax < preferences.minimumBaseSalary) { compensation = 0; concerns.push('compensation ceiling is below the stated minimum'); }
    else if (preferences.targetBaseSalary !== undefined && (role.salaryMin ?? role.salaryMax) >= preferences.targetBaseSalary) { compensation = 100; positiveSignals.push('compensation meets or exceeds target'); }
    else compensation = 80;
  } else if (role.salaryMin === undefined && role.salaryMax === undefined) unknowns.push('compensation is unknown');

  const likedWork = overlap(preferences.preferredResponsibilities, role.responsibilities);
  if (likedWork.unknown) unknowns.push('preferred work content has not been defined');
  const disliked = preferences.dislikedResponsibilities.filter(item => role.responsibilities.map(norm).includes(norm(item)));
  let workContent = clamp(likedWork.score - disliked.length * 20);
  if (disliked.length) concerns.push(`role includes disliked work: ${disliked.join(', ')}`);
  if (workContent >= 75) positiveSignals.push('day-to-day work aligns with stated interests');

  const growthResult = overlap(preferences.desiredGrowth, role.growthSignals);
  const valuesResult = overlap(preferences.desiredValues, role.values);
  const impactResult = overlap(preferences.desiredImpact, role.impactSignals);
  const managementResult = overlap(preferences.managementPreferences, role.managementSignals);
  for (const [unknown, label] of [[growthResult.unknown,'growth path'],[valuesResult.unknown,'values'],[impactResult.unknown,'desired impact'],[managementResult.unknown,'management preferences']] as const) if (unknown) unknowns.push(`${label} preference or evidence is incomplete`);

  const pace = preferences.pacePreference ? (role.pace ? (preferences.pacePreference === role.pace ? 100 : 45) : 60) : 100;
  if (preferences.pacePreference && !role.pace) unknowns.push('team pace is unknown');
  const autonomy = preferences.autonomyPreference ? (role.autonomy ? (preferences.autonomyPreference === role.autonomy ? 100 : 45) : 60) : 100;
  if (preferences.autonomyPreference && !role.autonomy) unknowns.push('role autonomy is unknown');

  let location = 100;
  if (preferences.locationPreferences.length && role.workMode !== 'remote') {
    location = preferences.locationPreferences.some(value => norm(role.location).includes(norm(value))) ? 100 : 35;
    if (location < 50) concerns.push('location is outside stated preferences');
  }

  const dimensions = {
    compensation: clamp(compensation), workMode: clamp(workMode), workContent: clamp(workContent), growth: clamp(growthResult.score),
    values: clamp(valuesResult.score), impact: clamp(impactResult.score), management: clamp(managementResult.score), pace: clamp(pace), autonomy: clamp(autonomy), location: clamp(location)
  };
  const weights = { compensation:.16, workMode:.08, workContent:.20, growth:.14, values:.10, impact:.10, management:.08, pace:.05, autonomy:.05, location:.04 };
  const score = clamp(Object.entries(dimensions).reduce((sum,[key,value]) => sum + value * weights[key as keyof typeof weights],0));
  const confidence = clamp(100 - Math.min(55, unknowns.length * 9));
  const recommendation: FulfillmentAssessment['recommendation'] = score >= 82 ? 'strong-fit' : score >= 68 ? 'worth-exploring' : score >= 50 ? 'caution' : 'poor-fit';
  return { score, confidence, dimensions, positiveSignals, concerns, unknowns, recommendation };
}

export interface EmployerHiringOutcome {
  roleSuccessScore: number;
  evidenceConfidence: number;
  fulfillmentScore: number;
  retentionSignals: number;
  overall: number;
  explanation: string[];
}

export function assessEmployerHiringOutcome(input: Omit<EmployerHiringOutcome, 'overall' | 'explanation'>): EmployerHiringOutcome {
  const overall = clamp(input.roleSuccessScore * .40 + input.evidenceConfidence * .25 + input.fulfillmentScore * .20 + input.retentionSignals * .15);
  const explanation = [
    `role capability ${clamp(input.roleSuccessScore)}/100`,
    `evidence confidence ${clamp(input.evidenceConfidence)}/100`,
    `candidate fulfillment ${clamp(input.fulfillmentScore)}/100`,
    `retention signals ${clamp(input.retentionSignals)}/100`
  ];
  return { ...input, overall, explanation };
}
