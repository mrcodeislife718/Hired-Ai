# Hired AI commercial launch runbook

Hired AI is commercially launchable only when the exact release commit is deployed, billing and data infrastructure are live, customer-facing policies match actual data flows, and `docs/PRODUCTION_QUALIFICATION.md` has environment-specific evidence.

## Product sold

**Hired AI** is the Career Operating System. **Maya** is the customer-facing AI Career Agent.

The commercial objective is **verified hiring conversations and better career outcomes with less wasted effort**. Application count is not a north-star metric.

| Plan | Price | Positioning |
| --- | ---: | --- |
| Career | $19/month | Career intelligence, selective opportunity matching, resume modernization, professional-presence guidance, interview preparation and development plans |
| Pro | $49/month | Adds relationship intelligence, governed acquisition routes, human-access workflows, follow-up orchestration, outcome learning and offer support |
| Concierge | $149/month | Adds high-touch human-review workflows for high-impact career decisions |

Pricing remains a launch hypothesis until conversion, retention, support cost and outcome evidence establish otherwise.

## Billing truth

Current code uses Stripe subscription Checkout rather than static payment links. Production configuration requires:

```bash
APP_URL=https://...
STRIPE_SECRET_KEY=sk_test_... # test mode first
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_CAREER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_CONCIERGE=price_...
```

Implemented code includes Checkout Session creation, Billing Portal creation, signed webhook verification, durable webhook-event idempotency, subscription-state mapping, account entitlement storage and plan enforcement.

This implementation is **not evidence of a successful live/test Stripe round trip**. Before charging customers, complete the Stripe test-mode sequence in `PRODUCTION_QUALIFICATION.md`.

## Production environment

Minimum configuration:

```bash
NODE_ENV=production
APP_URL=https://...
PORT=3000
DATABASE_URL=postgres://...

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_CAREER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_CONCIERGE=price_...

# At least one authorized discovery source for acquisition-network qualification
GREENHOUSE_BOARDS=...
# or LEVER_COMPANIES=...
# or JOB_JSON_FEEDS=...

# At least one authorized governed provider adapter for external-action qualification
HIRED_CONNECTORS_JSON=[...]

# Production telemetry collector/bridge
HIRED_TELEMETRY_ENDPOINT=https://...
HIRED_TELEMETRY_TOKEN=...
```

`OPENAI_API_KEY` remains optional because deterministic Maya behavior is designed to function without a model provider. If a language model is enabled, its use does not relax evidence, approval, or truth boundaries.

Run `npm run commercial:check` to validate configuration shape. That command intentionally does not declare production readiness.

## Before accepting the first customer

Repository evidence:

```bash
npm ci
npm run check
npm run commercial:check
```

Environment evidence must additionally verify:

- deployed `/health` returns `ok:true`;
- account signup/login/session isolation works across restart;
- durable employer organization/job/consent state survives restart and concurrent writes;
- Stripe test checkout → webhook → entitlement → portal/cancellation round trip succeeds;
- at least one authorized real job source produces current opportunities with provenance;
- at least one governed connector performs an approved external action and records provider/verified receipt truth;
- outbox crash/retry tests do not duplicate identity-bearing actions;
- production telemetry receives redacted traces/metrics and alerts on failures;
- managed backup and restore drill succeeds;
- privacy/terms reflect the deployed data flows;
- incident/support ownership is established.

## First revenue cohort

Start deliberately small. Measure at minimum:

- visitor → paid conversion;
- activation to enough evidence for a useful career plan;
- qualified opportunities surfaced;
- human-access routes identified;
- application-bottleneck detection frequency;
- response rate by warm introduction / direct hiring-manager / recruiter / formal-application route;
- screen, interview and offer conversion by route;
- time to first real hiring conversation;
- time to offer;
- candidate hours saved;
- subscription retention;
- refunds/cancellations;
- provider/model cost per active customer;
- support burden and incident rate.

## Commercial claim rule

Hired AI may accurately describe implemented and verified architecture. It must not claim guaranteed jobs, guaranteed interviews, guaranteed compensation improvement, or superior hiring outcomes without measured evidence supporting that exact claim.

## Current boundary

Repository qualification and live production qualification are different states. Do not mark external items complete because a unit/integration test passes. Live deployment, Stripe round trips, managed backup/restore, provider traffic, telemetry receipt, customer policies and real outcome evidence remain environment-specific gates until captured.
