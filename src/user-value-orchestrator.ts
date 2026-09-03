export type HiredAudience = 'candidate'|'gig-worker'|'employer'|'institution';

export type ValueDimension =
  | 'outcome-progress'
  | 'effort-reduction'
  | 'success-probability'
  | 'trust'
  | 'time-saved'
  | 'income-upside'
  | 'retention'
  | 'strategic-compounding';

export type InterventionKind =
  | 'proactive-next-action'
  | 'one-conversation-execution'
  | 'outcome-personalization'
  | 'opportunity-access'
  | 'smallest-high-value-gap'
  | 'confidence-support'
  | 'employer-hiring-value'
  | 'economic-upside'
  | 'friction-removal'
  | 'outcome-learning';

export interface UserValueSignal {
  dimension: ValueDimension;
  value: number;
  evidence?: string;
}

export interface UserValueIntervention {
  id: string;
  kind: InterventionKind;
  label: string;
  rationale: string;
  expectedOutcome: string;
  friction: number;
  confidence: number;
  urgency?: number;
  reversible?: boolean;
  requiresAuthorization?: boolean;
  signals: UserValueSignal[];
}

export interface UserValueContext {
  audience: HiredAudience;
  objective?: string;
  constraints?: string[];
  stage?: string;
  availableInterventions: UserValueIntervention[];
}

export interface RankedUserValueIntervention extends UserValueIntervention {
  expectedUserValue: number;
  normalizedFriction: number;
  reasons: string[];
}

export interface UserValuePlan {
  audience: HiredAudience;
  objective?: string;
  primary?: RankedUserValueIntervention;
  ranked: RankedUserValueIntervention[];
  operatingRule: string;
}

const weights: Record<ValueDimension, number> = {
  'outcome-progress': 1.5,
  'effort-reduction': 1.0,
  'success-probability': 1.5,
  trust: 1.15,
  'time-saved': 1.0,
  'income-upside': 1.35,
  retention: 0.85,
  'strategic-compounding': 1.15
};

function clamp(value: number, min = 0, max = 1) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function weightedSignalValue(signals: UserValueSignal[]) {
  if (!signals.length) return 0;
  const weighted = signals.reduce((sum, signal) => sum + clamp(signal.value) * weights[signal.dimension], 0);
  const totalWeight = signals.reduce((sum, signal) => sum + weights[signal.dimension], 0);
  return totalWeight > 0 ? weighted / totalWeight : 0;
}

function rank(intervention: UserValueIntervention): RankedUserValueIntervention {
  const signalValue = weightedSignalValue(intervention.signals);
  const confidence = clamp(intervention.confidence);
  const urgency = clamp(intervention.urgency ?? 0.5);
  const normalizedFriction = clamp(intervention.friction);
  const reversibilityBonus = intervention.reversible === false ? 0 : 0.03;
  const authorizationPenalty = intervention.requiresAuthorization ? 0.04 : 0;

  // User value dominates the score. Friction and risk reduce priority; urgency breaks ties.
  const expectedUserValue = clamp(
    (signalValue * 0.62) +
    (confidence * 0.18) +
    (urgency * 0.12) +
    ((1 - normalizedFriction) * 0.08) +
    reversibilityBonus -
    authorizationPenalty
  );

  const strongestSignals = [...intervention.signals]
    .sort((a,b) => (b.value * weights[b.dimension]) - (a.value * weights[a.dimension]))
    .slice(0,3)
    .map(signal => signal.evidence ? `${signal.dimension}: ${signal.evidence}` : signal.dimension);

  return {
    ...intervention,
    expectedUserValue,
    normalizedFriction,
    reasons: strongestSignals
  };
}

export function buildUserValuePlan(context: UserValueContext): UserValuePlan {
  const ranked = context.availableInterventions
    .map(rank)
    .sort((a,b) => b.expectedUserValue - a.expectedUserValue || a.normalizedFriction - b.normalizedFriction || a.id.localeCompare(b.id));

  return {
    audience: context.audience,
    objective: context.objective,
    primary: ranked[0],
    ranked,
    operatingRule: 'Choose the action that creates the most defensible user outcome value with the least unnecessary friction; technical sophistication is only useful when it improves that result.'
  };
}

export interface CandidateValueInputs {
  target?: string;
  stage?: string;
  opportunityAvailable?: boolean;
  materialGap?: string;
  interviewSoon?: boolean;
  offerAvailable?: boolean;
  compensationUpsideAvailable?: boolean;
  repeatedSetbacks?: boolean;
  applicationReady?: boolean;
  directAccessAvailable?: boolean;
}

