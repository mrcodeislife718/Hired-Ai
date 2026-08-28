import test from 'node:test';
import assert from 'node:assert/strict';
import { ConnectorFabric, ConnectorRetryableError, type CareerConnector, type ConnectorDispatchRequest } from '../src/connector-fabric.js';
import { HiredRuntime } from '../src/runtime.js';
import type { PersistenceAdapter, StoreSnapshot } from '../src/persistence.js';
import { testCandidate, testEvidence, testJobs } from './test-records.js';

class MemoryPersistence implements PersistenceAdapter {
  snapshot?:StoreSnapshot;
  async load(){return this.snapshot?structuredClone(this.snapshot):undefined;}
  async save(snapshot:StoreSnapshot){this.snapshot=structuredClone(snapshot);}
}

class ReceiptConnector implements CareerConnector {
  readonly id='receipt-test';
  readonly provider='ats.example';
  readonly capabilities=['submit-application','send-outreach'] as const;
  calls:ConnectorDispatchRequest[]=[];
  async dispatch(request:ConnectorDispatchRequest){this.calls.push(structuredClone(request));return{providerMessageId:`msg-${request.operationId}`,acknowledged:true,verifiedReceived:true,detail:'provider accepted and confirmed receipt'};}
}

class RetryConnector implements CareerConnector {
  readonly id='retry-test';readonly provider='retry.example';readonly capabilities=['send-outreach'] as const;
  calls=0;
  async dispatch(){this.calls++;if(this.calls<3)throw new ConnectorRetryableError('temporary provider outage',1000);return{providerMessageId:'retry-message',acknowledged:true,verifiedReceived:true};}
}

test('approved application crosses real connector boundary only after authorization and records verified provider receipt',async()=>{
  const persistence=new MemoryPersistence();
  const runtime=await HiredRuntime.create(testCandidate(),testEvidence(),persistence);
  const connector=new ReceiptConnector();runtime.registerConnector(connector);
  const opportunity=runtime.engine.ingest(testJobs()[0]);
  const approval=runtime.engine.requestApplication(opportunity.id);
  await assert.rejects(()=>runtime.dispatchApproved(approval.id,connector.id,'submit-application'),/explicit approval/);
  runtime.engine.governor.approve(approval.id);
  const operation=await runtime.dispatchApproved(approval.id,connector.id,'submit-application');
  assert.equal(operation.state,'verified-received');
  assert.equal(runtime.engine.governor.deliveryState(approval.id),'verified-received');
  assert.equal(runtime.engine.store.opportunities.get(opportunity.id)?.state,'APPLIED');
  assert.equal(connector.calls.length,1);
  assert.equal(connector.calls[0].idempotencyKey,`approval:${approval.id}:${connector.id}:submit-application`);
  assert.ok(runtime.engine.careerState.events.verifyChain().valid);
});

test('connector operation and receipt truth survive checkpoint and restart without persisting provider secrets',async()=>{
  const persistence=new MemoryPersistence();
  const runtime=await HiredRuntime.create(testCandidate(),testEvidence(),persistence);
  const connector=new ReceiptConnector();runtime.registerConnector(connector);
  const opportunity=runtime.engine.ingest(testJobs()[0]);
  const approval=runtime.engine.requestOutreach(opportunity.id);runtime.engine.governor.approve(approval.id);
  const operation=await runtime.dispatchApproved(approval.id,connector.id,'send-outreach');
  await runtime.checkpoint();

  const restored=await HiredRuntime.create(testCandidate(),[],persistence);
  assert.equal(restored.connectors.get(operation.id).state,'verified-received');
  assert.equal(restored.engine.governor.deliveryState(approval.id),'verified-received');
  assert.equal(restored.engine.store.opportunities.get(opportunity.id)?.state,'CONTACTED');
  assert.deepEqual(restored.connectors.available(),[]);
  restored.registerConnector(new ReceiptConnector());
  assert.equal(restored.connectors.integrity().uniqueIdempotencyKeys,true);
});

test('connector fabric retries transient provider failures and preserves one logical operation',async()=>{
  const connector=new RetryConnector();const fabric=new ConnectorFabric('candidate-1');fabric.register(connector);
  const payload={message:'hello'};
  const prepared=fabric.prepare({connectorId:connector.id,capability:'send-outreach',payload,idempotencyKey:'stable-key',maxAttempts:3});
  const first=await fabric.dispatch(prepared.id,payload,new Date('2026-08-28T12:00:00.000Z'));
  assert.equal(first.state,'retrying');assert.equal(first.attempts,1);
  const second=await fabric.dispatch(prepared.id,payload,new Date('2026-08-28T12:00:02.000Z'));
  assert.equal(second.state,'retrying');assert.equal(second.attempts,2);
  const third=await fabric.dispatch(prepared.id,payload,new Date('2026-08-28T12:00:04.000Z'));
  assert.equal(third.state,'verified-received');assert.equal(third.attempts,3);
  assert.equal(fabric.prepare({connectorId:connector.id,capability:'send-outreach',payload,idempotencyKey:'stable-key'}).id,prepared.id);
});

test('connector fabric dead-letters exhausted work and refuses payload/idempotency corruption',async()=>{
  const failing:CareerConnector={id:'fail',provider:'down.example',capabilities:['send-outreach'],async dispatch(){throw new ConnectorRetryableError('still down',1000);}};
  const fabric=new ConnectorFabric('candidate-1');fabric.register(failing);const payload={message:'one'};
  const operation=fabric.prepare({connectorId:'fail',capability:'send-outreach',payload,idempotencyKey:'one-operation',maxAttempts:2});
  await fabric.dispatch(operation.id,payload,new Date('2026-08-28T12:00:00.000Z'));
  const dead=await fabric.dispatch(operation.id,payload,new Date('2026-08-28T12:00:02.000Z'));
  assert.equal(dead.state,'dead-letter');assert.equal(fabric.deadLetters().length,1);
  await assert.rejects(()=>fabric.dispatch(operation.id,{message:'changed'},new Date('2026-08-28T12:00:04.000Z')),/payload hash mismatch/);
  assert.throws(()=>fabric.prepare({connectorId:'fail',capability:'send-outreach',payload:{message:'changed'},idempotencyKey:'one-operation'}),/idempotency conflict/);
});
