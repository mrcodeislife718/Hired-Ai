import assert from 'node:assert/strict';
import test from 'node:test';
import { authorizeApiKey } from '../src/auth.js';

test('legacy API key fails closed in production when not configured',()=>{
  assert.equal(authorizeApiKey(undefined,undefined,'production'),false);
  assert.equal(authorizeApiKey('Bearer anything',undefined,'production'),false);
});

test('legacy API key may remain disabled in local/test without blocking session-auth product',()=>{
  assert.equal(authorizeApiKey(undefined,undefined,'test'),true);
});

test('configured API key requires exact bearer secret',()=>{
  assert.equal(authorizeApiKey(undefined,'secret','production'),false);
  assert.equal(authorizeApiKey('Bearer wrong','secret','production'),false);
  assert.equal(authorizeApiKey('Bearer secret','secret','production'),true);
});
