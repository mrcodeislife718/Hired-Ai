# Hired AI commercial launch runbook

Hired AI is commercially launchable when the product is deployed, payment collection is configured, customer-facing policies are published, and the qualification suite passes in the deployed configuration.

## Product sold

**Hired AI** is the Career Operating System. **Maya** is the customer-facing AI Career Agent.

The first paid offer is intentionally simple and paid-only:

| Plan | Price | Positioning |
| --- | ---: | --- |
| Career | $19/month | Career intelligence, selective job matching, resume modernization, professional-presence guidance, interview preparation and development plans |
| Pro | $49/month | Adds relationship intelligence, governed acquisition workflows, follow-up orchestration, outcome learning and offer support |
| Concierge | $149/month | Adds high-touch human-review workflows for high-impact career decisions |

Pricing is a launch hypothesis and must be updated from conversion, retention, support cost and outcome evidence.

## Revenue activation

Create recurring checkout/payment links with the chosen payment provider and set:

```bash
HIRED_CHECKOUT_CAREER=https://...
HIRED_CHECKOUT_PRO=https://...
HIRED_CHECKOUT_CONCIERGE=https://...
```

The application exposes `/api/plans` and `/api/checkout` and will only claim a plan has checkout enabled when its URL is configured.

For the first paid cohort, external payment pages are acceptable because they let Hired AI collect revenue without putting payment-card data inside the application. Before scaling beyond an early cohort, add verified subscription webhooks, durable entitlement state, cancellation handling, invoices/receipts, dunning, tax handling, and account-level access enforcement.

## Deployment configuration

Minimum recommended production environment:

```bash
PORT=3000
DATABASE_URL=postgres://...
HIRED_API_KEY=<strong-random-secret>
HIRED_DEMO=false
GITHUB_TOKEN=...
GREENHOUSE_BOARDS=...
LEVER_COMPANIES=...
HIRED_CHECKOUT_CAREER=https://...
HIRED_CHECKOUT_PRO=https://...
HIRED_CHECKOUT_CONCIERGE=https://...
```

Only grant connector scopes actually required by the product. Keep secrets out of source control.

## Before accepting the first customer

Run:

```bash
npm ci
npm run check
npm run serve
```

Verify:

- `/health` returns `ok: true`
- Maya loads at `/`
- resume attachment/audit works
- selective opportunity decisions render
- role-readiness gating blocks an unsupported application
- governed application requests require approval
- all configured checkout links open the correct paid plan
- demo data is disabled in production
- database persistence survives restart
- logs do not expose resume contents, API keys or payment secrets
- privacy and terms pages presented to customers match the actual production data flows

## First revenue cohort

Start with a deliberately small cohort so outcome evidence is collected before aggressive growth.

Track at minimum:

- visitor -> paid conversion
- activation: user gives Maya enough evidence to produce a career plan
- qualified opportunities surfaced
- percentage marked pursue / develop-first / skip
- resume modernization completion
- useful new professional relationships
- application-to-screen conversion
- screen-to-interview conversion
- offer conversion
- time-to-interview
- time-to-offer
- user hours saved
- subscription retention
- refund/cancellation reasons

## Commercial claim rule

Hired AI may describe its architecture and capabilities. It must not claim superior hiring outcomes, a guaranteed job, guaranteed interviews, or guaranteed compensation improvement until measured evidence supports the specific claim.

The commercial north star is **better measurable career outcomes with less wasted effort**, not application volume.

## Remaining scale gates

The first paid cohort can launch with configured external recurring checkout links. Broader scale requires:

- account authentication and recovery
- durable per-user tenancy rather than a single local candidate seed
- verified billing webhooks and entitlements
- production-grade encrypted secrets
- user-controlled privacy, export and deletion flows
- durable conversation/career memory per account
- real authorized job-source coverage beyond demo data
- production model/voice provider configuration
- support and incident process
- reviewed privacy policy and terms
- deployment monitoring, backups and restore exercises

Do not label these scale gates complete until they are implemented and verified in the actual production environment.
