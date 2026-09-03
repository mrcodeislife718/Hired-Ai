export type CareerDomain =
  | 'technology' | 'healthcare' | 'skilled-trades' | 'education' | 'finance'
  | 'legal' | 'science' | 'manufacturing' | 'logistics' | 'retail'
  | 'hospitality' | 'sales' | 'marketing' | 'creative' | 'media'
  | 'public-service' | 'construction' | 'transportation' | 'energy' | 'agriculture'
  | 'nonprofit' | 'entrepreneurship' | 'other';

export type ProofKind =
  | 'employment' | 'license' | 'certification' | 'education' | 'assessment'
  | 'work-sample' | 'portfolio' | 'reference' | 'publication' | 'award'
  | 'customer-outcome' | 'operational-record' | 'project' | 'volunteer-work'
  | 'credential' | 'other';

export interface CareerTarget {
  title: string;
  domain: CareerDomain;
  compensationTarget?: number;
  location?: string;
  workMode?: 'onsite' | 'hybrid' | 'remote' | 'flexible';
  longTermOutcome?: string;
}

export interface CareerProof {
  id: string;
  kind: ProofKind;
  label: string;
  verified: boolean;
  strength: number;
  expiresAt?: string;
  mandatoryFor?: string[];
}

export interface CareerRequirement {
  id: string;
  label: string;
  mandatory: boolean;
  acceptableProof: ProofKind[];
  weight: number;
}

export interface CareerTransitionPlan {
  target: CareerTarget;
  readiness: number;
  hardGates: CareerRequirement[];
  transferableProof: CareerProof[];
  missingRequirements: CareerRequirement[];
  nextActions: string[];
}

function clamp(value: number) { return Math.max(0, Math.min(100, value)); }

export function buildCareerTransitionPlan(target: CareerTarget, requirements: CareerRequirement[], proof: CareerProof[]): CareerTransitionPlan {
  const currentProof = proof.filter(item => !item.expiresAt || Date.parse(item.expiresAt) >= Date.now());
  const satisfied = new Set<string>();
  const transferable = new Map<string, CareerProof>();
  for (const requirement of requirements) {
    const matches = currentProof.filter(item => item.verified && requirement.acceptableProof.includes(item.kind));
    if (matches.length) {
      satisfied.add(requirement.id);
      for (const match of matches) transferable.set(match.id, match);
    }
  }
  const weightTotal = requirements.reduce((sum, item) => sum + Math.max(0, item.weight), 0) || 1;
  const satisfiedWeight = requirements.filter(item => satisfied.has(item.id)).reduce((sum, item) => sum + Math.max(0, item.weight), 0);
  const hardGates = requirements.filter(item => item.mandatory && !satisfied.has(item.id));
  const missingRequirements = requirements.filter(item => !satisfied.has(item.id));
  const nextActions = [
    ...hardGates.map(item => `Satisfy mandatory requirement: ${item.label}`),
    ...missingRequirements.filter(item => !item.mandatory).slice(0, 5).map(item => `Build or verify proof for: ${item.label}`)
  ];
  if (!nextActions.length) nextActions.push(`Begin selective pursuit of ${target.title} opportunities`);
  return {
    target,
    readiness: clamp(Math.round((satisfiedWeight / weightTotal) * 100)),
    hardGates,
    transferableProof: [...transferable.values()].sort((a, b) => b.strength - a.strength),
    missingRequirements,
    nextActions
  };
}

export const supportedCareerDomains: readonly CareerDomain[] = [
  'technology','healthcare','skilled-trades','education','finance','legal','science','manufacturing','logistics','retail','hospitality','sales','marketing','creative','media','public-service','construction','transportation','energy','agriculture','nonprofit','entrepreneurship','other'
];