export function candidateValueInterventions(input: CandidateValueInputs): UserValueIntervention[] {
  const target = input.target ?? 'the user’s target career';
  const interventions: UserValueIntervention[] = [
    {
      id:'candidate-next-action', kind:'proactive-next-action', label:'Take the next best career action',
      rationale:'The user should not need to reverse-engineer the next step from a dashboard or ask the perfect question.',
      expectedOutcome:`Move the user measurably closer to ${target}.`, friction:0.08, confidence:0.9, urgency:0.75, reversible:true,
      signals:[{dimension:'outcome-progress',value:0.9},{dimension:'effort-reduction',value:0.9},{dimension:'time-saved',value:0.75}]
    },
    {
      id:'candidate-one-conversation', kind:'one-conversation-execution', label:'Complete the career task inside Maya',
      rationale:'Resume, positioning, application preparation, follow-up, interview preparation, opportunity comparison and negotiation should compose into one continuous conversation.',
      expectedOutcome:'Reduce tool switching and turn advice into completed work.', friction:0.12, confidence:0.88, urgency:0.7, reversible:true,
      signals:[{dimension:'effort-reduction',value:0.95},{dimension:'time-saved',value:0.9},{dimension:'outcome-progress',value:0.8},{dimension:'trust',value:0.65}]
    },
    {
      id:'candidate-personalize', kind:'outcome-personalization', label:'Use the user’s own conversion history',
      rationale:'Prefer strategies that have produced useful screens, interviews, offers, compensation gains or durable career progress for this user.',
      expectedOutcome:'Stop repeating low-yield tactics and improve future decisions.', friction:0.16, confidence:0.76, urgency:0.55, reversible:true,
      signals:[{dimension:'success-probability',value:0.88},{dimension:'strategic-compounding',value:0.9},{dimension:'effort-reduction',value:0.7}]
    },
    {
      id:'candidate-access', kind:'opportunity-access', label:'Use the strongest route to a real opportunity',
      rationale:'Search alone is not enough; direct introductions, referrals, recruiter relationships, gigs, institutional pipelines and verified applications can all create access.',
      expectedOutcome:'Increase the probability of a real hiring conversation.', friction:0.24, confidence:input.directAccessAvailable ? 0.9 : 0.72, urgency:input.opportunityAvailable ? 0.9 : 0.62, reversible:true, requiresAuthorization:true,
      signals:[{dimension:'outcome-progress',value:0.95},{dimension:'success-probability',value:0.9},{dimension:'income-upside',value:0.8}]
    }
  ];

  if (input.materialGap) interventions.push({
    id:'candidate-smallest-gap', kind:'smallest-high-value-gap', label:`Close the smallest high-value gap: ${input.materialGap}`,
    rationale:'Do not dump a generic curriculum on the user; close the minimum gap that materially increases access or readiness.',
    expectedOutcome:'Become competitive faster with less wasted learning.', friction:0.3, confidence:0.84, urgency:0.78, reversible:true,
    signals:[{dimension:'success-probability',value:0.92},{dimension:'time-saved',value:0.85},{dimension:'effort-reduction',value:0.8},{dimension:'outcome-progress',value:0.88}]
  });

  if (input.interviewSoon || input.repeatedSetbacks) interventions.push({
    id:'candidate-confidence', kind:'confidence-support', label:input.interviewSoon ? 'Prepare and strengthen confidence for the interview' : 'Rebuild momentum from evidence and a winnable next step',
    rationale:'Confidence is useful when it improves preparation, persistence and performance without inventing certainty.',
    expectedOutcome:'Improve execution quality at a high-stakes career moment.', friction:0.08, confidence:0.86, urgency:input.interviewSoon ? 1 : 0.8, reversible:true,
    signals:[{dimension:'success-probability',value:0.82},{dimension:'outcome-progress',value:0.78},{dimension:'trust',value:0.78}]
  });

  if (input.offerAvailable || input.compensationUpsideAvailable) interventions.push({
    id:'candidate-economic-upside', kind:'economic-upside', label:'Maximize compensation and long-term career value',
    rationale:'The product should help the user improve income, scope, trajectory and optionality—not merely obtain any job.',
    expectedOutcome:'Increase economic value and avoid accepting a worse long-term move.', friction:0.14, confidence:0.82, urgency:input.offerAvailable ? 1 : 0.72, reversible:true,
    signals:[{dimension:'income-upside',value:1},{dimension:'outcome-progress',value:0.9},{dimension:'strategic-compounding',value:0.82}]
  });

  if (input.applicationReady) interventions.push({
    id:'candidate-friction-removal', kind:'friction-removal', label:'Prepare the application package and ask only for required authorization',
    rationale:'Once facts are verified, Maya should assemble the work and minimize unnecessary user operations.',
    expectedOutcome:'Turn readiness into a completed, consistent application with minimal friction.', friction:0.1, confidence:0.9, urgency:0.88, reversible:false, requiresAuthorization:true,
    signals:[{dimension:'effort-reduction',value:1},{dimension:'time-saved',value:0.95},{dimension:'outcome-progress',value:0.92},{dimension:'trust',value:0.8}]
  });

  return interventions;
}

