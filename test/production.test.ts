import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AccountStore } from '../src/accounts.js';
import { ConversationStore } from '../src/conversations.js';
import { clearSessionCookie, parseCookies, sessionCookie } from '../src/http-security.js';
import { SlidingWindowLimiter } from '../src/rate-limit.js';

test('rate limiter rejects requests beyond the configured window', () => {
  const limiter = new SlidingWindowLimiter(2, 1000);
  assert.equal(limiter.consume('user', 1000).allowed, true);
  assert.equal(limiter.consume('user', 1001).allowed, true);
  assert.equal(limiter.consume('user', 1002).allowed, false);
  assert.equal(limiter.consume('user', 2001).allowed, true);
});

test('session cookies are HttpOnly and SameSite protected', () => {
  const cookie = sessionCookie('abc', new Date(Date.now() + 60_000).toISOString());
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.equal(parseCookies('a=1; hired_session=hello%20world').hired_session, 'hello world');
  assert.match(clearSessionCookie(), /Max-Age=0/);
});

test('local account sessions remain isolated between users', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'hired-accounts-'));
  try {
    const store = new AccountStore(join(dir, 'accounts.json'), undefined);
    const one = await store.register('one@example.com', 'password-one-123');
    const two = await store.register('two@example.com', 'password-two-123');
    const oneSession = await store.createSession(one.id);
    const twoSession = await store.createSession(two.id);
    assert.equal((await store.accountForToken(oneSession.token))?.id, one.id);
    assert.equal((await store.accountForToken(twoSession.token))?.id, two.id);
    assert.notEqual(oneSession.token, twoSession.token);
    await store.logout(oneSession.token);
    assert.equal(await store.accountForToken(oneSession.token), undefined);
    assert.equal((await store.accountForToken(twoSession.token))?.id, two.id);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('Maya conversation history is tenant isolated', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'hired-conversations-'));
  try {
    const conversations = new ConversationStore(join(dir, 'conversations.json'), undefined);
    await conversations.append('a', 'user', 'alpha');
    await conversations.append('b', 'user', 'beta');
    await conversations.append('a', 'assistant', 'answer');
    assert.deepEqual((await conversations.recent('a')).map(message => message.content), ['alpha', 'answer']);
    assert.deepEqual((await conversations.recent('b')).map(message => message.content), ['beta']);
    await conversations.clear('a');
    assert.equal((await conversations.recent('a')).length, 0);
    assert.equal((await conversations.recent('b')).length, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
