import type { CandidateProfile, Evidence } from './domain.js';
import { normalize } from './utils.js';

export type PositioningConfidence = 'verified' | 'supported' | 'evidence-limited' | 'unsupported';

export interface PositionedClaim {
  text: string;
  confidence: PositioningConfidence;
  evidenceIds: string[];
  permitted: boolean;
  rationale: string;
}

export interface CandidatePositioningPolicy {
  objective: string;
  allowed: string[];
  evidenceLimitedLatitude: string[];
  prohibited: string[];
  selectionRule: string;
}

export const CANDIDATE_POSITIONING_POLICY: CandidatePositioningPolicy = Object.freeze({
  objective:'Present the candidate as the strongest credible fit for the role by selecting, ordering and wording truthful evidence in the most favorable defensible way.',
  allowed:[
    'lead with the candidate capabilities most relevant to the employer need',
    'use confident active wording when the underlying action is supported',
    'translate project work into employer language without changing the underlying fact',
    'combine multiple weak evidence signals into a stronger relevance narrative when each signal is real',
    'describe adjacent capability as transferable, applicable, relevant or rapidly usable when the evidence supports that inference',
    'omit irrelevant weaknesses and low-value detail unless disclosure is required or the omission would make a material claim misleading',
    'prefer the strongest defensible interpretation when multiple truthful phrasings are available'
  ],
  evidenceLimitedLatitude:[
    'when direct evidence is minimal but there is real adjacent evidence, Maya may use favorable interpretive framing rather than flatly discarding the capability',
    'Maya may characterize a capability as exposure, familiarity, adjacent experience, transferable experience, or demonstrated related capability according to the evidence strength',
    'Maya may infer likely relevance from closely related work, but must not convert that inference into a false claim of years, production use, ownership, certification, title, quantified impact, or completed work',
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

const tokens = (value: string) => new Set(normalize(value).split(/\s+/).filter(Boolean));
const similarity = (a: string, b: string) => {
  const left = tokens(a);
  const right = tokens(b);
  if (!right.size) return 0;
  let hits = 0;
  for (const token of right) if (left.has(token)) hits++;
  return hits / right.size;
};

export function positionCapability(input: {
  profile: CandidateProfile;
  evidence: Evidence[];
  requirement: string;
}): PositionedClaim {
  const { profile, evidence, requirement } = input;
  const direct = evidence
    .map(item => ({ item, score: similarity(`${item.skill} ${item.claim}`, requirement) }))
    .filter(match => match.score >= 0.25)
    .sort((a,b) => (b.score * b.item.strength) - (a.score * a.item.strength));

  if (direct.length) {
    const strongest = direct[0].item;
    const confidence: PositioningConfidence = strongest.strength >= 0.85 ? 'verified' : 'supported';
    return {
      text:`Strong fit for ${requirement}: ${strongest.claim}`,
      confidence,
      evidenceIds:direct.map(match=>match.item.id),
      permitted:true,
      rationale:'Direct candidate evidence overlaps the requirement, so Maya can position it confidently using the strongest supported wording.'
    };
  }

  const profileSignal = similarity(`${profile.headline} ${profile.skills.join(' ')}`, requirement);
  if (profileSignal >= 0.25) {
    return {
      text:`Relevant transferable capability for ${requirement}, supported by the candidate profile but with limited direct proof in the current evidence set.`,
      confidence:'evidence-limited',
      evidenceIds:[],
      permitted:true,
      rationale:'The candidate record contains a related capability. Maya may frame it favorably as transferable or adjacent, but may not assert unsupported scope, duration, ownership or outcomes.'
    };
  }

  return {
    text:`No defensible evidence currently supports ${requirement}.`,
    confidence:'unsupported',
    evidenceIds:[],
    permitted:false,
    rationale:'There is not enough evidence to make even an adjacent-capability claim without risking misrepresentation.'
  };
}

export function positioningInstructions() {
  return {
    objective:CANDIDATE_POSITIONING_POLICY.objective,
    selectionRule:CANDIDATE_POSITIONING_POLICY.selectionRule,
    allowed:[...CANDIDATE_POSITIONING_POLICY.allowed],
    evidenceLimitedLatitude:[...CANDIDATE_POSITIONING_POLICY.evidenceLimitedLatitude],
    prohibited:[...CANDIDATE_POSITIONING_POLICY.prohibited]
  };
}
