import type { HiredEngine } from './engine.js';

export type MayaWorkflowKind =
  | 'career-start'
  | 'career-transition'
  | 'career-reentry'
  | 'career-advancement'
  | 'career-health'
  | 'resume'
  | 'network'
  | 'opportunity-discovery'
  | 'opportunity-fit'
  | 'application'
  | 'application-questions'
  | 'interview'
  | 'company-research'
  | 'offer-negotiation'
  | 'career-router';

export type WorkflowStepStatus = 'complete' | 'ready' | 'blocked' | 'not-needed';

export interface MayaWorkflowStep {
  id: string;
  label: string;
  status: WorkflowStepStatus;
  reason: string;
  nextAction?: string;
}

export interface MayaWorkflowState {
  kind: MayaWorkflowKind;
  endToEnd: true;
  complete: boolean;
  blocked: boolean;
  currentStep?: string;
  steps: MayaWorkflowStep[];
  completionDefinition: string;
  invariants: string[];
}

export interface WorkflowRequestContext {
  message?: string;
  opportunityId?: string;
  resumeText?: string;
  offers?: unknown[];
  applicationQuestions?: string[];
  funnel?: unknown;
}

export interface WorkflowResponseContext { type?: unknown; }

const invariantRules = [
  'Use only defensible career facts and evidence.',
  'Keep legally or professionally required credentials as hard gates.',
  'Require authorization before identity-bearing external actions.',
  'Do not claim external delivery until provider receipt is verified.',
  'Preserve unknowns instead of manufacturing certainty.',
  'Record outcomes so future recommendations can improve.'
];

function complete(id:string,label:string,reason:string):MayaWorkflowStep{return{id,label,status:'complete',reason};}
function ready(id:string,label:string,reason:string,nextAction:string):MayaWorkflowStep{return{id,label,status:'ready',reason,nextAction};}
function blocked(id:string,label:string,reason:string,nextAction:string):MayaWorkflowStep{return{id,label,status:'blocked',reason,nextAction};}
function notNeeded(id:string,label:string,reason:string):MayaWorkflowStep{return{id,label,status:'not-needed',reason};}

function classify(type:unknown):MayaWorkflowKind {
  const value=String(type??'career-router');
  if(value==='career-start')return'career-start';
  if(value==='career-transition')return'career-transition';
  if(value==='career-reentry')return'career-reentry';
  if(value==='career-advancement')return'career-advancement';
  if(value==='career-health'||value==='funnel-diagnosis')return'career-health';
  if(value==='career-audit'||value==='resume-request'||value==='github-career')return'resume';
  if(value==='network')return'network';
  if(value==='opportunities'||value==='career-status'||value==='status')return'opportunity-discovery';
  if(value==='fit'||value==='develop-first')return'opportunity-fit';
  if(value==='application')return'application';
  if(value==='application-questions')return'application-questions';
  if(value==='interview')return'interview';
  if(value==='company-research')return'company-research';
  if(value==='offer-negotiation'||value==='offer-negotiation-request')return'offer-negotiation';
  return'career-router';
}

function selectedOpportunity(engine:HiredEngine,id?:string){
  if(id)return engine.store.opportunities.get(id);
  return [...engine.store.opportunities.values()].filter(o=>!o.hardRejected).sort((a,b)=>b.score.total-a.score.total)[0];
}

function commonFoundation(engine:HiredEngine){
  const twin=engine.careerTwin.current();
  const hasDirection=engine.profile.constraints.preferredTitles.length>0||twin.goals.value.length>0||Boolean(twin.trajectory.value.desired);
  return {twin,hasDirection,evidenceCount:engine.store.evidence.size};
}

