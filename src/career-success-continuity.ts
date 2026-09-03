import { chooseSupportMode, type SupportPlan } from './maya-support-mode.js';
import { buildGigCareerPlan, type GigCareerPlan, type GigProfile, type GigSignal } from './gig-career.js';
import { employerGrowthPlan } from './employer-growth-pricing.js';
import { buildUserValuePlan, candidateValueInterventions, type UserValuePlan } from './user-value-orchestrator.js';
import { gigWorkerValueInterventions } from './gig-user-value.js';

export type CareerSuccessStage = 'dream'|'readiness'|'proof'|'access'|'interview'|'offer'|'employment'|'advancement';

export interface ContinuityMilestone {
  kind: 'goal'|'proof'|'application'|'interview'|'offer'|'hire'|'promotion'|'gig';
  label: string;
  verified: boolean;
  at?: string;
}

export interface CareerSuccessContinuityInput {
  message: string;
  targetCareer?: string;
  milestones?: ContinuityMilestone[];
  verifiedWins?: string[];
  recentSetbacks?: number;
  highStakesEventSoon?: boolean;
  materialGap?: string;
  directAccessAvailable?: boolean;
  gigProfile?: GigProfile;
  gigSignals?: GigSignal[];
}

export interface CareerSuccessContinuityPlan {
  stage: CareerSuccessStage;
  targetCareer?: string;
  support: SupportPlan;
  completedStages: CareerSuccessStage[];
  nextStage?: CareerSuccessStage;
  nextActions: string[];
  continuitySummary: string;
  userValue: UserValuePlan;
  gig?: GigCareerPlan;
  employerGrowthReference: typeof employerGrowthPlan;
}

const order: CareerSuccessStage[] = ['dream','readiness','proof','access','interview','offer','employment','advancement'];

function has(milestones: ContinuityMilestone[], kind: ContinuityMilestone['kind']) {
  return milestones.some(item => item.kind === kind && (kind === 'goal' || item.verified));
}

export function inferCareerSuccessStage(input: CareerSuccessContinuityInput): CareerSuccessStage {
  const milestones = input.milestones ?? [];
  if (has(milestones,'promotion')) return 'advancement';
  if (has(milestones,'hire')) return 'employment';
  if (has(milestones,'offer')) return 'offer';
  if (has(milestones,'interview')) return 'interview';
  if (has(milestones,'application')) return 'access';
  if (has(milestones,'proof') || has(milestones,'gig')) return 'proof';
  if (input.targetCareer || has(milestones,'goal')) return 'readiness';
  return 'dream';
}

function actionsFor(stage: CareerSuccessStage, target?: string) {
  const career = target ?? 'the target career';
  const map: Record<CareerSuccessStage,string[]> = {
    dream:[`Clarify the career outcome the user actually wants`,`Identify constraints, compensation goals, preferred work, and unacceptable tradeoffs`],
    readiness:[`Decompose ${career} into mandatory gates, capabilities, evidence, and realistic entry paths`,`Identify the smallest high-value gap to close first`],
    proof:[`Turn existing experience into portable evidence`,`Practice, assess, or build the missing proof required for ${career}`],
    access:[`Continuously search and rank opportunities`,`Choose the strongest route: direct introduction, referral, outreach, gig, or verified application`],
    interview:[`Run role-specific interview rehearsal and structured assessment`,`Convert likely objections into evidence-backed answers and follow-up proof`],
    offer:[`Compare compensation, scope, environment, growth, risk, and long-term career value`,`Prepare negotiation and a clear accept/decline decision boundary`],
    employment:[`Track 30/90/365-day outcome quality`,`Turn the new role into stronger evidence, relationships, compensation leverage, and future options`],
    advancement:[`Map the next promotion, compensation, leadership, ownership, business, or dream-career step`,`Preserve optionality and keep verified evidence current`]
  };
  return map[stage];
}

function inferMaterialGap(message: string) {
  const match = message.match(/(?:missing|need|lack|gap)(?:\s+(?:a|an|the))?\s+([^.!?]{3,80})/i);
  return match?.[1]?.trim();
}

