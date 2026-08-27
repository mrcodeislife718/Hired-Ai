import type { CandidateProfile, Evidence } from './domain.js';
import { normalize } from './utils.js';

export type PositioningConfidence = 'verified' | 'supported' | 'evidence-limited' | 'unsupported';
export type PositioningStyle = 'precise' | 'confident' | 'assertive';
export type ClaimRisk = 'low' | 'medium' | 'high';

export interface PositionedClaim {
  text: string;
  confidence: PositioningConfidence;
  confidenceScore: number;
  defendabilityScore: number;
  evidenceIds: string[];
  evidenceStrength: number;
  permitted: boolean;
  risk: ClaimRisk;
  rationale: string;
  proofPrompt: string;
}

export interface CandidatePositioningPolicy {
  objective: string;
  allowed: string[];
  evidenceLimitedLatitude: string[];
  prohibited: string[];
  selectionRule: string;
}

export interface PositioningVariant {
  style: PositioningStyle;
  text: string;
  permitted: boolean;
  defendabilityScore: number;
  rule: string;
}

export interface PositioningPortfolio {
  claims: PositionedClaim[];
  leadClaims: PositionedClaim[];
  evidenceLimitedClaims: PositionedClaim[];
  blockedClaims: PositionedClaim[];
  averageDefendability: number;
  averageConfidence: number;
  coverageScore: number;
}

export interface ClaimAudit {
  permitted: boolean;
  risk: ClaimRisk;
  issues: string[];
}

export const CANDIDATE_POSITIONING_POLICY: CandidatePositioningPolicy = Object.freeze({
  objective:'Present the candidate as the strongest credible fit for the role by selecting, ordering and wording truthful evidence in the most favorable defensible way.',
  allowed:[
    'lead with the candidate capabilities most relevant to the employer need',
    'use confident active wording when the underlying action is supported',
    'translate project work into employer language without changing the underlying fact',
    'combine multiple weak evidence signals into a stronger relevance narrative when each signal is real',
    'describe adjacent capability as transferable, applicable, relevant or rapidly usable when the evidence supports that inference',
    'use qualitative impact when quantitative proof is absent, provided the wording does not imply a fabricated measurable result',
    'omit irrelevant weaknesses and low-value detail unless disclosure is required or the omission would make a material claim misleading',
    'prefer the strongest defensible interpretation when multiple truthful phrasings are available'
  ],
  evidenceLimitedLatitude:[
    'when direct evidence is minimal but there is real adjacent evidence, Maya may use favorable interpretive framing rather than flatly discarding the capability',
    'Maya may characterize a capability as exposure, familiarity, adjacent experience, transferable experience, demonstrated related capability, or fast-ramp readiness according to the evidence strength',
    'Maya may infer likely relevance from closely related work, but must not convert that inference into a false claim of years, production use, ownership, certification, title, quantified impact, or completed work',
    'minor embellishment means rhetorical strengthening of a real fact or inference, never creation of a new material fact',
    'Maya should maximize perceived fit through emphasis, ordering, specificity and confident language before considering any evidence-limited inference'
  ],
  prohibited:[
    'invent employers, titles, dates, degrees, certifications or clearances',
    'invent tools, technologies or domain experience with no supporting candidate signal',
    'invent revenue, percentages, user counts, latency improvements, cost savings or other metrics',
    'claim ownership, leadership, deployment, scale, production status or responsibility beyond what the evidence supports',
    'turn an evidence-limited inference into an unqualified factual assertion',
    'hide a material fact when doing so would make the application materially deceptive'
  ],
  selectionRule:'Optimize for strongest credible positioning, not neutral description: choose the most favorable wording that remains defensible if a recruiter asks the candidate to explain or prove it.'
});

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(n)));
const tokens = (value: string) => new Set(normalize(value).split(/\s+/).filter(Boolean));
const similarity = (a: string, b: string) => {
  const left = tokens(a);
  const right = tokens(b);
  if (!right.size) return 0;
  let hits = 0;
  for (const token of right) if (left.has(token)) hits++;
  return hits / right.size;
};

