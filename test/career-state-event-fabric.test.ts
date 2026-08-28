import test from 'node:test';
import assert from 'node:assert/strict';
import { CareerEventFabric } from '../src/career-event-fabric.js';
import { CareerStateGraph } from '../src/career-state-graph.js';
import { HiredRuntime } from '../src/runtime.js';
import type { PersistenceAdapter, StoreSnapshot } from '../src/persistence.js';
import { testCandidate, testEvidence, testJobs } from './test-records.js';

class MemoryPersistence implements PersistenceAdapter {
  snapshot?: StoreSnapshot;
  async load() { return this.snapshot ? structuredClone(this.snapshot) : undefined; }
  async save(snapshot: StoreSnapshot) { this.snapshot = structuredClone(snapshot); }
}

test('career event fabric is idempotent, replayable and tamper evident', () => {
  const fabric = new CareerEventFabric('candidate-a');
  const at = new Date().toISOString();
  const first = fabric.append({
    candidateId:'candidate-a',type:'goal_changed',actor:'user',source:'conversation',aggregateId:'goal-a',
    idempotencyKey:'goal-a-v1',payload:{goal:'Become a hospital administrator'},provenance:['conversation:1'],occurredAt:at
  });
  const duplicate = fabric.append({
    candidateId:'candidate-a',type:'goal_changed',actor:'user',source:'conversation',aggregateId:'goal-a',
    idempotencyKey:'goal-a-v1',payload:{goal:'Become a hospital administrator'},provenance:['conversation:1'],occurredAt:at
  });
  assert.equal(first.id, duplicate.id);
  assert.equal(fabric.all().length, 1);
  assert.equal(fabric.verifyChain().valid, true);
  assert.throws(() => fabric.append({
    candidateId:'candidate-a',type:'goal_changed',actor:'user',source:'conversation',aggregateId:'goal-a',
    idempotencyKey:'goal-a-v1',payload:{goal:'Different goal'},provenance:['conversation:1'],occurredAt:at
  }), /idempotency conflict/);

  const roundTrip = JSON.parse(JSON.stringify(fabric.snapshot()));
  const restored = new CareerEventFabric('candidate-a', roundTrip);
  assert.equal(restored.verifyChain().valid, true);
  const replayed = restored.replay<string[]>([], (state,event) => [...state,event.type]);
  assert.deepEqual(replayed, ['goal_changed']);
});

test('career state graph versions truth, detects contradictions and survives JSON round trips', () => {
  const graph = new CareerStateGraph('candidate-b');
  const at = new Date().toISOString();
  const first = graph.upsertNode({candidateId:'candidate-b',kind:'credential',semanticKey:'credential:license',label:'Professional license',status:'active',truthClass:'verified-fact',confidence:1,provenance:['registry:1'],evidenceIds:['license-1'],data:{status:'active'},validFrom:at});
  const conflict = graph.upsertNode({candidateId:'candidate-b',kind:'credential',semanticKey:'credential:license',label:'Professional license',status:'expired',truthClass:'verified-fact',confidence:1,provenance:['registry:2'],evidenceIds:['license-2'],data:{status:'expired'},validFrom:at});
  assert.ok(conflict.contradiction);
  assert.equal(graph.unresolvedContradictions().length, 1);
  graph.resolveContradiction(conflict.contradiction!.id, conflict.node.id);
  assert.equal(graph.unresolvedContradictions().length, 0);

  const second = graph.upsertNode({candidateId:'candidate-b',kind:'goal',semanticKey:'goal:primary',label:'Primary goal',status:'active',truthClass:'observation',confidence:1,provenance:['conversation:1'],evidenceIds:[],data:{goal:'Management'},validFrom:at});
  const revised = graph.upsertNode({candidateId:'candidate-b',kind:'goal',semanticKey:'goal:primary',label:'Primary goal',status:'active',truthClass:'observation',confidence:1,provenance:['conversation:2'],evidenceIds:[],data:{goal:'Executive leadership'},validFrom:new Date(Date.now()+1000).toISOString(),supersedes:second.node.id});
  assert.equal(revised.contradiction, undefined);
  assert.equal(graph.activeBySemanticKey('goal:primary')[0]?.data.goal, 'Executive leadership');

  const restored = new CareerStateGraph('candidate-b', JSON.parse(JSON.stringify(graph.snapshot())));
  assert.equal(restored.summary().digest, graph.summary().digest);
  assert.equal(first.node.truthClass, 'verified-fact');
});

test('career state and event fabric follow application delivery end to end and survive restart', async () => {
  const persistence = new MemoryPersistence();
  const profile = testCandidate();
  const runtime = await HiredRuntime.create(profile, testEvidence(), persistence);
  const opportunity = runtime.engine.ingest(testJobs()[0]);

  runtime.engine.updateCareerTwin('goals', {
    key:'goals',value:['Win a strong next role'],source:'user',confidence:'confirmed',evidenceIds:[],observedAt:new Date().toISOString()
  });

  const approval = runtime.engine.requestApplication(opportunity.id);
  runtime.engine.governor.approve(approval.id);
  runtime.engine.governor.executeApproved(approval.id);
  runtime.engine.governor.providerAcknowledged(approval.id,'test-provider','provider-message-1');
  runtime.engine.governor.verifyReceived(approval.id,'test-provider','provider-message-1');
  runtime.engine.recordCareerOutcome({id:'outcome-1',candidateId:profile.id,opportunityId:opportunity.id,checkpoint:'application',at:new Date().toISOString()});

  const before = runtime.engine.careerState.summary();
  assert.equal(before.eventIntegrity.valid, true);
  assert.equal(runtime.engine.store.opportunities.get(opportunity.id)?.state, 'APPLIED');
  assert.equal(runtime.engine.careerState.graph.activeBySemanticKey(`opportunity:${opportunity.id}`)[0]?.data.state, 'APPLIED');
  const eventTypes = runtime.engine.careerState.events.all().map(event => event.type);
  for (const required of ['opportunity_discovered','opportunity_state_changed','approval_requested','approval_granted','action_dispatched','provider_acknowledged','receipt_verified','career_outcome_recorded']) {
    assert.ok(eventTypes.includes(required as never), `missing event ${required}`);
  }

  await runtime.checkpoint();
  const digest = runtime.engine.careerState.graph.summary().digest;
  const headHash = runtime.engine.careerState.events.verifyChain().headHash;

  const restarted = await HiredRuntime.create(profile, [], persistence);
  assert.equal(restarted.engine.careerState.graph.summary().digest, digest);
  assert.equal(restarted.engine.careerState.events.verifyChain().headHash, headHash);
  assert.equal(restarted.engine.careerState.events.verifyChain().valid, true);
  assert.equal(restarted.engine.store.opportunities.get(opportunity.id)?.state, 'APPLIED');
  assert.equal(restarted.engine.careerState.graph.activeBySemanticKey(`opportunity:${opportunity.id}`)[0]?.data.state, 'APPLIED');
});
