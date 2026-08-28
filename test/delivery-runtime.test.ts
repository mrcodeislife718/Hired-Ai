import test from 'node:test';
import assert from 'node:assert/strict';
import { HiredRuntime } from '../src/runtime.js';
import type { PersistenceAdapter, StoreSnapshot } from '../src/persistence.js';
import { testCandidate, testEvidence, testJobs } from './test-records.js';

class MemoryPersistence implements PersistenceAdapter {
  snapshot?: StoreSnapshot;
  async load() { return this.snapshot ? structuredClone(this.snapshot) : undefined; }
  async save(snapshot: StoreSnapshot) { this.snapshot=structuredClone(snapshot); }
}

test('verified application delivery survives checkpoint and runtime restore',async()=>{
  const persistence=new MemoryPersistence();
  const runtime=await HiredRuntime.create(testCandidate(),testEvidence(),persistence);
  const opportunity=runtime.engine.ingest(testJobs()[0]);
  const approval=runtime.engine.requestApplication(opportunity.id);
  runtime.engine.governor.approve(approval.id);
  runtime.engine.governor.executeApproved(approval.id);
  runtime.engine.governor.providerAcknowledged(approval.id,'test-provider','provider-message-1');
  runtime.engine.governor.verifyReceived(approval.id,'test-provider','provider-message-1');
  await runtime.checkpoint();

  const restored=await HiredRuntime.create(testCandidate(),[],persistence);
  assert.equal(restored.engine.store.opportunities.get(opportunity.id)?.state,'APPLIED');
  assert.equal(restored.engine.store.approvals.get(approval.id)?.status,'EXECUTED');
  assert.equal(restored.engine.governor.deliveryState(approval.id),'verified-received');
  assert.equal(restored.engine.governor.deliveryHistory(approval.id).length,5);
});