const verificationWeight: Record<Evidence['verification'], number> = {
  ci:1,
  artifact:0.95,
  repository:0.9,
  manual:0.72
};

function weightedEvidenceScore(item: Evidence, requirement: string) {
  const semantic = similarity(`${item.skill} ${item.claim}`, requirement);
  return semantic * item.strength * verificationWeight[item.verification];
}

function riskFrom(defendabilityScore: number, confidence: PositioningConfidence): ClaimRisk {
  if (confidence === 'unsupported' || defendabilityScore < 40) return 'high';
  if (confidence === 'evidence-limited' || defendabilityScore < 75) return 'medium';
  return 'low';
}

export function positionCapability(input: {
  profile: CandidateProfile;
  evidence: Evidence[];
  requirement: string;
}): PositionedClaim {
  const { profile, evidence, requirement } = input;
  const direct = evidence
    .map(item => ({ item, semantic: similarity(`${item.skill} ${item.claim}`, requirement), weighted:weightedEvidenceScore(item, requirement) }))
    .filter(match => match.semantic >= 0.22)
    .sort((a,b) => b.weighted - a.weighted);

  if (direct.length) {
    const strongest = direct[0];
    const aggregate = direct.slice(0,3).reduce((sum,match)=>sum+match.weighted,0);
    const evidenceStrength = clamp(strongest.item.strength * 100);
    const confidenceScore = clamp((strongest.semantic * 50) + (strongest.item.strength * 35) + (verificationWeight[strongest.item.verification] * 15));
    const defendabilityScore = clamp(Math.min(100, confidenceScore + Math.min(12, aggregate * 12)));
    const confidence: PositioningConfidence = defendabilityScore >= 84 ? 'verified' : 'supported';
    return {
      text:`Strong fit for ${requirement}: ${strongest.item.claim}`,
      confidence,
      confidenceScore,
      defendabilityScore,
      evidenceIds:direct.map(match=>match.item.id),
      evidenceStrength,
      permitted:true,
      risk:riskFrom(defendabilityScore, confidence),
      rationale:'Direct candidate evidence overlaps the requirement. Maya can position it confidently and should lead with the highest-strength, highest-verification proof.',
      proofPrompt:`If challenged, explain the underlying work and point to evidence ${direct.map(match=>match.item.id).join(', ')}.`
    };
  }

  const profileSignal = similarity(`${profile.headline} ${profile.skills.join(' ')}`, requirement);
  if (profileSignal >= 0.22) {
    const confidenceScore = clamp(40 + profileSignal * 35);
    const defendabilityScore = clamp(48 + profileSignal * 30);
    return {
      text:`Relevant transferable capability for ${requirement}, supported by the candidate profile with limited direct proof in the current evidence set.`,
      confidence:'evidence-limited',
      confidenceScore,
      defendabilityScore,
      evidenceIds:[],
      evidenceStrength:clamp(profileSignal * 70),
      permitted:true,
      risk:'medium',
      rationale:'The candidate record contains a related capability. Maya may frame it favorably as transferable, adjacent, familiar, or fast-ramp ready, but may not assert unsupported scope, duration, ownership or outcomes.',
      proofPrompt:'If challenged, describe the adjacent skill honestly and explain how it transfers; do not claim direct experience that did not occur.'
    };
  }

  return {
    text:`No defensible evidence currently supports ${requirement}.`,
    confidence:'unsupported',
    confidenceScore:0,
    defendabilityScore:0,
    evidenceIds:[],
    evidenceStrength:0,
    permitted:false,
    risk:'high',
    rationale:'There is not enough evidence to make even an adjacent-capability claim without risking misrepresentation.',
    proofPrompt:'Do not claim this capability. Either omit it, label it as a development gap, or obtain real evidence first.'
  };
}

