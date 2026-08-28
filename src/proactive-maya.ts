import { randomUUID } from 'node:crypto';
import type { ApprovalRequest, Opportunity } from './domain.js';
import type { CareerPlan, CareerPlanSnapshot } from './goal-plan-execution.js';
import type { CareerStateNode } from './career-state-graph.js';
import type { OpportunityWatchMatch } from './saved-opportunities.js';

export type ProactiveAttentionKind =
  | 'plan-step-ready'
  | 'plan-step-due'
  | 'plan-step-overdue'
  | 'plan-blocked'
  | 'approval-required'
  | 'delivery-unverified'
  | 'application-follow-up'
  | 'interview-preparation'
  | 'credential-stale'
  | 'opportunity-match';

export type ProactiveUrgency = 'low' | 'medium' | 'high' | 'critical';
export type ProactiveAttentionStatus = 'active' | 'snoozed' | 'acknowledged' | 'resolved';

export interface ProactiveAttentionSignal {
  id: string;
  candidateId: string;
  key: string;
  kind: ProactiveAttentionKind;
  urgency: ProactiveUrgency;
  title: string;
  reason: string;
  recommendedAction: string;
  source: string;
  sourceId?: string;
  opportunityId?: string;
  planId?: string;
  stepId?: string;
  nodeId?: string;
  dueAt?: string;
  firstSeenAt: string;
  lastSeenAt: string;
  lastNotifiedAt?: string;
  snoozedUntil?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  status: ProactiveAttentionStatus;
  occurrenceCount: number;
  provenance: string[];
  data: Record<string, unknown>;
}

export interface ProactiveMayaSnapshot {
  candidateId: string;
  signals: ProactiveAttentionSignal[];
}

export interface ProactiveEvaluationInput {
  candidateId: string;
  now?: Date;
  plans: CareerPlanSnapshot;
  opportunities: Opportunity[];
  approvals: ApprovalRequest[];
  deliveryState: (approvalId: string) => string | undefined;
  staleNodes: CareerStateNode[];
  watchMatches: OpportunityWatchMatch[];
}

interface SignalCandidate extends Omit<ProactiveAttentionSignal,'id'|'candidateId'|'firstSeenAt'|'lastSeenAt'|'lastNotifiedAt'|'snoozedUntil'|'acknowledgedAt'|'resolvedAt'|'status'|'occurrenceCount'> {}

const DAY = 86_400_000;
const clone=<T>(value:T):T=>structuredClone(value);
const iso=(date:Date)=>date.toISOString();
const ageDays=(date:string,now:Date)=>Math.max(0,(now.getTime()-Date.parse(date))/DAY);
const urgencyRank:Record<ProactiveUrgency,number>={critical:4,high:3,medium:2,low:1};

function validDate(value?:string){return Boolean(value&&!Number.isNaN(Date.parse(value)));}
function dueUrgency(targetAt:string,now:Date):ProactiveUrgency {
  const delta=(Date.parse(targetAt)-now.getTime())/DAY;
  if(delta<0)return delta<=-3?'critical':'high';
  if(delta<=1)return 'high';
  if(delta<=3)return 'medium';
  return 'low';
}
function signalKey(parts:(string|undefined)[]){return parts.filter(Boolean).join(':');}

