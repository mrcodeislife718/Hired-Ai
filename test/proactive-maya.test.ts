import test from 'node:test';
import assert from 'node:assert/strict';
import { HiredEngine } from '../src/engine.js';
import { HiredRuntime } from '../src/runtime.js';
import type { PersistenceAdapter, StoreSnapshot } from '../src/persistence.js';
import { testCandidate, testEvidence, testJobs } from './test-records.js';

class MemoryPersistence implements PersistenceAdapter {
  snapshot?: StoreSnapshot;
  async load(){return this.snapshot?structuredClone(this.snapshot):undefined;}
  async save(snapshot:StoreSnapshot){this.snapshot=structuredClone(snapshot);}
}

function addDays(date:Date,days:number){return new Date(date.getTime()+days*86_400_000);}

function buildPlan(engine:HiredEngine,now:Date){
  return engine.createCareerPlan({
    goal:'Move into a stronger role',
    horizonMonths:3,
    targetAt:addDays(now,90).toISOString(),
    steps:[
      {id:'proof',title:'Refresh proof',description:'Refresh role-relevant evidence.',kind:'evidence',dependsOn:[],blockerIds:[],evidenceIds:[],opportunityIds:[],relationshipIds:[],successCriteria:['verified proof exists'],targetAt:addDays(now,1).toISOString()},
      {id:'apply',title:'Pursue the strongest role',description:'Use the refreshed proof in a selective application.',kind:'application',dependsOn:['proof'],blockerIds:[],evidenceIds:[],opportunityIds:[],relationshipIds:[],successCriteria:['application prepared'],targetAt:addDays(now,6).toISOString()}
    ],
    provenance:['test-goal']
  });
}

test('proactive Maya raises, suppresses, reactivates and resolves plan attention deterministically',()=>{
  const now=new Date('2026-08-28T12:00:00.000Z');
  const engine=new HiredEngine(testCandidate(),testEvidence());
  const plan=buildPlan(engine,now);

  const first=engine.evaluateProactive(now);
  assert.ok(first.signals.some(signal=>signal.kind==='plan-step-ready'&&signal.stepId==='proof'));
  assert.ok(first.signals.some(signal=>signal.kind==='plan-step-due'&&signal.stepId==='proof'));

  const ready=first.signals.find(signal=>signal.kind==='plan-step-ready'&&signal.stepId==='proof');
  assert.ok(ready);
  engine.snoozeProactive(ready!.id,addDays(now,2));
  assert.ok(!engine.proactive.actionable(addDays(now,1)).some(signal=>signal.id===ready!.id));
  assert.ok(engine.proactive.actionable(addDays(now,3)).some(signal=>signal.id===ready!.id));

  engine.startCareerPlanStep(plan.id,'proof');
  engine.completeCareerPlanStep(plan.id,'proof',['ev-ts']);
  const after=engine.evaluateProactive(addDays(now,1));
  assert.ok(after.signals.some(signal=>signal.kind==='plan-step-ready'&&signal.stepId==='apply'));
  assert.equal(engine.proactive.get(ready!.id).status,'resolved');
  assert.ok(engine.careerState.events.verifyChain().valid);
});

test('proactive Maya detects authorization, unverified delivery, follow-up and interview preparation from real workflow state',()=>{
  const now=new Date('2026-08-28T12:00:00.000Z');
  const engine=new HiredEngine(testCandidate(),testEvidence());
  const opportunity=engine.ingest(testJobs(now.toISOString())[0]);
  const approval=engine.requestOutreach(opportunity.id);

  const pending=engine.evaluateProactive(now);
  assert.ok(pending.signals.some(signal=>signal.kind==='approval-required'&&signal.sourceId===approval.id));

  engine.governor.approve(approval.id);
  engine.governor.executeApproved(approval.id);
  const later=engine.evaluateProactive(addDays(now,6));
  assert.ok(later.signals.some(signal=>signal.kind==='delivery-unverified'&&signal.sourceId===approval.id));
  assert.ok(later.signals.some(signal=>signal.kind==='application-follow-up'&&signal.opportunityId===opportunity.id));

  engine.governor.transition(opportunity.id,'RECRUITER_SCREEN');
  const interview=engine.evaluateProactive(addDays(now,6));
  assert.ok(interview.signals.some(signal=>signal.kind==='interview-preparation'&&signal.opportunityId===opportunity.id));
});

test('proactive Maya state and notification cooldown survive runtime restart',async()=>{
  const persistence=new MemoryPersistence();
  const now=new Date('2026-08-28T12:00:00.000Z');
  const runtime=await HiredRuntime.create(testCandidate(),testEvidence(),persistence);
  buildPlan(runtime.engine,now);
  const notices=runtime.engine.proactiveNotifications(now,5);
  assert.ok(notices.length>0);
  const firstId=notices[0].id;
  assert.ok(runtime.engine.proactive.get(firstId).lastNotifiedAt);
  await runtime.checkpoint();

  const restored=await HiredRuntime.create(testCandidate(),[],persistence);
  assert.equal(restored.engine.proactive.get(firstId).id,firstId);
  assert.equal(restored.engine.proactive.notificationBatch(addDays(now,0.5),5).some(signal=>signal.id===firstId),false);
  assert.ok(restored.engine.careerState.events.verifyChain().valid);
});

test('repeated proactive notifications remain idempotent after cooldown',()=>{
  const now=new Date('2026-08-28T12:00:00.000Z');
  const engine=new HiredEngine(testCandidate(),testEvidence());
  buildPlan(engine,now);
  const first=engine.proactiveNotifications(now,1);
  assert.equal(first.length,1);
  const second=engine.proactiveNotifications(addDays(now,2),1);
  assert.equal(second.length,1);
  assert.equal(second[0].id,first[0].id);
  assert.ok(engine.careerState.events.verifyChain().valid);
});

test('acknowledged proactive attention does not keep interrupting the user',()=>{
  const now=new Date('2026-08-28T12:00:00.000Z');
  const engine=new HiredEngine(testCandidate(),testEvidence());
  buildPlan(engine,now);
  const signal=engine.evaluateProactive(now).signals.find(item=>item.kind==='plan-step-ready');
  assert.ok(signal);
  engine.acknowledgeProactive(signal!.id,now);
  engine.evaluateProactive(addDays(now,2));
  assert.equal(engine.proactive.get(signal!.id).status,'acknowledged');
  assert.equal(engine.proactive.notificationBatch(addDays(now,3),10).some(item=>item.id===signal!.id),false);
});
