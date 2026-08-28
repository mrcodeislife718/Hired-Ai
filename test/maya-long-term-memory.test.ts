import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { MayaLongTermMemoryStore, extractExplicitLongTermMemories } from '../src/maya-long-term-memory.js';

test('extracts only explicit durable career memories from user language', () => {
  const memories=extractExplicitLongTermMemories('My goal is to move into healthcare administration. I prefer direct answers. I plan to finish my certification this quarter.');
  assert.ok(memories.some(item=>item.kind==='goal'&&/healthcare administration/i.test(item.text)));
  assert.ok(memories.some(item=>item.kind==='preference'&&/direct answers/i.test(item.text)));
  assert.ok(memories.some(item=>item.kind==='strategy'&&/certification/i.test(item.text)));
  assert.equal(memories.some(item=>/medical|religion|politic|diagnos/i.test(item.text)),false);
});

test('durable memory survives store restart and retrieves relevant context', async () => {
  const dir=await mkdtemp(join(tmpdir(),'maya-memory-'));
  const path=join(dir,'memory.json');
  try {
    const first=new MayaLongTermMemoryStore(path,undefined);
    await first.observeUserMessage('acct-1','My goal is to become an operations manager. I prefer concise answers.');
    await first.close();

    const second=new MayaLongTermMemoryStore(path,undefined);
    const context=await second.retrieve('acct-1','What should I do next to become a manager?',5);
    assert.ok(context.memories.some(item=>item.kind==='goal'&&/operations manager/i.test(item.text)));
    assert.ok(context.memories.some(item=>item.kind==='preference'&&/concise/i.test(item.text)));
    assert.equal(context.policy.conversationalMemoryIsNotCareerEvidence,true);
    assert.equal(context.policy.noSensitiveInference,true);
    await second.close();
  } finally { await rm(dir,{recursive:true,force:true}); }
});

test('user can explicitly forget long-term relationship context', async () => {
  const dir=await mkdtemp(join(tmpdir(),'maya-memory-forget-'));
  const path=join(dir,'memory.json');
  try {
    const store=new MayaLongTermMemoryStore(path,undefined);
    await store.observeUserMessage('acct-2','My goal is to become a project manager.');
    assert.equal((await store.list('acct-2')).length,1);
    await store.observeUserMessage('acct-2','Forget project manager.');
    assert.equal((await store.list('acct-2')).length,0);
    await store.close();
  } finally { await rm(dir,{recursive:true,force:true}); }
});

test('memory deduplicates repeated explicit durable statements instead of growing a transcript archive', async () => {
  const dir=await mkdtemp(join(tmpdir(),'maya-memory-dedupe-'));
  const path=join(dir,'memory.json');
  try {
    const store=new MayaLongTermMemoryStore(path,undefined);
    await store.observeUserMessage('acct-3','I prefer direct answers.');
    await store.observeUserMessage('acct-3','I prefer direct answers.');
    const active=await store.list('acct-3');
    assert.equal(active.filter(item=>item.kind==='preference').length,1);
    await store.close();
  } finally { await rm(dir,{recursive:true,force:true}); }
});