function buildValuePlan(input: CareerSuccessContinuityInput, stage: CareerSuccessStage, gig?: GigCareerPlan): UserValuePlan {
  if (gig) {
    return buildUserValuePlan({
      audience:'gig-worker',
      objective:input.targetCareer,
      stage,
      availableInterventions:gigWorkerValueInterventions({
        idleTimeHigh:/idle|dead time|not getting gigs|slow week/i.test(input.message),
        repeatCustomersAvailable:/repeat customer|repeat client/i.test(input.message),
        platformConcentrationHigh:/only platform|depend on .*platform|platform risk/i.test(input.message),
        portableProofWeak:/no proof|weak proof|ratings only|portfolio/i.test(input.message),
        wantsIndependentBusiness:/own business|independent business|my own company|go direct/i.test(input.message),
        wantsSalariedTransition:/salary|salaried|full[- ]time job|transition.*job/i.test(input.message)
      })
    });
  }

  return buildUserValuePlan({
    audience:'candidate',
    objective:input.targetCareer,
    stage,
    availableInterventions:candidateValueInterventions({
      target:input.targetCareer,
      stage,
      opportunityAvailable:stage === 'access' || /job|role|opportunity|opening/i.test(input.message),
      materialGap:input.materialGap ?? inferMaterialGap(input.message),
      interviewSoon:stage === 'interview' || /interview.*(?:today|tomorrow|soon|this week)/i.test(input.message),
      offerAvailable:stage === 'offer' || /offer/i.test(input.message),
      compensationUpsideAvailable:/salary|compensation|pay|raise|negotiate|promotion/i.test(input.message),
      repeatedSetbacks:(input.recentSetbacks ?? 0) > 1 || /rejected|keep getting rejected|no interviews|discouraged/i.test(input.message),
      applicationReady:stage === 'access' && /apply|application|submit/i.test(input.message),
      directAccessAvailable:input.directAccessAvailable
    })
  });
}

export function buildCareerSuccessContinuity(input: CareerSuccessContinuityInput): CareerSuccessContinuityPlan {
  const stage = inferCareerSuccessStage(input);
  const index = order.indexOf(stage);
  const completedStages = order.slice(0,index);
  const nextStage = index < order.length - 1 ? order[index + 1] : undefined;
  const support = chooseSupportMode({message:input.message,verifiedWins:input.verifiedWins,recentSetbacks:input.recentSetbacks,highStakesEventSoon:input.highStakesEventSoon});
  const gig = input.gigProfile ? buildGigCareerPlan(input.gigProfile,input.gigSignals ?? []) : undefined;
  const userValue = buildValuePlan(input,stage,gig);
  const lifecycleActions = [...actionsFor(stage,input.targetCareer),...(gig?.nextMoves.slice(0,2) ?? [])];
  const valueAction = userValue.primary?.label;
  const nextActions = valueAction ? [valueAction,...lifecycleActions.filter(action => action !== valueAction)] : lifecycleActions;
  const continuitySummary = `Current stage: ${stage}. ${input.targetCareer ? `Target: ${input.targetCareer}. ` : ''}${nextStage ? `Next lifecycle stage: ${nextStage}. ` : 'Maintain advancement and long-term career optionality. '}${userValue.primary ? `Highest-value next move: ${userValue.primary.label}.` : ''}`;
  return {stage,targetCareer:input.targetCareer,support,completedStages,nextStage,nextActions,continuitySummary,userValue,gig,employerGrowthReference:employerGrowthPlan};
}

function collectStrings(value: unknown, keyPattern: RegExp, depth = 0): string[] {
  if (depth > 5 || value === null || value === undefined) return [];
  if (Array.isArray(value)) return value.flatMap(item => collectStrings(item,keyPattern,depth + 1));
  if (typeof value !== 'object') return [];
  const out:string[]=[];
  for (const [key,item] of Object.entries(value as Record<string,unknown>)) {
    if (keyPattern.test(key) && typeof item === 'string') out.push(item);
    if (typeof item === 'object' && item !== null) out.push(...collectStrings(item,keyPattern,depth + 1));
  }
  return out;
}

/**
 * Best-effort adapter for Maya's structured context. It never invents milestones: only
 * explicit strings already present in durable context are converted into continuity hints.
 */
export function continuityFromStructuredContext(message: string, context: unknown): CareerSuccessContinuityPlan {
  const goals = collectStrings(context,/goal|target|preferredtitle/i);
  const eventText = collectStrings(context,/checkpoint|kind|type|status|label|text/i).join(' | ').toLowerCase();
  const gaps = collectStrings(context,/gap|missing|blocker|requirement/i);
  const milestones:ContinuityMilestone[]=[];
  if(goals.length) milestones.push({kind:'goal',label:goals[0],verified:false});
  if(/assessment|credential|badge|evidence|certification|completed gig|repeat customer/.test(eventText)) milestones.push({kind:/gig/.test(eventText)?'gig':'proof',label:'durable proof present in career context',verified:true});
  if(/application|submitted|receipt verified/.test(eventText)) milestones.push({kind:'application',label:'application activity present in career context',verified:true});
  if(/interview/.test(eventText)) milestones.push({kind:'interview',label:'interview activity present in career context',verified:true});
  if(/offer/.test(eventText)) milestones.push({kind:'offer',label:'offer outcome present in career context',verified:true});
  if(/hired|accepted|started the job|employment/.test(eventText)) milestones.push({kind:'hire',label:'employment outcome present in career context',verified:true});
  if(/promotion|promoted/.test(eventText)) milestones.push({kind:'promotion',label:'advancement outcome present in career context',verified:true});
  return buildCareerSuccessContinuity({
    message,
    targetCareer:goals[0],
    milestones,
    materialGap:gaps[0],
    directAccessAvailable:/referral|introduction|recruiter relationship|employer pipeline/.test(eventText),
    highStakesEventSoon:/interview|assessment|negotiation/.test(eventText)
  });
}
