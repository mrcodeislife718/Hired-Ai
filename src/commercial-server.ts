import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AccountRecord } from './accounts.js';
import { BillingEventLedger } from './billing-ledger.js';
import { CommercialPlatform } from './commercial-platform.js';
import { checkoutReady, commercialPlans, hasPlan, planById, type PlanId } from './commercial.js';
import { baseSecurityHeaders, clearSessionCookie, enforceOrigin, sessionCookie, sessionToken } from './http-security.js';
import { MayaService, type MayaRequest } from './maya-service.js';
import { SlidingWindowLimiter } from './rate-limit.js';
import {
  accountIdFromMetadata,
  createBillingPortal,
  createCheckoutSession,
  parseStripeEvent,
  planFromMetadata,
  subscriptionState,
  type StripeCheckoutSession,
  type StripeSubscription
} from './stripe.js';
import { renderMayaPage } from './web-ui.js';
import type { FeedbackEvent, PipelineState, RawJob } from './domain.js';

const platform = new CommercialPlatform();
const maya = new MayaService();
const billingLedger = new BillingEventLedger();
const authLimiter = new SlidingWindowLimiter(Number(process.env.HIRED_AUTH_RATE_LIMIT ?? 12), 15 * 60_000);
const apiLimiter = new SlidingWindowLimiter(Number(process.env.HIRED_API_RATE_LIMIT ?? 180), 60_000);

function sendJson(res: ServerResponse, status: number, payload: unknown, extra: Record<string, string> = {}) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...baseSecurityHeaders, ...extra });
  res.end(JSON.stringify(payload));
}

function sendHtml(res: ServerResponse, body: string) {
  res.writeHead(200, {
    'content-type': 'text/html; charset=utf-8',
    ...baseSecurityHeaders,
    'content-security-policy': "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self' https://checkout.stripe.com"
  });
  res.end(body);
}

async function readRaw(req: IncomingMessage, maxBytes = 1_000_000) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const value = Buffer.from(chunk);
    size += value.length;
    if (size > maxBytes) throw new Error('request too large');
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function readJson<T = Record<string, unknown>>(req: IncomingMessage): Promise<T> {
  const raw = await readRaw(req);
  if (!raw) return {} as T;
  try { return JSON.parse(raw) as T; }
  catch { throw new Error('invalid JSON'); }
}

function clientKey(req: IncomingMessage) {
  const forwarded = String(req.headers['x-forwarded-for'] ?? '').split(',')[0]?.trim();
  return forwarded || req.socket.remoteAddress || 'unknown';
}

function consume(limiter: SlidingWindowLimiter, key: string, res: ServerResponse) {
  const result = limiter.consume(key);
  if (result.allowed) return true;
  sendJson(res, 429, { error: 'too many requests', retryAt: new Date(result.resetAt).toISOString() }, {
    'retry-after': String(Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000)))
  });
  return false;
}

async function requireAccount(req: IncomingMessage, res: ServerResponse) {
  const token = sessionToken(req);
  const account = await platform.accounts.accountForToken(token);
  if (!account) {
    sendJson(res, 401, { error: 'sign in required' });
    return undefined;
  }
  if (!consume(apiLimiter, account.id, res)) return undefined;
  return { account, token };
}

function requireActivePlan(account: AccountRecord, res: ServerResponse, minimum: PlanId = 'career') {
  if (account.subscription.status === 'active' && hasPlan(account.subscription.plan, minimum)) return true;
  sendJson(res, 402, { error: 'active subscription required', requiredPlan: minimum, subscription: account.subscription });
  return false;
}

function accountCookieHeaders(token: string, expiresAt: string) {
  return { 'set-cookie': sessionCookie(token, expiresAt) };
}

async function handleStripeWebhook(req: IncomingMessage, res: ServerResponse) {
  const raw = await readRaw(req, 2_000_000);
  const event = parseStripeEvent(raw, req.headers['stripe-signature'] as string | undefined);
  const claimed = await billingLedger.claim(event.id);
  if (!claimed) return sendJson(res, 200, { received: true, duplicate: true });
  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as unknown as StripeCheckoutSession;
      const accountId = accountIdFromMetadata(session.metadata);
      const plan = planFromMetadata(session.metadata);
      if (accountId && plan !== 'none') {
        await platform.accounts.setSubscription(accountId, plan, 'active', session.customer ?? undefined);
      }
    }
    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as unknown as StripeSubscription;
      const accountId = accountIdFromMetadata(subscription.metadata);
      const plan = planFromMetadata(subscription.metadata);
      if (accountId) await platform.accounts.setSubscription(accountId, plan, subscriptionState(subscription.status), subscription.customer);
    }
    return sendJson(res, 200, { received: true });
  } catch (error) {
    await billingLedger.release(event.id);
    throw error;
  }
}

