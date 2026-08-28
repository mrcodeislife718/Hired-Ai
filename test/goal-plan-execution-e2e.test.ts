import test from 'node:test';
import assert from 'node:assert/strict';
import { HiredEngine } from '../src/engine.js';
import { GoalPlanExecutionEngine } from '../src/goal-plan-execution.js';
import { testCandidate, testEvidence } from './test-records.js';

const step=(id:string,title:string,dependsOn:string[]=[])=>({id,title,description:title,kind:'evidence' as const,dependsOn,blockerIds:[],evidenceIds:[],opportunityIds:[],relationshipIds:[],successCriteria:[`Complete ${title}`]});

test('goal plan enforces dependencies, blockers, progress and completion',()=>{
  const planner=new GoalPlanExecutionEngine('candidate-1');
  const plan=planner.create({candidateId:'candidate-1',goal:'Become a hospital administrator',horizonMonths:24,steps:[step('s1','Validate transferable evidence'),step('s2','Close credential gap',['s1']),step('s3','Pursue target roles',['s2'])]});
  assert.equal(plan.steps.find(s=>s.id==='s1')?.status,'ready');
  assert.equal(plan.steps.find(s=>s.id==='s2')?.status,'blocked');
  assert.throws(()=>planner.startStep(plan.id,'s2'),/ready/);
  planner.startStep(plan.id,'s1');
  let next=planner.completeStep(plan.id,'s1');
  assert.equal(next.steps.find(s=>s.id==='s2')?.status,'ready');
  const blocked=planner.addBlocker(plan.id,{label:'credential verification',reason:'Required credential has not been verified'},['s2']);
  assert.equal(blocked.plan.steps.find(s=>s.id==='s2')?.status,'blocked');
  next=planner.resolveBlocker(plan.id,blocked.blocker.id);
  assert.equal(next.steps.find(s=>s.id==='s2')?.status,'ready');
  planner.startStep(plan.id,'s2');planner.completeStep(plan.id,'s2');planner.startStep(plan.id,'s3');next=planner.completeStep(plan.id,'s3');
  assert.equal(next.status,'completed');assert.equal(next.progress,100);
});

test('engine integrates plans with canonical graph and event fabric and survives restore',()=>{
  const candidate=testCandidate();const evidence=testEvidence();
  const engine=new HiredEngine(candidate,evidence);
  const plan=engine.createCareerPlan({goal:'Advance into staff-level leadership',horizonMonths:18,steps:[step('lead-1','Build next-level proof'),step('lead-2','Target staff opportunities',['lead-1'])],routes:[{id:'internal',label:'Internal promotion',description:'Build promotion case',stepIds:['lead-1','lead-2'],probability:.55,expectedMonths:12,risk:'low'},{id:'external',label:'External move',description:'Pursue external staff roles',stepIds:['lead-1','lead-2'],probability:.45,expectedMonths:9,risk:'medium'}]});
  engine.startCareerPlanStep(plan.id,'lead-1');
  const advanced=engine.completeCareerPlanStep(plan.id,'lead-1',[evidence[0]!.id]);
  assert.equal(advanced.steps.find(s=>s.id==='lead-2')?.status,'ready');
  engine.selectCareerPlanRoute(plan.id,'external');
  const state=engine.durableState();
  const restored=new HiredEngine(candidate,evidence,state);
  assert.equal(restored.careerPlans().length,1);
  assert.equal(restored.careerPlans()[0]?.activeRouteId,'external');
  assert.equal(restored.careerPlans()[0]?.steps.find(s=>s.id==='lead-1')?.status,'completed');
  assert.equal(restored.careerState.events.verifyChain().valid,true);
  assert.ok(restored.careerState.graph.activeByKind('career-path').length>=1);
  assert.ok(restored.careerState.events.all().some(event=>event.type==='plan_changed'));
});

test('replanning preserves old plan as superseded and creates a new executable route',()=>{
  const planner=new GoalPlanExecutionEngine('candidate-2');
  const original=planner.create({candidateId:'candidate-2',goal:'Move into operations leadership',steps:[step('a','Build operations proof'),step('b','Pursue manager roles',['a'])]});
  const replacement=planner.replan(original.id,{reason:'market conditions changed',steps:[step('a2','Build operations proof'),step('c2','Pursue supervisor bridge roles',['a2']),step('b2','Pursue manager roles',['c2'])]});
  assert.equal(planner.get(original.id).status,'superseded');
  assert.equal(replacement.supersedes,original.id);
  assert.equal(replacement.steps.find(s=>s.id==='a2')?.status,'ready');
  assert.equal(replacement.steps.find(s=>s.id==='b2')?.status,'blocked');
});

test('planner restore rejects corrupted dependency state',()=>{
  const planner=new GoalPlanExecutionEngine('candidate-3');
  const plan=planner.create({candidateId:'candidate-3',goal:'Career goal',steps:[step('x','First')]});
  const snapshot=planner.snapshot();
  snapshot.plans[0]!.steps[0]!.dependsOn=['missing'];
  assert.throws(()=>new GoalPlanExecutionEngine('candidate-3',snapshot),/invalid restored career plan dependency/);
  assert.equal(plan.status,'active');
});
