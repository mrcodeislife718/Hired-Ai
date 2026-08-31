# Hired AI / Maya — Production Qualification Gate

This document is an evidence checklist, not a declaration that production is ready.

## Release invariant

No release is called production-qualified until the exact commit being deployed has evidence for code qualification, durable-state recovery, billing, external execution, observability, security, and customer-facing operations.

The commercial objective is **verified hiring conversations and career outcomes**, not application volume.

## Gate A — repository qualification

Required evidence:

- `npm ci` succeeds on the exact release commit.
- `npm run check` succeeds on Node 22 and Node 24.
- production-integrity gate succeeds.
- no unresolved required review comments.
- release commit is reachable from the protected canonical branch.
- migration manifest is ordered, checksum-stable, and contains every production table.

Current automation can prove this gate. It cannot prove external infrastructure.

## Gate B — PostgreSQL and recovery

Required evidence in the deployment environment:

1. Start against an empty production-equivalent database and verify all schema migrations apply.
2. Create two accounts and prove tenant isolation after restart.
3. Create employer organization/member/job/consent/fairness state and prove it survives restart.
4. Run concurrent employer mutations from at least two processes and verify no acknowledged write is lost.
5. Dispatch a governed connector operation, interrupt the process after journaling, restart, and verify the outbox/connector state remains recoverable and idempotent.
6. Take a managed database backup/snapshot.
7. Restore it into a clean recovery database.
8. Compare row counts plus application-level snapshots and replay/integrity checks.

Target recovery evidence:

- RPO target for paid production: <= 15 minutes unless the database provider offers stronger continuous recovery.
- RTO target for the first commercial cohort: <= 60 minutes.
- zero acknowledged employer mutations lost in the concurrency test.
- zero duplicate identity-bearing external actions after crash/retry tests.

## Gate C — Stripe test-mode round trip

Use Stripe test mode before any live charge.

Required sequence:

`new account → checkout session → successful test payment → signed webhook → active entitlement → billing portal → cancellation/update webhook → entitlement transition`

Verify:

- webhook signature validation rejects tampered/stale events;
- duplicate Stripe event IDs are idempotent;
- failed webhook processing releases the event claim for retry;
- plan metadata binds to the intended Hired AI account;
- canceled/past-due state removes paid entitlement correctly;
- no card data is stored by Hired AI.

Do not substitute unit tests for this round trip.

## Gate D — real discovery source

Configure at least one authorized production-equivalent source using Greenhouse, Lever, or an approved JSON feed.

Verify:

- live jobs are fetched;
- source failures are isolated;
- duplicate/syndicated jobs normalize to one canonical opportunity;
- stale roles are not presented as fresh truth;
- source provenance remains attached to the opportunity;
- rate limits and provider terms are respected.

## Gate E — real governed external action

Configure at least one `HIRED_CONNECTORS_JSON` adapter backed by an authorized provider endpoint.

Required sequence:

`user evidence → opportunity → application/outreach request → explicit approval → outbox journal → connector dispatch → provider acknowledgement → verified receipt → checkpoint/restart → same receipt state`

Verify:

- no dispatch before explicit approval;
- one idempotency key produces one logical external action across retries/restarts;
- provider timeout/429/5xx enters bounded retry;
- exhausted work dead-letters rather than looping forever;
- payload changes under the same idempotency key fail closed;
- the product never labels provider acknowledgement as verified receipt unless verification occurred.

## Gate F — observability

Configure `HIRED_TELEMETRY_ENDPOINT` to a production collector/bridge.

Verify telemetry is received for:

- HTTP/service errors;
- persistence/checkpoint latency and failure;
- outbox pending/dead-letter counts;
- connector retry/dead-letter state;
- billing webhook failures;
- deployment health.

Security verification:

- resume content, message bodies, email, phone, auth tokens, cookies, provider bearer tokens, secrets, and raw payloads are redacted;
- telemetry outage does not take down candidate workflows;
- alert on sustained 5xx, billing failures, outbox dead letters, and failed health checks.

## Gate G — deployment

Required evidence:

- production/preview build succeeds on the chosen hosting target;
- `/health` returns `ok:true` from the deployed URL;
- HTTPS and secure cookies are active;
- `APP_URL` exactly matches the deployed origin;
- PostgreSQL is reachable from all runtime instances;
- graceful shutdown/checkpoint behavior is exercised where the platform supports it;
- scaling does not create inconsistent employer state or bypass distributed request budgets.

A repository `vercel.json` by itself is not deployment evidence.

## Gate H — security and privacy

Before the first external cohort:

- verify origin/CSRF controls under hostile requests;
- run account/tenant authorization tests against every object-ID endpoint;
- rotate and scope deployment secrets;
- verify user export/delete behavior against database, career state, conversations, and connector records;
- define data retention for audit/delivery records that cannot simply disappear without breaking evidence integrity;
- review customer privacy policy and terms against actual data flows;
- define security incident owner and response procedure.

## Gate I — first-cohort commercial evidence

For the controlled first cohort measure:

- activation rate;
- qualified opportunities surfaced;
- decision-maker/human-access routes identified;
- application bottlenecks detected;
- recruiter/hiring-manager response rate by route;
- screen/interview/offer conversion by route;
- time to first human hiring conversation;
- candidate effort saved;
- paid conversion, retention, refunds/cancellations;
- provider and model cost per active customer;
- support burden;
- outcome quality and user regret.

Do not optimize application count as a north-star metric.

## Release decision

A commit may be **repository-qualified** when CI is green. It is **production-qualified** only when Gates B–H have captured environment-specific evidence. It is **commercially validated** only after Gate I provides real customer/outcome evidence.