async function route(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  try {
    if (req.method === 'GET' && url.pathname === '/') return sendHtml(res, renderMayaPage());
    if (req.method === 'GET' && url.pathname === '/health') {
      return sendJson(res, 200, {
        ok: true,
        product: 'Hired AI',
        agent: 'Maya',
        persistence: process.env.DATABASE_URL ? 'postgres' : 'file',
        billing: checkoutReady(),
        languageModelConfigured: Boolean(process.env.OPENAI_API_KEY)
      });
    }
    if (req.method === 'GET' && url.pathname === '/api/plans') {
      return sendJson(res, 200, {
        plans: commercialPlans().map(({ stripePriceId, ...plan }) => ({ ...plan, checkoutConfigured: Boolean(stripePriceId) })),
        billing: checkoutReady()
      });
    }
    if (req.method === 'POST' && url.pathname === '/api/stripe/webhook') return handleStripeWebhook(req, res);

    if (req.method && !['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !enforceOrigin(req, res)) return;

    if (req.method === 'POST' && (url.pathname === '/api/auth/register' || url.pathname === '/api/auth/login')) {
      if (!consume(authLimiter, clientKey(req), res)) return;
      const body = await readJson<{ email?: string; password?: string }>(req);
      const email = String(body.email ?? '');
      const password = String(body.password ?? '');
      if (url.pathname.endsWith('/register')) {
        const account = await platform.accounts.register(email, password);
        const session = await platform.accounts.createSession(account.id);
        return sendJson(res, 201, { account: platform.accounts.publicAccount(account), expiresAt: session.expiresAt }, accountCookieHeaders(session.token, session.expiresAt));
      }
      const session = await platform.accounts.login(email, password);
      const account = await platform.accounts.accountForToken(session.token);
      return sendJson(res, 200, { account: account ? platform.accounts.publicAccount(account) : undefined, expiresAt: session.expiresAt }, accountCookieHeaders(session.token, session.expiresAt));
    }

    const auth = await requireAccount(req, res);
    if (!auth) return;
    const { account, token } = auth;

    if (req.method === 'POST' && url.pathname === '/api/auth/logout') {
      await platform.accounts.logout(token);
      return sendJson(res, 200, { ok: true }, { 'set-cookie': clearSessionCookie() });
    }
    if (req.method === 'POST' && url.pathname === '/api/auth/password') {
      const body = await readJson<{ currentPassword?: string; newPassword?: string }>(req);
      await platform.accounts.changePassword(account.id, String(body.currentPassword ?? ''), String(body.newPassword ?? ''));
      return sendJson(res, 200, { ok: true, signInAgain: true }, { 'set-cookie': clearSessionCookie() });
    }
    if (req.method === 'GET' && url.pathname === '/api/me') return sendJson(res, 200, platform.accounts.publicAccount(account));
    if (req.method === 'PATCH' && url.pathname === '/api/me/profile') {
      const updated = await platform.accounts.updateProfile(account.id, await readJson(req));
      await platform.refreshRuntime(updated);
      return sendJson(res, 200, platform.accounts.publicAccount(updated));
    }
    if (req.method === 'GET' && url.pathname === '/api/me/export') {
      const exported = await platform.exportAccount(account);
      const messages = await maya.history(account.id, 100);
      return sendJson(res, 200, { ...exported, conversations: messages });
    }
    if (req.method === 'DELETE' && url.pathname === '/api/me') {
      if (account.subscription.status === 'active') return sendJson(res, 409, { error: 'cancel the active Stripe subscription from billing before deleting the account' });
      await maya.clearHistory(account.id);
      await platform.purgeAccount(account);
      return sendJson(res, 200, { deleted: true }, { 'set-cookie': clearSessionCookie() });
    }

    if (req.method === 'POST' && url.pathname === '/api/billing/checkout') {
      const body = await readJson<{ plan?: string }>(req);
      const plan = planById(String(body.plan ?? ''));
      if (!plan) return sendJson(res, 400, { error: 'invalid plan' });
      const session = await createCheckoutSession(account, plan.id);
      if (!session.url) throw new Error('Stripe did not return a checkout URL');
      return sendJson(res, 201, { id: session.id, url: session.url });
    }
    if (req.method === 'POST' && url.pathname === '/api/billing/portal') {
      if (!account.subscription.customerRef) return sendJson(res, 409, { error: 'Stripe customer is not linked yet' });
      return sendJson(res, 201, await createBillingPortal(account.subscription.customerRef));
    }

    if (!requireActivePlan(account, res, 'career')) return;
    const runtime = await platform.runtimeFor(account);
    const engine = runtime.engine;

    if (req.method === 'POST' && url.pathname === '/api/maya/chat') {
      return sendJson(res, 200, await maya.respond(account.id, engine, await readJson<MayaRequest>(req)));
    }
    if (req.method === 'GET' && url.pathname === '/api/maya/history') {
      const limit = Number(url.searchParams.get('limit') ?? 40);
      return sendJson(res, 200, { messages: await maya.history(account.id, Number.isFinite(limit) ? limit : 40) });
    }
    if (req.method === 'DELETE' && url.pathname === '/api/maya/history') {
      await maya.clearHistory(account.id);
      return sendJson(res, 200, { cleared: true });
    }
    if (req.method === 'GET' && url.pathname === '/api/career/status') return sendJson(res, 200, engine.careerStatus());
    if (req.method === 'GET' && url.pathname === '/api/opportunities') return sendJson(res, 200, engine.selectiveOpportunities(60));
    if (req.method === 'POST' && url.pathname === '/api/discover') return sendJson(res, 200, await platform.discoverFor(account));
    if (req.method === 'POST' && url.pathname === '/api/github/index') {
      const body = await readJson<{ owner?: string; token?: string }>(req);
      const owner = String(body.owner ?? '').trim();
      if (!owner) return sendJson(res, 400, { error: 'GitHub owner required' });
      const githubToken = typeof body.token === 'string' && body.token.trim() ? body.token.trim() : undefined;
      const result = await platform.indexGitHubFor(account, owner, githubToken);
      return sendJson(res, 200, result);
    }
    if (req.method === 'POST' && url.pathname === '/api/opportunities') {
      const result = engine.ingest(await readJson<RawJob>(req));
      await runtime.checkpoint();
      return sendJson(res, 201, result);
    }

    const packageMatch = url.pathname.match(/^\/api\/opportunities\/([^/]+)\/package$/);
    if (req.method === 'GET' && packageMatch) return sendJson(res, 200, engine.package(packageMatch[1]));

    const application = url.pathname.match(/^\/api\/opportunities\/([^/]+)\/application-request$/);
    if (req.method === 'POST' && application) {
      if (!requireActivePlan(account, res, 'pro')) return;
      const result = engine.requestApplication(application[1]);
      await runtime.checkpoint();
      return sendJson(res, 201, result);
    }
    const outreach = url.pathname.match(/^\/api\/opportunities\/([^/]+)\/outreach-request$/);
    if (req.method === 'POST' && outreach) {
      if (!requireActivePlan(account, res, 'pro')) return;
      const result = engine.requestOutreach(outreach[1]);
      await runtime.checkpoint();
      return sendJson(res, 201, result);
    }
    const transition = url.pathname.match(/^\/api\/opportunities\/([^/]+)\/transition$/);
    if (req.method === 'POST' && transition) {
      const body = await readJson<{ state: PipelineState }>(req);
      const result = engine.governor.transition(transition[1], body.state);
      await runtime.checkpoint();
      return sendJson(res, 200, result);
    }
    const feedback = url.pathname.match(/^\/api\/opportunities\/([^/]+)\/feedback$/);
    if (req.method === 'POST' && feedback) {
      const body = await readJson<Omit<FeedbackEvent, 'opportunityId'>>(req);
      const result = engine.recordFeedback({ ...body, opportunityId: feedback[1] });
      await runtime.checkpoint();
      return sendJson(res, 200, result);
    }
    const approve = url.pathname.match(/^\/api\/approvals\/([^/]+)\/approve$/);
    if (req.method === 'POST' && approve) {
      if (!requireActivePlan(account, res, 'pro')) return;
      const result = engine.governor.approve(approve[1]);
      await runtime.checkpoint();
      return sendJson(res, 200, result);
    }
    const execute = url.pathname.match(/^\/api\/approvals\/([^/]+)\/execute$/);
    if (req.method === 'POST' && execute) {
      if (!requireActivePlan(account, res, 'pro')) return;
      const payload = engine.governor.executeApproved(execute[1]);
      await runtime.checkpoint();
      return sendJson(res, 200, { payload, note: 'authorized payload released to the external connector boundary; no external send is claimed by this endpoint' });
    }

    return sendJson(res, 404, { error: 'not found' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = /credentials|sign in|required authentication/i.test(message) ? 401 : /not found/i.test(message) ? 404 : /too large/i.test(message) ? 413 : 400;
    return sendJson(res, status, { error: message });
  }
}

const port = Number(process.env.PORT ?? 3000);
const server = createServer((req, res) => { void route(req, res); });
server.listen(port, () => console.log(`Hired AI / Maya listening on http://localhost:${port}`));
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => void Promise.all([platform.close(), maya.close(), billingLedger.close()]).finally(() => server.close(() => process.exit(0))));
}