export interface EmployerValueInputs {
  startup?: boolean;
  roleDefined?: boolean;
  candidatePoolAvailable?: boolean;
  assessmentNeeded?: boolean;
  hiringDelayCostly?: boolean;
}

export function employerValueInterventions(input: EmployerValueInputs): UserValueIntervention[] {
  return [
    {
      id:'employer-role-to-evidence', kind:'employer-hiring-value', label:'Turn the role into evidence-backed hiring requirements',
      rationale:'Employers need the right person faster, not more recruiting workflow.',
      expectedOutcome:'Reduce weak screening proxies and focus the team on job-relevant evidence.', friction:input.roleDefined ? 0.12 : 0.24, confidence:0.9, urgency:0.82, reversible:true,
      signals:[{dimension:'success-probability',value:0.95},{dimension:'effort-reduction',value:0.85},{dimension:'trust',value:0.85},{dimension:'time-saved',value:0.75}]
    },
    {
      id:'employer-shortlist', kind:'employer-hiring-value', label:'Produce an explainable qualified shortlist',
      rationale:'A startup or employer should not need a recruiting department to identify credible candidates.',
      expectedOutcome:'Reduce screening work and time-to-shortlist.', friction:input.candidatePoolAvailable ? 0.14 : 0.3, confidence:0.84, urgency:input.hiringDelayCostly ? 0.96 : 0.75, reversible:true,
      signals:[{dimension:'time-saved',value:0.95},{dimension:'effort-reduction',value:0.95},{dimension:'success-probability',value:0.85}]
    },
    {
      id:'employer-assess', kind:'employer-hiring-value', label:'Assess only the capabilities that matter for the job',
      rationale:'Use structured interviews, work samples or assessments when they provide more direct evidence than pedigree or intuition.',
      expectedOutcome:'Increase confidence in the hire while reducing bad-hire risk.', friction:input.assessmentNeeded ? 0.2 : 0.34, confidence:0.86, urgency:0.7, reversible:true,
      signals:[{dimension:'success-probability',value:0.96},{dimension:'trust',value:0.9},{dimension:'retention',value:0.72}]
    },
    {
      id:'employer-friction', kind:'friction-removal', label:'Coordinate sourcing, evaluation and interview flow in one surface',
      rationale:'The employer should spend time deciding, not moving information between tools.',
      expectedOutcome:'Lower operational burden and hiring cycle time.', friction:0.16, confidence:0.86, urgency:0.74, reversible:true,
      signals:[{dimension:'effort-reduction',value:0.98},{dimension:'time-saved',value:0.95},{dimension:'outcome-progress',value:0.82}]
    }
  ];
}

export interface InstitutionValueInputs {
  participantsNeedEmployment?: boolean;
  employerPartnersAvailable?: boolean;
  outcomeReportingRequired?: boolean;
}

export function institutionValueInterventions(input: InstitutionValueInputs): UserValueIntervention[] {
  return [
    {
      id:'institution-training-to-employment', kind:'opportunity-access', label:'Turn training completion into verified employment pathways',
      rationale:'Programs need participants to convert learning into work, not merely finish coursework.',
      expectedOutcome:'Increase participant readiness, access, interviews and durable employment.', friction:0.22, confidence:0.86, urgency:input.participantsNeedEmployment ? 0.92 : 0.72, reversible:true,
      signals:[{dimension:'outcome-progress',value:1},{dimension:'success-probability',value:0.9},{dimension:'income-upside',value:0.82},{dimension:'strategic-compounding',value:0.8}]
    },
    {
      id:'institution-employer-pipeline', kind:'opportunity-access', label:'Route qualified participants into employer pipelines',
      rationale:'Employer relationships become more valuable when candidate proof, role fit and follow-through are coordinated.',
      expectedOutcome:'Create more real hiring conversations with less manual case management.', friction:input.employerPartnersAvailable ? 0.15 : 0.38, confidence:input.employerPartnersAvailable ? 0.9 : 0.65, urgency:0.8, reversible:true,
      signals:[{dimension:'success-probability',value:0.92},{dimension:'effort-reduction',value:0.85},{dimension:'time-saved',value:0.8}]
    },
    {
      id:'institution-outcomes', kind:'outcome-learning', label:'Track placement, retention and advancement outcomes',
      rationale:'Programs should know whether interventions actually change participant careers and where support fails.',
      expectedOutcome:'Improve program decisions and provide defensible outcome reporting.', friction:0.18, confidence:0.9, urgency:input.outcomeReportingRequired ? 0.92 : 0.62, reversible:true,
      signals:[{dimension:'strategic-compounding',value:0.95},{dimension:'trust',value:0.9},{dimension:'retention',value:0.82},{dimension:'success-probability',value:0.72}]
    }
  ];
}