export function buildPositioningVariants(claim: PositionedClaim): PositioningVariant[] {
  if (!claim.permitted) return [{ style:'precise', text:claim.text, permitted:false, defendabilityScore:claim.defendabilityScore, rule:'Unsupported claims remain blocked in every positioning style.' }];
  const subject = claim.text.replace(/^Strong fit for /,'').replace(/^Relevant transferable capability for /,'');
  const suffix = claim.confidence === 'evidence-limited'
    ? 'Frame as adjacent, transferable, familiar, or fast-ramp ready rather than direct experience.'
    : 'State the supported capability directly and confidently.';
  return [
    { style:'precise', text:claim.text, permitted:true, defendabilityScore:claim.defendabilityScore, rule:`Exact, proof-first wording. ${suffix}` },
    { style:'confident', text:`Well-aligned with ${subject}`, permitted:true, defendabilityScore:clamp(claim.defendabilityScore-3), rule:`Stronger rhetorical framing without changing the fact. ${suffix}` },
    { style:'assertive', text:`A strong candidate-level match for ${subject}`, permitted:claim.defendabilityScore >= 55, defendabilityScore:clamp(claim.defendabilityScore-8), rule:`Use only when defendability remains adequate. ${suffix}` }
  ];
}

export function auditPositionedClaim(claim: PositionedClaim): ClaimAudit {
  const issues: string[] = [];
  if (!claim.permitted) issues.push('claim is unsupported');
  if (claim.confidence === 'evidence-limited' && claim.evidenceIds.length === 0) issues.push('direct proof is limited; wording must remain explicitly adjacent or transferable');
  if (claim.defendabilityScore < 55 && claim.permitted) issues.push('defendability is too weak for assertive framing');
  if (claim.risk === 'high') issues.push('high misrepresentation risk');
  return { permitted:claim.permitted && claim.risk !== 'high', risk:claim.risk, issues };
}

export function buildPositioningPortfolio(input: {
  profile: CandidateProfile;
  evidence: Evidence[];
  requirements: string[];
  leadCount?: number;
}): PositioningPortfolio {
  const claims = [...new Set(input.requirements.map(value=>value.trim()).filter(Boolean))]
    .map(requirement=>positionCapability({ profile:input.profile, evidence:input.evidence, requirement }));
  const permitted = claims.filter(claim=>claim.permitted)
    .sort((a,b)=>b.defendabilityScore-a.defendabilityScore || b.confidenceScore-a.confidenceScore);
  const leadCount = Math.max(1,input.leadCount ?? 5);
  const avg = (values:number[]) => values.length ? clamp(values.reduce((a,b)=>a+b,0)/values.length) : 0;
  return {
    claims,
    leadClaims:permitted.slice(0,leadCount),
    evidenceLimitedClaims:claims.filter(claim=>claim.confidence==='evidence-limited'),
    blockedClaims:claims.filter(claim=>!claim.permitted),
    averageDefendability:avg(permitted.map(claim=>claim.defendabilityScore)),
    averageConfidence:avg(permitted.map(claim=>claim.confidenceScore)),
    coverageScore:claims.length ? clamp((permitted.length/claims.length)*100) : 0
  };
}

export function positioningInstructions() {
  return {
    objective:CANDIDATE_POSITIONING_POLICY.objective,
    selectionRule:CANDIDATE_POSITIONING_POLICY.selectionRule,
    allowed:[...CANDIDATE_POSITIONING_POLICY.allowed],
    evidenceLimitedLatitude:[...CANDIDATE_POSITIONING_POLICY.evidenceLimitedLatitude],
    prohibited:[...CANDIDATE_POSITIONING_POLICY.prohibited],
    executionRules:[
      'rank candidate claims by employer relevance, defendability, evidence strength and verification quality',
      'lead with the strongest proofs and use evidence-limited claims as supporting material rather than the foundation of the pitch',
      'generate multiple truthful positioning variants and learn which framing converts best',
      'every assertive claim should have a proof path the candidate can explain in an interview',
      'never let conversion optimization reward a materially false claim'
    ]
  };
}
