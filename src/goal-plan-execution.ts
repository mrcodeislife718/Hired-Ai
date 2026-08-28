import { createHash, randomUUID } from 'node:crypto';

export type CareerPlanStatus = 'draft' | 'active' | 'blocked' | 'completed' | 'paused' | 'superseded';
export type CareerPlanStepStatus = 'pending' | 'ready' | 'blocked' | 'in-progress' | 'completed' | 'skipped';
export type CareerPlanStepKind = 'credential' | 'evidence' | 'experience' | 'relationship' | 'opportunity' | 'application' | 'interview' | 'negotiation' | 'advancement' | 'research' | 'decision' | 'other';

export interface CareerPlanStep {
  id: string;
  title: string;
  description: string;
  kind: CareerPlanStepKind;
  status: CareerPlanStepStatus;
  dependsOn: string[];
  blockerIds: string[];
  evidenceIds: string[];
  opportunityIds: string[];
  relationshipIds: string[];
  successCriteria: string[];
  targetAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface CareerPlanBlocker {
  id: string;
  label: string;
  reason: string;
  resolvable: boolean;
  resolution?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface CareerPlanRoute {
  id: string;
  label: string;
  description: string;
  stepIds: string[];
  probability?: number;
  expectedMonths?: number;
  expectedCompensation?: number;
  risk?: 'low' | 'medium' | 'high';
}

export interface CareerPlan {
  id: string;
  candidateId: string;
  goal: string;
  goalNodeId?: string;
  status: CareerPlanStatus;
  horizonMonths?: number;
  targetAt?: string;
  steps: CareerPlanStep[];
  blockers: CareerPlanBlocker[];
  routes: CareerPlanRoute[];
  activeRouteId?: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
  version: number;
  supersedes?: string;
  provenance: string[];
}

export interface CareerPlanInput {
  candidateId: string;
  goal: string;
  horizonMonths?: number;
  targetAt?: string;
  steps: Array<Omit<CareerPlanStep,'id'|'status'|'createdAt'|'updatedAt'|'version'> & { id?: string; status?: CareerPlanStepStatus }>;
  routes?: Array<Omit<CareerPlanRoute,'id'> & { id?: string }>;
  provenance?: string[];
}

export interface CareerPlanSnapshot { candidateId: string; plans: CareerPlan[]; }

const now=()=>new Date().toISOString();
const clone=<T>(value:T):T=>structuredClone(value);
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

function recalculate(plan: CareerPlan): CareerPlan {
  const complete = new Set(plan.steps.filter(step=>step.status==='completed'||step.status==='skipped').map(step=>step.id));
  const unresolved = new Set(plan.blockers.filter(blocker=>!blocker.resolvedAt).map(blocker=>blocker.id));
  const at=now();
  const steps=plan.steps.map(step=>{
    if(step.status==='completed'||step.status==='skipped'||step.status==='in-progress') return step;
    const dependencyBlocked=step.dependsOn.some(id=>!complete.has(id));
    const blockerBlocked=step.blockerIds.some(id=>unresolved.has(id));
    const nextStatus:CareerPlanStepStatus=dependencyBlocked||blockerBlocked?'blocked':'ready';
    return step.status===nextStatus?step:{...step,status:nextStatus,updatedAt:at,version:step.version+1};
  });
  const completed=steps.filter(step=>step.status==='completed'||step.status==='skipped').length;
  const progress=steps.length?Math.round((completed/steps.length)*100):0;
  const hasBlocked=steps.some(step=>step.status==='blocked');
  const allDone=steps.length>0&&completed===steps.length;
  const status:CareerPlanStatus=allDone?'completed':plan.status==='paused'||plan.status==='superseded'?plan.status:hasBlocked&&steps.every(step=>step.status==='blocked'||step.status==='completed'||step.status==='skipped')?'blocked':'active';
  return {...plan,steps,progress,status,updatedAt:at};
}

export class GoalPlanExecutionEngine {
  private readonly plans=new Map<string,CareerPlan>();
  constructor(readonly candidateId:string,snapshot?:CareerPlanSnapshot){
    if(snapshot){
      if(snapshot.candidateId!==candidateId)throw new Error('career plan candidate mismatch');
      for(const plan of snapshot.plans)this.validateAndStore(plan);
    }
  }

  create(input:CareerPlanInput){
    if(input.candidateId!==this.candidateId)throw new Error('career plan candidate mismatch');
    if(!input.goal.trim())throw new Error('career plan goal required');
    if(input.targetAt&&Number.isNaN(Date.parse(input.targetAt)))throw new Error('career plan targetAt must be an ISO timestamp');
    const at=now();
    const seen=new Set<string>();
    const steps=input.steps.map(raw=>{
      const id=raw.id??`cps_${randomUUID()}`;
      if(seen.has(id))throw new Error(`duplicate career plan step id: ${id}`);seen.add(id);
      return {...clone(raw),id,status:raw.status??'pending',createdAt:at,updatedAt:at,version:1} as CareerPlanStep;
    });
    for(const step of steps)for(const dep of step.dependsOn)if(!seen.has(dep))throw new Error(`unknown career plan dependency: ${dep}`);
    const routes=(input.routes??[]).map(route=>({...clone(route),id:route.id??`cpr_${randomUUID()}`}));
    for(const route of routes)for(const stepId of route.stepIds)if(!seen.has(stepId))throw new Error(`route references unknown career plan step: ${stepId}`);
    const plan:CareerPlan={id:`cp_${randomUUID()}`,candidateId:this.candidateId,goal:input.goal.trim(),status:'draft',horizonMonths:input.horizonMonths,targetAt:input.targetAt,steps,blockers:[],routes,activeRouteId:routes[0]?.id,progress:0,createdAt:at,updatedAt:at,version:1,provenance:[...(input.provenance??['user-goal'])]};
    const active=recalculate({...plan,status:'active'});
    this.plans.set(active.id,active);
    return clone(active);
  }

  addBlocker(planId:string,input:{label:string;reason:string;resolvable?:boolean;resolution?:string},stepIds:string[]=[]){
    const plan=this.required(planId);const at=now();
    const blocker:CareerPlanBlocker={id:`cpb_${randomUUID()}`,label:input.label.trim(),reason:input.reason.trim(),resolvable:input.resolvable??true,resolution:input.resolution,createdAt:at};
    if(!blocker.label||!blocker.reason)throw new Error('career plan blocker label and reason required');
    const target=new Set(stepIds);
    if([...target].some(id=>!plan.steps.some(step=>step.id===id)))throw new Error('career plan blocker references unknown step');
    const updated:CareerPlan={...plan,blockers:[...plan.blockers,blocker],steps:plan.steps.map(step=>target.has(step.id)?{...step,blockerIds:[...new Set([...step.blockerIds,blocker.id])],updatedAt:at,version:step.version+1}:step),version:plan.version+1,updatedAt:at};
    const next=recalculate(updated);this.plans.set(planId,next);return {plan:clone(next),blocker:clone(blocker)};
  }

  resolveBlocker(planId:string,blockerId:string){
    const plan=this.required(planId);const at=now();let found=false;
    const blockers=plan.blockers.map(blocker=>{if(blocker.id!==blockerId)return blocker;found=true;return {...blocker,resolvedAt:at};});
    if(!found)throw new Error('career plan blocker not found');
    const next=recalculate({...plan,blockers,version:plan.version+1,updatedAt:at});this.plans.set(planId,next);return clone(next);
  }

  startStep(planId:string,stepId:string){return this.transitionStep(planId,stepId,'in-progress');}
  completeStep(planId:string,stepId:string,evidenceIds:string[]=[]){
    const plan=this.required(planId);const step=plan.steps.find(item=>item.id===stepId);if(!step)throw new Error('career plan step not found');
    if(step.status==='blocked')throw new Error('blocked career plan step cannot be completed');
    const at=now();
    const steps=plan.steps.map(item=>item.id===stepId?{...item,status:'completed' as const,evidenceIds:[...new Set([...item.evidenceIds,...evidenceIds])],completedAt:at,updatedAt:at,version:item.version+1}:item);
    const next=recalculate({...plan,steps,version:plan.version+1,updatedAt:at});this.plans.set(planId,next);return clone(next);
  }

  replan(planId:string,input:{reason:string;steps?:CareerPlanInput['steps'];routes?:CareerPlanInput['routes'];targetAt?:string;horizonMonths?:number}){
    const previous=this.required(planId);if(!input.reason.trim())throw new Error('replan reason required');
    const replacement=this.create({candidateId:this.candidateId,goal:previous.goal,horizonMonths:input.horizonMonths??previous.horizonMonths,targetAt:input.targetAt??previous.targetAt,steps:input.steps??previous.steps.map(({id,title,description,kind,dependsOn,blockerIds,evidenceIds,opportunityIds,relationshipIds,successCriteria,targetAt,status})=>({id,title,description,kind,dependsOn,blockerIds,evidenceIds,opportunityIds,relationshipIds,successCriteria,targetAt,status})),routes:input.routes??previous.routes.map(({id,label,description,stepIds,probability,expectedMonths,expectedCompensation,risk})=>({id,label,description,stepIds,probability,expectedMonths,expectedCompensation,risk})),provenance:[...previous.provenance,`replan:${input.reason.trim()}`]});
    const old={...previous,status:'superseded' as const,updatedAt:now(),version:previous.version+1};this.plans.set(previous.id,old);
    const next={...replacement,supersedes:previous.id};this.plans.set(next.id,next);return clone(next);
  }

  selectRoute(planId:string,routeId:string){const plan=this.required(planId);if(!plan.routes.some(route=>route.id===routeId))throw new Error('career plan route not found');const next={...plan,activeRouteId:routeId,version:plan.version+1,updatedAt:now()};this.plans.set(planId,next);return clone(next);}
  get(planId:string){return clone(this.required(planId));}
  all(){return clone([...this.plans.values()]);}
  active(){return clone([...this.plans.values()].filter(plan=>plan.status==='active'||plan.status==='blocked'||plan.status==='paused'));}
  snapshot():CareerPlanSnapshot{return {candidateId:this.candidateId,plans:this.all()};}
  integrity(){const plans=this.all();return {candidateId:this.candidateId,plans:plans.length,digest:digest(plans),valid:plans.every(plan=>plan.candidateId===this.candidateId&&new Set(plan.steps.map(s=>s.id)).size===plan.steps.length)};}

  private transitionStep(planId:string,stepId:string,status:CareerPlanStepStatus){const plan=this.required(planId);const step=plan.steps.find(item=>item.id===stepId);if(!step)throw new Error('career plan step not found');if(status==='in-progress'&&step.status!=='ready')throw new Error(`career plan step must be ready before starting; current=${step.status}`);const at=now();const steps=plan.steps.map(item=>item.id===stepId?{...item,status,updatedAt:at,version:item.version+1}:item);const next=recalculate({...plan,steps,version:plan.version+1,updatedAt:at});this.plans.set(planId,next);return clone(next);}
  private required(planId:string){const plan=this.plans.get(planId);if(!plan)throw new Error('career plan not found');return plan;}
  private validateAndStore(plan:CareerPlan){if(plan.candidateId!==this.candidateId)throw new Error('career plan candidate mismatch');const ids=new Set(plan.steps.map(step=>step.id));if(ids.size!==plan.steps.length)throw new Error('duplicate career plan step during restore');for(const step of plan.steps)for(const dep of step.dependsOn)if(!ids.has(dep))throw new Error(`invalid restored career plan dependency: ${dep}`);this.plans.set(plan.id,clone(plan));}
}
