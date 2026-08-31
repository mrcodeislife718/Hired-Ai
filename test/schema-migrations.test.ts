import test from 'node:test';
import assert from 'node:assert/strict';
import { schemaMigrationManifest } from '../src/schema-migrations.js';

test('schema migration manifest is ordered unique and covers production infrastructure',()=>{
  const manifest=schemaMigrationManifest();
  const ids=manifest.map(item=>item.id);
  assert.deepEqual(ids,[...ids].sort());
  assert.equal(new Set(ids).size,ids.length);
  assert.ok(ids.includes('0003_employer_state'));
  assert.ok(ids.includes('0004_outbox'));
  assert.ok(ids.includes('0005_distributed_rate_limits'));
  assert.ok(ids.includes('0006_billing_events'));
  assert.ok(manifest.every(item=>/^[a-f0-9]{64}$/.test(item.checksum)));
});
