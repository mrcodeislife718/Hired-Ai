import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('commercial API does not allow clients to author provider receipt truth directly',async()=>{
  const source=await readFile('src/commercial-server-v2.ts','utf8');
  assert.match(source,/direct delivery-state mutation is disabled/);
  assert.doesNotMatch(source,/engine\.governor\.providerAcknowledged\(providerAck/);
  assert.doesNotMatch(source,/engine\.governor\.verifyReceived\(verifiedReceipt/);
  assert.doesNotMatch(source,/engine\.governor\.executeApproved\(execute/);
});
