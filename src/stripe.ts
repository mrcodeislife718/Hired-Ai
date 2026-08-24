import { createHmac, timingSafeEqual } from 'node:crypto';
import type { AccountRecord, SubscriptionPlan, SubscriptionStatus } from './accounts.js';
import type { PlanId } from './commercial.js';
import { planById } from './commercial.js';

const API = 'https://api.stripe.com/v1';
const env = (key: string) => process.env[key]?.trim() || undefined;

export interface StripeEvent<T = Record<string, unknown>> {
  id: string;
  type: string;
  created: number;
  data: { object: T };
}

export interface StripeCheckoutSession {
  id: string;
  url: string | null;
  customer?: string | null;
  customer_email?: string | null;
  metadata?: Record<string, string>;
  subscription?: string | null;
}

export interface StripeSubscription {
  id: string;
  customer: string;
  status: string;
  metadata?: Record<string, string>;
}

function secretKey() {
  const key = env('STRIPE_SECRET_KEY');
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  return key;
}

function appUrl() {
  const value = env('APP_URL');
  if (!value) throw new Error('APP_URL is not configured');
  return value.replace(/\/$/, '');
}

async function stripeRequest<T>(path: string, values: URLSearchParams): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${secretKey()}`,
      'content-type': 'application/x-www-form-urlencoded',
      'user-agent': 'Hired-AI/1.0'
    },
    body: values
  });
  const payload = await response.json() as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(payload.error?.message ?? `Stripe request failed with ${response.status}`);
  return payload;
}

export async function createCheckoutSession(account: AccountRecord, planId: PlanId): Promise<StripeCheckoutSession> {
  const plan = planById(planId);
  if (!plan?.stripePriceId) throw new Error(`Stripe price is not configured for ${planId}`);
  const values = new URLSearchParams({
    mode: 'subscription',
    'line_items[0][price]': plan.stripePriceId,
    'line_items[0][quantity]': '1',
    customer_email: account.email,
    client_reference_id: account.id,
    'metadata[account_id]': account.id,
    'metadata[plan]': planId,
    'subscription_data[metadata][account_id]': account.id,
    'subscription_data[metadata][plan]': planId,
    success_url: `${appUrl()}/?billing=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl()}/?billing=canceled`,
    allow_promotion_codes: 'true'
  });
  return stripeRequest<StripeCheckoutSession>('/checkout/sessions', values);
}

export async function createBillingPortal(customerId: string): Promise<{ id: string; url: string }> {
  if (!customerId) throw new Error('Stripe customer is not linked to this account');
  return stripeRequest('/billing_portal/sessions', new URLSearchParams({ customer: customerId, return_url: appUrl() }));
}

export function verifyStripeSignature(rawBody: string, signatureHeader: string | undefined, now = Math.floor(Date.now() / 1000)) {
  const secret = env('STRIPE_WEBHOOK_SECRET');
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  if (!signatureHeader) throw new Error('missing Stripe-Signature header');
  const parts = signatureHeader.split(',').map(part => part.trim());
  const timestamp = parts.find(part => part.startsWith('t='))?.slice(2);
  const signatures = parts.filter(part => part.startsWith('v1=')).map(part => part.slice(3));
  if (!timestamp || !signatures.length) throw new Error('invalid Stripe signature header');
  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber) || Math.abs(now - timestampNumber) > 300) throw new Error('stale Stripe webhook signature');
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  const valid = signatures.some(signature => {
    try {
      const actual = Buffer.from(signature, 'hex');
      return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
    } catch { return false; }
  });
  if (!valid) throw new Error('invalid Stripe webhook signature');
  return true;
}

export function parseStripeEvent(rawBody: string, signatureHeader: string | undefined): StripeEvent {
  verifyStripeSignature(rawBody, signatureHeader);
  return JSON.parse(rawBody) as StripeEvent;
}

export function subscriptionState(status: string): SubscriptionStatus {
  if (status === 'active' || status === 'trialing') return 'active';
  if (status === 'past_due' || status === 'unpaid' || status === 'incomplete') return 'past_due';
  if (status === 'canceled' || status === 'incomplete_expired') return 'canceled';
  return 'inactive';
}

export function planFromMetadata(metadata: Record<string, string> | undefined): SubscriptionPlan {
  const plan = metadata?.plan;
  return plan === 'career' || plan === 'pro' || plan === 'concierge' ? plan : 'none';
}

export function accountIdFromMetadata(metadata: Record<string, string> | undefined) {
  return metadata?.account_id?.trim() || undefined;
}
