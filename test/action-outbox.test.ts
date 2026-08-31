import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryActionOutbox } from '../src/action-outbox.js';

test('action outbox is idempotent and enforces exclusive leases',async()=>{
  const outbox=new MemoryActionOutbox();
  const first=await outbox.enqueue({aggregateType:'approval',aggregateId:'a1',action:'connector:send-outreach',idempotencyKey:'stable',payload:{hello:'world'}});
  const duplicate=await outbox.enqueue({aggregateType:'approval',aggregateId:'a1',action:'connector:send-outreach',idempotencyKey:'stable',payload:{hello:'world'}});
  assert.equal(duplicate.id,first.id);
  const leased=await outbox.claimById(first.id,'worker-1',30_000,new Date('2026-08-31T12:00:00Z'));
  assert.equal(leased.state,'leased');
  await assert.rejects(()=>outbox.claimById(first.id,'worker-2',30_000,new Date('2026-08-31T12:00:01Z')),/already leased/);
  const delivered=await outbox.delivered(first.id,'worker-1');
  assert.equal(delivered.state,'delivered');
  assert.equal((await outbox.pending()).length,0);
});

test('action outbox retries and dead-letters after bounded attempts',async()=>{
  const outbox=new MemoryActionOutbox();
  const command=await outbox.enqueue({aggregateType:'approval',aggregateId:'a2',action:'connector:send-email',idempotencyKey:'retry',payload:{}});
  const first=await outbox.claimById(command.id,'worker',1000,new Date('2026-08-31T12:00:00Z'));
  assert.equal(first.attempts,1);
  const retry=await outbox.retry(command.id,'worker','temporary',1000,2);
  assert.equal(retry.state,'pending');
  const second=await outbox.claimById(command.id,'worker',1000,new Date(Date.parse(retry.availableAt)+1));
  assert.equal(second.attempts,2);
  const dead=await outbox.retry(command.id,'worker','still down',1000,2);
  assert.equal(dead.state,'dead-letter');
  assert.match(dead.lastError??'',/still down/);
});