function fromPlans(plans:CareerPlan[],now:Date):SignalCandidate[]{
  const out:SignalCandidate[]=[];
  for(const plan of plans.filter(p=>p.status==='active'||p.status==='blocked')){
    for(const step of plan.steps){
      if(step.status==='ready')out.push({key:signalKey(['plan-step-ready',plan.id,step.id]),kind:'plan-step-ready',urgency:'medium',title:step.title,reason:'This career-plan step is unblocked and ready to execute.',recommendedAction:`Start: ${step.title}`,source:'career-plan',sourceId:step.id,planId:plan.id,stepId:step.id,dueAt:step.targetAt,provenance:[`career-plan:${plan.id}`,`career-plan-step:${step.id}`],data:{goal:plan.goal,stepKind:step.kind,progress:plan.progress}});
      if(validDate(step.targetAt)&&step.status!=='completed'&&step.status!=='skipped'){
        const delta=(Date.parse(step.targetAt!)-now.getTime())/DAY;
        if(delta<=7){const overdue=delta<0;out.push({key:signalKey([overdue?'plan-step-overdue':'plan-step-due',plan.id,step.id]),kind:overdue?'plan-step-overdue':'plan-step-due',urgency:dueUrgency(step.targetAt!,now),title:step.title,reason:overdue?'A career-plan commitment is past its target date.':`A career-plan commitment is due within ${Math.max(0,Math.ceil(delta))} day(s).`,recommendedAction:overdue?'Replan, resolve the blocker, or complete the step.':'Protect time for this step before the deadline.',source:'career-plan',sourceId:step.id,planId:plan.id,stepId:step.id,dueAt:step.targetAt,provenance:[`career-plan:${plan.id}`,`career-plan-step:${step.id}`],data:{goal:plan.goal,status:step.status,progress:plan.progress}});}
      }
    }
    const unresolved=plan.blockers.filter(b=>!b.resolvedAt);
    for(const blocker of unresolved){const affected=plan.steps.filter(s=>s.blockerIds.includes(blocker.id)&&s.status==='blocked');if(!affected.length)continue;out.push({key:signalKey(['plan-blocked',plan.id,blocker.id]),kind:'plan-blocked',urgency:blocker.resolvable?'high':'medium',title:blocker.label,reason:blocker.reason,recommendedAction:blocker.resolvable?'Resolve the blocker or choose an alternative route.':'Replan around this constraint instead of waiting on an impossible dependency.',source:'career-plan',sourceId:blocker.id,planId:plan.id,provenance:[`career-plan:${plan.id}`,`career-plan-blocker:${blocker.id}`],data:{goal:plan.goal,affectedStepIds:affected.map(s=>s.id),resolvable:blocker.resolvable}});}
  }
  return out;
}

function fromApprovals(approvals:ApprovalRequest[],deliveryState:(id:string)=>string|undefined,now:Date):SignalCandidate[]{
  const out:SignalCandidate[]=[];
  for(const approval of approvals){
    if(approval.status==='PENDING')out.push({key:signalKey(['approval-required',approval.id]),kind:'approval-required',urgency:ageDays(approval.createdAt,now)>=1?'high':'medium',title:'Your authorization is needed',reason:`Maya prepared ${approval.action.toLowerCase().replaceAll('_',' ')} but cannot perform the identity-bearing action without approval.`,recommendedAction:'Review the prepared action and approve or decline it.',source:'governor',sourceId:approval.id,opportunityId:approval.opportunityId,provenance:[`approval:${approval.id}`],data:{action:approval.action,ageDays:ageDays(approval.createdAt,now)}});
    if(approval.status==='EXECUTED'){
      const state=deliveryState(approval.id);
      if(state&&state!=='verified-received'&&ageDays(approval.createdAt,now)>=1)out.push({key:signalKey(['delivery-unverified',approval.id]),kind:'delivery-unverified',urgency:ageDays(approval.createdAt,now)>=3?'high':'medium',title:'External delivery is still unverified',reason:`The authorized ${approval.action.toLowerCase().replaceAll('_',' ')} crossed the connector boundary, but Maya does not have verified receipt.`,recommendedAction:'Verify provider acknowledgement or receipt before treating the action as delivered.',source:'delivery',sourceId:approval.id,opportunityId:approval.opportunityId,provenance:[`approval:${approval.id}`,`delivery:${approval.id}`],data:{deliveryState:state,ageDays:ageDays(approval.createdAt,now)}});
    }
  }
  return out;
}