export function buildMayaWorkflowState(engine:HiredEngine,request:WorkflowRequestContext,response:WorkflowResponseContext):MayaWorkflowState {
  const kind=classify(response.type);
  const foundation=commonFoundation(engine);
  const opportunity=selectedOpportunity(engine,request.opportunityId);
  const readiness=opportunity?engine.assessReadiness(opportunity.id):undefined;
  const status=engine.careerStatus();
  const applicationApproval=opportunity?[...engine.store.approvals.values()].filter(a=>a.opportunityId===opportunity.id&&a.action==='SUBMIT_APPLICATION').at(-1):undefined;
  const deliveryState=applicationApproval?engine.governor.deliveryState(applicationApproval.id):undefined;
  const hasOutcome=opportunity?engine.outcomes.all(engine.profile.id).some(event=>event.opportunityId===opportunity.id):engine.careerOutcomeSummary().totalEvents>0;
  const steps:MayaWorkflowStep[]=[];
  let completionDefinition='A verified next career decision is reached and the resulting outcome is recorded.';

  if(['career-start','career-transition','career-reentry','career-advancement','career-health','career-router'].includes(kind)){
    steps.push(foundation.hasDirection?complete('direction','Define career outcome','A target direction is present in profile or Career Twin.'):ready('direction','Define career outcome','Maya needs a concrete target to optimize against.','Tell Maya the role, field, compensation, responsibility, or lifestyle outcome you want.'));
    steps.push(foundation.evidenceCount>0?complete('evidence','Establish career evidence',`${foundation.evidenceCount} evidence record(s) are available.`):ready('evidence','Establish career evidence','No evidence records are available yet.','Provide employment, credentials, education, references, work samples, assessments, projects, awards, or other legitimate proof.'));
    if(kind==='career-transition')steps.push(ready('transfer','Map transferable capability','Transferable strengths must be translated into the target profession without overstating direct experience.','Compare existing evidence with the target field and close the smallest high-value gaps.'));
    if(kind==='career-reentry')steps.push(ready('currency','Restore current proof','Reentry strength depends on proving present-day readiness.','Refresh recent evidence, references, skills, or work samples appropriate to the profession.'));
    if(kind==='career-advancement')steps.push(ready('next-level','Prove next-level scope','Advancement should be tied to evidence of scope, impact, judgment, and responsibility.','Build the promotion or external-move case from verified next-level evidence.'));
    if(kind==='career-health')steps.push(request.funnel?complete('diagnosis','Diagnose the failing stage','A funnel observation was supplied for stage-level diagnosis.'):ready('diagnosis','Diagnose the failing stage','Strategy changes should follow evidence about where conversion is failing.','Provide recent application, screen, interview, and offer counts.'));
    steps.push(status.priority.length>0?complete('market','Identify realistic opportunities',`${status.priority.length} current opportunity or opportunities are pursuable.`):ready('market','Identify realistic opportunities','No currently pursuable opportunities are loaded.','Run discovery or add a target opportunity for evaluation.'));
    completionDefinition='The user has a defensible direction, required proof, a prioritized next move, and a measurable follow-through plan.';
  }

  if(kind==='resume'){
    steps.push(request.resumeText?complete('source-resume','Load current resume','Resume content was supplied for analysis.'):ready('source-resume','Load current resume','A current resume is required for a true before-and-after audit.','Attach or paste the current resume.'));
    steps.push(foundation.evidenceCount>0?complete('career-record','Reconcile with career record',`${foundation.evidenceCount} evidence record(s) can be used to prevent omissions and unsupported claims.`):ready('career-record','Reconcile with career record','Maya needs career evidence to know what the resume is missing.','Add profession-appropriate evidence before finalizing the resume.'));
    steps.push(ready('compile','Compile target version','The resume should be generated for a target while preserving one factual claim set.','Choose a target role or let Maya use the strongest current target.'));
    completionDefinition='A target-ready resume is compiled from the durable career record, passes truth checks, and exposes any material evidence gaps.';
  }

  if(kind==='network'){
    steps.push(foundation.hasDirection?complete('target','Define networking objective','A career direction is available for relationship targeting.'):blocked('target','Define networking objective','Relationship building without a target becomes noisy and low-value.','Set the role, field, company, community, or advancement objective first.'));
    steps.push(ready('paths','Rank relationship paths','Maya should prioritize people who can hire, refer, validate, advise, or provide accurate market information.','Build the relationship map for the current targets.'));
    steps.push(ready('engage','Prepare quality outreach','Outreach must remain relevant, non-spammy, and identity-bearing execution must stay authorization-gated.','Draft the first high-value outreach message and request approval before sending.'));
    completionDefinition='The user has a prioritized relationship map, credible outreach, and tracked relationship outcomes.';
  }

  if(['opportunity-discovery','opportunity-fit','company-research'].includes(kind)){
    steps.push(engine.store.opportunities.size>0?complete('discover','Load real opportunities',`${engine.store.opportunities.size} opportunity record(s) are loaded.`):ready('discover','Load real opportunities','No opportunities are available for evaluation.','Run authorized discovery or provide a specific job posting.'));
    steps.push(opportunity?complete('select','Select target opportunity',`${opportunity.job.title} at ${opportunity.job.company} is selected.`):blocked('select','Select target opportunity','A concrete opportunity is required for role-specific analysis.','Choose or provide an opportunity.'));
    steps.push(opportunity&&!opportunity.hardRejected?complete('reliability','Pass basic qualification','The selected opportunity passed current hard-reject checks.'):opportunity?blocked('reliability','Pass basic qualification',opportunity.rejectionReasons.join('; ')||'The role is currently rejected.','Resolve the rejection reason or choose another opportunity.'):notNeeded('reliability','Pass basic qualification','No opportunity selected yet.'));
    steps.push(readiness?.canOccupyRole?complete('readiness','Verify role readiness',`Readiness is ${readiness.readinessScore}/100.`):opportunity?ready('readiness','Verify role readiness',`Current readiness is ${readiness?.readinessScore??0}/100.`,'Review blocking gaps and determine which are true hard gates versus closable proof gaps.'):notNeeded('readiness','Verify role readiness','No opportunity selected yet.'));
    completionDefinition='A real opportunity is verified, scored, explained, and classified as pursue, develop-first, or skip.';
  }

  if(['application','application-questions','interview'].includes(kind)){
    steps.push(opportunity?complete('opportunity','Lock target opportunity',`${opportunity.job.title} at ${opportunity.job.company} is selected.`):blocked('opportunity','Lock target opportunity','Application and interview work must bind to a real opportunity.','Select the opportunity first.'));
    steps.push(readiness?.canOccupyRole?complete('readiness','Pass readiness gate',`Role readiness is ${readiness.readinessScore}/100.`):opportunity?blocked('readiness','Pass readiness gate',`Role readiness is ${readiness?.readinessScore??0}/100.`,'Close or validate blocking gaps before submission.'):notNeeded('readiness','Pass readiness gate','No opportunity selected yet.'));
    steps.push(opportunity&&foundation.evidenceCount>0?complete('package','Compile one evidence package','The opportunity can be compiled against the current evidence store.'):opportunity?blocked('package','Compile one evidence package','No evidence is available for a defensible application package.','Add legitimate evidence before generating final artifacts.'):notNeeded('package','Compile one evidence package','No opportunity selected yet.'));
    if(kind==='application-questions')steps.push(request.applicationQuestions?.length?complete('questions','Answer screening questions',`${request.applicationQuestions.length} application question(s) were supplied.`):ready('questions','Answer screening questions','No application questions were supplied.','Paste the application questions.'));
    if(kind==='application'){
      if(!applicationApproval)steps.push(readiness?.canOccupyRole?ready('approval','Request submission authorization','The package may be prepared, but external submission cannot occur without authorization.','Request application approval.'):notNeeded('approval','Request submission authorization','Readiness must pass first.'));
      else if(applicationApproval.status==='PENDING')steps.push(ready('approval','Approve submission','The submission request exists but has not been authorized.','Review the exact package and explicitly approve or reject it.'));
      else steps.push(complete('approval','Authorize submission','Explicit authorization was recorded.'));

      if(applicationApproval?.status==='APPROVED')steps.push(ready('dispatch','Dispatch approved package','The action is authorized but has not yet crossed the external connector boundary.','Execute the approved action.'));
      else if(applicationApproval?.status==='EXECUTED')steps.push(complete('dispatch','Dispatch approved package','The authorized payload crossed the external connector boundary.'));
      else steps.push(notNeeded('dispatch','Dispatch approved package','Authorization must complete first.'));

      if(applicationApproval?.status==='EXECUTED'){
        if(deliveryState==='verified-received')steps.push(complete('receipt','Verify employer receipt','Provider receipt is verified.'));
        else if(deliveryState==='provider-acknowledged')steps.push(ready('receipt','Verify employer receipt','The provider acknowledged the message, but end-recipient receipt is not yet verified.','Wait for or ingest verifiable receipt evidence.'));
        else steps.push(ready('receipt','Verify employer receipt','Dispatch occurred, but Maya cannot claim the employer received it yet.','Ingest provider acknowledgement and verified receipt evidence.'));
      } else steps.push(notNeeded('receipt','Verify employer receipt','The package has not been dispatched.'));
    }
    if(kind==='interview')steps.push(opportunity?ready('practice','Run role-specific practice','Preparation exists; performance should be tested against the role and likely objections.','Start a structured interview round and score the response against evidence, clarity, judgment, and role relevance.'):notNeeded('practice','Run role-specific practice','No opportunity selected yet.'));
    steps.push(hasOutcome?complete('learn','Record outcome','A career outcome for this opportunity is present in the durable ledger.'):ready('learn','Record outcome','This workflow is not closed until the result is captured.','Record the application, screen, interview, rejection, offer, or post-hire outcome when known.'));
    completionDefinition=kind==='interview'?'The user is prepared against the actual role, completes evaluation, and the result is recorded for learning.':'A truthful role-specific package is authorized, dispatched, externally verified where applicable, and the result is recorded for learning.';
  }

  if(kind==='offer-negotiation'){
    steps.push(request.offers?.length?complete('offer','Load offer terms',`${request.offers.length} offer record(s) were supplied.`):blocked('offer','Load offer terms','Negotiation cannot be grounded without the actual offer terms.','Provide compensation, title, scope, schedule, benefits, location, flexibility, and other important terms.'));
    steps.push(request.offers?.length?ready('strategy','Build negotiation strategy','Maya can now compare economics, career value, priorities, and downside risk.','Set reservation value, target value, priority terms, and negotiation sequence.'):notNeeded('strategy','Build negotiation strategy','Offer terms are required first.'));
    steps.push(ready('close','Verify final agreement','Negotiation is not complete until final terms are confirmed.','Record the final written terms and the acceptance or decline decision.'));
    completionDefinition='The user reaches an evidence-backed accept, negotiate, or decline decision and records the final terms and outcome.';
  }

  if(steps.length===0)steps.push(ready('intent','Clarify career outcome','Maya needs a concrete outcome to choose the right workflow.','State the career outcome you want.'));

  const firstBlocked=steps.find(s=>s.status==='blocked');
  const firstReady=steps.find(s=>s.status==='ready');
  return {kind,endToEnd:true,complete:steps.every(s=>s.status==='complete'||s.status==='not-needed'),blocked:Boolean(firstBlocked),currentStep:(firstBlocked??firstReady)?.id,steps,completionDefinition,invariants:[...invariantRules]};
}
