import test from 'node:test';
import assert from 'node:assert/strict';
import { RecoverableIntegration } from '../src/recoverable-integration.js';

test('repairs structured validation failures and retries with same idempotency boundary', async () => {
  let calls = 0;
  const integration = new RecoverableIntegration<{ email?: string }, { submitted: boolean }>('ats', async (input, context) => {
    calls += 1;
    if (!input.email) return { ok: false, error: { class: 'validation', message: 'email required', retryable: true, correctedInput: { email: 'user@example.com' }, sideEffectsKnown: true, idempotencyKey: context.idempotencyKey } };
    return { ok: true, value: { submitted: true }, externalReference: 'ats:1' };
  });
  const result = await integration.execute({}, { idempotencyKey: 'apply-1' });
  assert.equal(result.ok, true);
  assert.equal(result.attempts, 2);
  assert.equal(calls, 2);
});