function fromOpportunities(opportunities:Opportunity[],now:Date):SignalCandidate[]{
  const out:SignalCandidate[]=[];
  for(const opportunity of opportunities){
    const age=ageDays(opportunity.updatedAt,now);
    if((opportunity.state==='APPLIED'||opportunity.state==='CONTACTED')&&age>=5)out.push({key:signalKey(['application-follow-up',opportunity.id,opportunity.state]),kind:'application-follow-up',urgency:age>=10?'high':'medium',title:`Follow up on ${opportunity.job.title}`,reason:`${opportunity.job.company} has been in ${opportunity.state.toLowerCase()} state for ${Math.floor(age)} day(s) without a recorded next-stage event.`,recommendedAction:'Check for a verified response and prepare a selective follow-up if appropriate.',source:'opportunity',sourceId:opportunity.id,opportunityId:opportunity.id,provenance:[`opportunity:${opportunity.id}`],data:{company:opportunity.job.company,title:opportunity.job.title,state:opportunity.state,ageDays:age}});
    if(['RECRUITER_SCREEN','TECHNICAL','ONSITE'].includes(opportunity.state))out.push({key:signalKey(['interview-preparation',opportunity.id,opportunity.state]),kind:'interview-preparation',urgency:'high',title:`Prepare for ${opportunity.job.title}`,reason:`The opportunity is currently at ${opportunity.state.toLowerCase().replaceAll('_',' ')}, so interview preparation has immediate expected value.`,recommendedAction:'Run role-specific interview preparation from the same evidence package used in the application.',source:'opportunity',sourceId:opportunity.id,opportunityId:opportunity.id,provenance:[`opportunity:${opportunity.id}`],data:{company:opportunity.job.company,title:opportunity.job.title,state:opportunity.state}});
  }
  return out;
}

function fromStaleNodes(nodes:CareerStateNode[]):SignalCandidate[]{
  return nodes.filter(node=>node.kind==='credential').map(node=>({key:signalKey(['credential-stale',node.id]),kind:'credential-stale' as const,urgency:'high' as const,title:`Credential needs attention: ${node.label}`,reason:'This credential is stale or has crossed its configured reverification/expiration boundary.',recommendedAction:'Verify whether it is still valid, renew it if required, and refresh canonical career evidence.',source:'career-state',sourceId:node.id,nodeId:node.id,dueAt:node.staleAfter,provenance:[...node.provenance,`career-state-node:${node.id}`],data:{semanticKey:node.semanticKey,staleAfter:node.staleAfter,truthClass:node.truthClass}}));
}

function fromWatchMatches(matches:OpportunityWatchMatch[]):SignalCandidate[]{
  return matches.filter(match=>match.matches.length>0).map(match=>{const top=match.matches[0];return {key:signalKey(['opportunity-match',match.watchId,top.opportunityId]),kind:'opportunity-match' as const,urgency:top.score>=85?'high' as const:'medium' as const,title:'A watched opportunity now matches',reason:`A saved opportunity watch found ${match.matches.length} matching role(s); the strongest current match scores ${top.score}.`,recommendedAction:'Review the strongest match before it becomes stale.',source:'opportunity-watch',sourceId:match.watchId,opportunityId:top.opportunityId,provenance:[`opportunity-watch:${match.watchId}`,`opportunity:${top.opportunityId}`],data:{score:top.score,totalMatches:match.matches.length}};});
}

export class ProactiveMayaEngine {
  private readonly signals=new Map<string,ProactiveAttentionSignal>();
  constructor(readonly candidateId:string,snapshot?:ProactiveMayaSnapshot){if(snapshot){if(snapshot.candidateId!==candidateId)throw new Error('proactive Maya candidate mismatch');for(const signal of snapshot.signals){if(signal.candidateId!==candidateId)throw new Error('proactive Maya restored signal candidate mismatch');if(this.signals.has(signal.key))throw new Error(`duplicate proactive Maya signal key: ${signal.key}`);this.signals.set(signal.key,clone(signal));}}}

  evaluate(input:ProactiveEvaluationInput){
    if(input.candidateId!==this.candidateId)throw new Error('proactive Maya evaluation candidate mismatch');
    if(input.plans.candidateId!==this.candidateId)throw new Error('proactive Maya plan candidate mismatch');
    const now=input.now??new Date();const at=iso(now);
    const candidates=[...fromPlans(input.plans.plans,now),...fromApprovals(input.approvals,input.deliveryState,now),...fromOpportunities(input.opportunities,now),...fromStaleNodes(input.staleNodes),...fromWatchMatches(input.watchMatches)];
    const currentKeys=new Set(candidates.map(c=>c.key));
    const transitions:Array<{type:'raised'|'updated'|'resolved';signal:ProactiveAttentionSignal}>=[];
    for(const candidate of candidates){
      const existing=this.signals.get(candidate.key);
      if(!existing){const signal:ProactiveAttentionSignal={...clone(candidate),id:`pat_${randomUUID()}`,candidateId:this.candidateId,firstSeenAt:at,lastSeenAt:at,status:'active',occurrenceCount:1};this.signals.set(signal.key,signal);transitions.push({type:'raised',signal:clone(signal)});continue;}
      const status=existing.status==='resolved'?'active':existing.status;
      const updated:ProactiveAttentionSignal={...existing,...clone(candidate),status,lastSeenAt:at,resolvedAt:undefined,occurrenceCount:existing.occurrenceCount+1};
      const materiallyChanged=existing.urgency!==updated.urgency||existing.reason!==updated.reason||existing.recommendedAction!==updated.recommendedAction||existing.status!==updated.status||existing.dueAt!==updated.dueAt;
      this.signals.set(updated.key,updated);if(materiallyChanged)transitions.push({type:'updated',signal:clone(updated)});
    }
    for(const existing of this.signals.values())if(!currentKeys.has(existing.key)&&existing.status!=='resolved'){const resolved={...existing,status:'resolved' as const,resolvedAt:at,lastSeenAt:at};this.signals.set(existing.key,resolved);transitions.push({type:'resolved',signal:clone(resolved)});}
    return {signals:this.actionable(now),transitions,summary:this.summary(now)};
  }

  actionable(now=new Date(),limit=20){return clone([...this.signals.values()].filter(signal=>signal.status==='active'||(signal.status==='snoozed'&&(!signal.snoozedUntil||Date.parse(signal.snoozedUntil)<=now.getTime()))).sort((a,b)=>urgencyRank[b.urgency]-urgencyRank[a.urgency]||Date.parse(a.firstSeenAt)-Date.parse(b.firstSeenAt)).slice(0,limit));}
  markNotified(signalId:string,at=new Date()){const signal=this.requiredById(signalId);const updated={...signal,lastNotifiedAt:iso(at)};this.signals.set(signal.key,updated);return clone(updated);}
  acknowledge(signalId:string,at=new Date()){const signal=this.requiredById(signalId);const updated={...signal,status:'acknowledged' as const,acknowledgedAt:iso(at),snoozedUntil:undefined};this.signals.set(signal.key,updated);return clone(updated);}
  snooze(signalId:string,until:Date){if(Number.isNaN(until.getTime()))throw new Error('valid proactive Maya snooze time required');const signal=this.requiredById(signalId);const updated={...signal,status:'snoozed' as const,snoozedUntil:iso(until),acknowledgedAt:undefined};this.signals.set(signal.key,updated);return clone(updated);}
  get(signalId:string){return clone(this.requiredById(signalId));}
  all(){return clone([...this.signals.values()]);}
  snapshot():ProactiveMayaSnapshot{return {candidateId:this.candidateId,signals:this.all()};}
  summary(now=new Date()){const all=[...this.signals.values()];const actionable=this.actionable(now,Number.MAX_SAFE_INTEGER);return {candidateId:this.candidateId,total:all.length,actionable:actionable.length,critical:actionable.filter(s=>s.urgency==='critical').length,high:actionable.filter(s=>s.urgency==='high').length,medium:actionable.filter(s=>s.urgency==='medium').length,low:actionable.filter(s=>s.urgency==='low').length,unresolved:all.filter(s=>s.status!=='resolved').length};}
  shouldNotify(signal:ProactiveAttentionSignal,now=new Date(),cooldownHours=24){if(signal.status==='acknowledged'||signal.status==='resolved')return false;if(signal.status==='snoozed'&&signal.snoozedUntil&&Date.parse(signal.snoozedUntil)>now.getTime())return false;if(!signal.lastNotifiedAt)return true;return now.getTime()-Date.parse(signal.lastNotifiedAt)>=cooldownHours*3_600_000;}
  notificationBatch(now=new Date(),limit=5){return this.actionable(now,100).filter(signal=>this.shouldNotify(signal,now)).slice(0,limit);}

  private requiredById(id:string){const signal=[...this.signals.values()].find(item=>item.id===id);if(!signal)throw new Error('proactive Maya signal not found');return signal;}
}
