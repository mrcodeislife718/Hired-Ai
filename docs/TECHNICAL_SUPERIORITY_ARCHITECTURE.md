# Hired AI / Maya — Technical Superiority Architecture

Status: architecture and evidence gate for `production/closure-superiority`.

## Objective

Hired AI must optimize for **verified career outcomes and hiring conversations**, not application volume. The architecture should preserve the strongest properties already present in Maya—evidence grounding, governed execution, durable career state, outcome learning, two-sided bias resistance, and model independence—while closing production gaps and adding a human-access network capable of moving a qualified candidate to a real decision maker.

Canonical acquisition path:

`opportunity → decision-maker map → evidence fit → relationship/introduction route → candidate preparation → strategic application when useful/required → verified delivery → interview/offer/rejection outcome → learning`

## Competitive evidence

### Jack & Jill
Strongest property: candidate conversation feeds large-scale job discovery and direct introductions to hiring managers. The product deliberately treats the application as optional rather than the center of the funnel.

Preserve/exceed: Hired AI should match the low-friction conversational experience and direct-access objective, then exceed it with explicit evidence provenance, governance, reversible automation, rejection-pattern diagnosis, bias-resistant decision support, and a user-owned long-horizon Career Twin.

Structural weakness to attack: opaque matching/introduction logic can leave users unable to understand why a route was chosen or whether the system learned the right lesson. Hired AI should make acquisition decisions inspectable and outcome-calibrated.

### LinkedIn Hiring Assistant
Strongest properties: massive professional/economic graph, role-qualification synthesis, candidate sourcing, personalized recruiter memory, asynchronous agent execution, recruiter feedback learning, messaging and scheduling.

Preserve/exceed: Hired AI cannot replicate LinkedIn's proprietary graph, so it must win through interoperability: user-authorized sources, ATS/job feeds, employer-direct data, relationship graph federation, evidence quality, and transparent routing across providers.

Structural weakness to attack: platform lock-in. Maya's career state, evidence graph, policy, orchestration and telemetry must remain provider-neutral.

### Indeed
Strongest properties: enormous job distribution, ATS integrations, job/apply synchronization, disposition feedback loops, employer reach.

Preserve/exceed: consume authorized job/ATS sources through stable connectors and close the outcome loop. Hired AI should normalize source-specific records into a canonical Opportunity + HiringProcess model rather than binding logic to one marketplace.

Structural weakness to attack: application-centric throughput can optimize completed applications rather than verified human access. Maya's objective function must use interviews, decision-maker engagement, offer quality, user effort and long-term career value.

### Simplify
Strongest properties: browser-level interoperability with many ATS/application portals, low-friction autofill, application tracking, tailored material generation.

Preserve/exceed: keep a connector/browser-adapter boundary so repetitive forms can be automated when applications are strategically useful. Never make autofill the acquisition strategy.

Structural weakness to attack: browser DOM automation is fragile and application-volume oriented. Prefer provider APIs, employer-direct links, verified introductions and explicit human approval where identity-bearing actions occur.

### Teal / Huntr-class career tooling
Strongest properties: resume tailoring, job tracking, organization, stage-specific guidance.

Preserve/exceed: Maya already has richer longitudinal state. Keep tracker ergonomics but derive them from the Career Event Fabric rather than a separate dashboard-shaped source of truth.

Structural weakness to attack: artifact silos. Resume, outreach, interview stories, evidence, relationship state and outcomes must all compile from one evidence graph so claims cannot drift between surfaces.

### Ashby / Greenhouse-class employer systems
Strongest properties: ATS workflow, sourcing/CRM, scheduling, analytics, configurable processes, APIs and employer system-of-record behavior.

Preserve/exceed: Hired AI's employer side should become durable, auditable and API-first, while keeping structured evidence review and bias-resistant decision tooling as native primitives.

Structural weakness to attack: candidate data and workflow are typically organization-owned and application-centered. Hired AI should support candidate-controlled sharing, evidence minimization and portable career identity.

### Temporal durable-execution pattern
Strongest property: workflows survive process/network failure and can replay/recover across timers, retries and asynchronous activities.

Preserve/exceed: Hired AI should not necessarily adopt Temporal as a hard dependency. Instead, implement a provider-neutral Durable Action Journal with explicit workflow state, idempotent activities, timers, checkpoints and replay semantics. A Temporal adapter can be optional later.

### Transactional outbox / Debezium pattern
Strongest property: prevents database state from diverging from messages dispatched to downstream systems.

Preserve/exceed: consequential Hired AI actions should commit domain state + outbox record atomically, then dispatch asynchronously through Connector Fabric. This closes the dual-write gap between approval state and provider execution.

### OpenTelemetry
Strongest property: vendor-neutral traces, metrics and logs with shared context.

Preserve/exceed: replace in-memory-only tracing with an internal telemetry interface that emits OTel-compatible spans/metrics/logs and can export to multiple backends without product code changes.

## Improved architecture

### 1. Canonical Career Graph
Purpose: one source of truth for user career state, evidence, goals, relationships, opportunities, decisions and outcomes.
Mechanism: versioned entities + append-only Career Event Fabric + materialized current state. Each materialized field points to supporting events/evidence.
Expected advantage: prevents contradictory resumes, outreach and interview narratives; supports replay and historical explanation.
Tradeoff: more schema discipline and migration work.
Failure mode: graph/event drift or incompatible schema evolution.
Measurement: replay equivalence, invariant violations, event-to-view lag.
Benchmark: 100% deterministic replay for qualification fixtures; <250 ms P95 materialized-view update at 1x.
Fallback: rebuild materialized views from event history.
Validation: corruption/replay tests across old snapshots and migrations.
1x/10x/100x: move from single-record snapshots to partitionable event/materialized tables before JSONB snapshots become hot rows.
Success-too-well risk: one user's career graph becomes extremely large; enforce bounded projections and cold-history archival.

### 2. Acquisition Control Plane
Purpose: optimize for human hiring conversations rather than applications.
Mechanism: stage-aware planner chooses among direct introduction, warm referral, recruiter outreach, hiring-manager outreach, employer talent community, strategic application, develop-first or skip.
Expected advantage: avoids repeating a failing application path.
Tradeoff: requires more relationship and employer intelligence.
Failure mode: over-aggressive rerouting or bad decision-maker inference.
Measurement: decision-maker response rate, interview conversion, time-to-conversation, applications per interview, user effort per interview.
Benchmark: materially lower applications/interview than application-first baseline without reducing offer conversion.
Fallback: user-approved conventional application route.
Validation: shadow-mode comparison against current acquisition planner.
1x/10x/100x: planner remains deterministic over normalized facts; expensive enrichment is asynchronous/cached.
Success-too-well risk: outreach volume triggers spam/reputation problems; enforce per-user/per-domain budgets and quality thresholds.

### 3. Decision-Maker & Relationship Graph
Purpose: identify who can actually move a candidate into a hiring conversation.
Mechanism: normalized Person, Organization, Team, Role, RelationshipEdge and HiringAuthority entities with source/provenance/confidence/expiry. Separate observed facts from inferred authority.
Expected advantage: creates a durable human-access layer unavailable in application-only tools.
Tradeoff: data freshness, provider dependence and identity resolution complexity.
Failure mode: wrong person, stale employment, duplicate identity, unjustified authority inference.
Measurement: verified-person precision, bounce rate, response rate, introduction-to-interview conversion, stale-edge rate.
Benchmark: >95% verified contact/role precision for sources that provide verification; explicit UNKNOWN rather than fabricated authority.
Fallback: recruiter/company talent channel or formal application.
Validation: manually labeled employer/team sets and stale-data adversarial tests.
1x/10x/100x: source adapters feed a canonical graph; graph storage can later move to indexed relational/graph projections without changing planner contracts.
Success-too-well risk: graph expansion creates privacy/compliance burden; enforce purpose limitation, retention and consent scopes.

### 4. Evidence Packet Compiler
Purpose: make every introduction/outreach/application/interview claim defensible.
Mechanism: compile role-specific packets from verified/supported evidence with provenance, confidence, recency, claim risk and proof path.
Expected advantage: combines candidate advocacy with auditability.
Tradeoff: strong claims may be withheld when evidence is weak.
Failure mode: stale evidence or unsupported inference promoted as fact.
Measurement: unsupported-claim rate, recruiter follow-up success, interview defendability failures.
Benchmark: zero fabricated material facts in red-team suite.
Fallback: label as evidence-limited and request more proof.
Validation: adversarial claim-generation tests and human review samples.

### 5. Durable Action Journal + Transactional Outbox
Purpose: eliminate split-brain between approved state and external action.
Mechanism: atomically persist approval/execution transition plus outbox command; workers claim commands with idempotency keys; Connector Fabric records provider acknowledgement, verification, retries and reconciliation.
Expected advantage: recoverable exactly-once-effect semantics where provider supports idempotency, otherwise at-least-once dispatch with dedupe/reconciliation.
Tradeoff: worker/outbox operational complexity.
Failure mode: poison events, stuck leases, provider ambiguity.
Measurement: orphaned action count, duplicate external effects, retry recovery time, dead-letter rate.
Benchmark: zero untracked identity-bearing dispatches in fault-injection suite.
Fallback: halt command, surface user-visible reconciliation state.
Validation: kill process between every state transition and verify eventual truth.
1x/10x/100x: PostgreSQL outbox initially; partition/queue adapter later. Preserve one semantic contract.
Success-too-well risk: bursty high-volume actions overload providers; admission control + tenant/domain budgets.

### 6. Migration Ledger
Purpose: replace ad-hoc CREATE TABLE calls with deterministic schema evolution.
Mechanism: ordered immutable SQL migrations tracked in `hired_schema_migrations`, each with checksum, transaction boundary and compatibility notes.
Expected advantage: reproducible deploy/rollback planning and safer multi-instance startup.
Tradeoff: migration discipline required.
Failure mode: non-backward-compatible release or partially applied DDL.
Measurement: migration drift, checksum mismatch, startup failures.
Benchmark: clean database → head and previous production database → head both succeed in CI.
Fallback: expand/contract migration discipline and documented restore procedure.
Validation: ephemeral Postgres upgrade tests.

### 7. Durable Employer System of Record
Purpose: eliminate restart loss of organizations, memberships, jobs, candidate-sharing consent and fairness audits.
Mechanism: persist employer domain snapshot immediately, then normalize high-volume tables as scale demands. All writes are versioned and tenant-scoped.
Expected advantage: closes the largest current production correctness defect.
Tradeoff: concurrency and migration complexity.
Failure mode: last-write-wins corruption if multiple instances edit same snapshot.
Measurement: restart equivalence, concurrent-write conflicts, audit completeness.
Benchmark: 100% state survival across forced restarts; reject conflicting versions rather than silently overwrite.
Fallback: single-writer lease while normalized tables are introduced.
Validation: multi-process concurrency tests and restore tests.

### 8. Provider-Neutral Connector Mesh
Purpose: prevent vendor lock-in while expanding real-world reach.
Mechanism: capability contracts (`read-opportunities`, `resolve-person`, `send-outreach`, `submit-application`, `schedule`, `verify-receipt`, etc.), provider adapters, capability negotiation, health scoring and fallback routing.
Expected advantage: sources/providers can be replaced without changing Maya's reasoning core.
Tradeoff: lowest-common-denominator risk.
Failure mode: provider semantic mismatch.
Measurement: adapter conformance, provider error rate, fallback success, cost/action.
Benchmark: same acquisition workflow passes against deterministic fake provider + at least two real provider adapters.
Fallback: manual/user-assisted route.
Validation: connector certification suite.

### 9. OTel-Compatible Observability Plane
Purpose: make unknown failures diagnosable in production without leaking private candidate content.
Mechanism: structured traces, metrics and logs with correlation IDs; PII-safe attributes; exporter interface; SLO dashboards and alert rules.
Expected advantage: vendor-neutral operations and faster incident response.
Tradeoff: telemetry volume/cost.
Failure mode: sensitive-data leakage or cardinality explosion.
Measurement: PII scanner violations, telemetry cost/user, incident MTTR, missing-span ratio.
Benchmark: zero raw resume/message bodies in telemetry; trace every consequential action end-to-end.
Fallback: local bounded ring buffer + redacted structured logs.
Validation: telemetry privacy tests and forced-failure drills.

### 10. Distributed Admission & Rate Control
Purpose: protect users, providers and product reputation under horizontal scale.
Mechanism: rate-limit abstraction with local implementation for development and Redis/Postgres token-bucket/lease implementation for production; budgets by account, IP, provider, employer-domain and action class.
Expected advantage: consistent limits across instances; prevents success-driven spam bursts.
Tradeoff: additional state/service dependency.
Failure mode: limiter unavailable or clock skew.
Measurement: limit consistency, false throttles, provider 429 rate.
Benchmark: no configured budget exceeded under concurrent 100x load test.
Fallback: fail closed for identity-bearing actions; fail soft/read-only for low-risk reads.
Validation: multi-instance race test.

### 11. Model Router with Deterministic Safety Envelope
Purpose: remain model-independent while using stronger models where they add value.
Mechanism: deterministic domain planner and policy layer surrounds optional model adapters. Model outputs are proposals; evidence/policy/action layers decide what becomes state or external action.
Expected advantage: avoids provider lock-in and hallucination becoming authority.
Tradeoff: more engineering than pure prompt orchestration.
Failure mode: adapter quality drift, prompt injection, model outage.
Measurement: provider substitution regression, unsupported proposal rejection, latency/cost per resolved task.
Benchmark: core workflow remains operational with model disabled; changing model does not change protected invariants.
Fallback: deterministic Maya.
Validation: cross-model replay and prompt-injection suite.

### 12. Feature/Experiment Control Plane
Purpose: safely deploy acquisition strategies and pricing/product experiments.
Mechanism: typed feature flags scoped by environment/cohort/tenant, immutable experiment assignment, exposure events, kill switches.
Expected advantage: reversible rollout and trustworthy outcome attribution.
Tradeoff: configuration complexity.
Failure mode: flag debt or inconsistent assignment.
Measurement: stale flag count, assignment stability, emergency-disable latency.
Benchmark: <60 seconds to disable an unsafe connector/strategy without deploy.
Fallback: conservative defaults.
Validation: deterministic cohort assignment tests.

### 13. Privacy & Governance Kernel
Purpose: make candidate control structural.
Mechanism: purpose-scoped consent, field-level sharing policy, retention/expiry, export/delete, sensitive-data minimization, authority separation and immutable audit events for consequential actions.
Expected advantage: trust and enterprise readiness while reducing unnecessary data exposure.
Tradeoff: some acquisition routes become unavailable without consent.
Failure mode: consent drift across connectors.
Measurement: unauthorized-field disclosure count, deletion completion time, audit coverage.
Benchmark: zero disclosure outside active policy in adversarial connector suite.
Fallback: deny sharing.
Validation: policy matrix and deletion propagation tests.

## Scale model

### 1x
Single production region, PostgreSQL as authoritative store, small worker pool, local or managed telemetry backend, a few providers. Optimize correctness and measurable conversion.

### 10x
Read replicas where useful, normalized hot employer/career projections, distributed limiter, separate connector workers, outbox partitioning, cache verified enrichment, asynchronous analytics.

### 100x
Partition by tenant/candidate, independently scalable acquisition/enrichment workers, queue/outbox sharding, archival cold history, multi-region read presence with one clearly defined write authority per aggregate, provider-specific circuit breakers and cost-aware routing.

The architecture must not require the 100x machinery at 1x. Interfaces are designed so scaling components can be swapped without changing domain semantics.

## Evidence plan and gates before claiming superiority

1. **Repository qualification:** build, unit, integration, production-integrity and migration tests green on Node 22 and 24.
2. **Restart qualification:** candidate and employer state survive process termination/restart exactly.
3. **Fault injection:** kill the process before/after approval, outbox commit, provider acknowledgement and receipt verification.
4. **Concurrency:** simultaneous updates to the same employer/candidate aggregate must conflict or serialize; never silently lose data.
5. **Security:** auth fail-closed in production, CSRF/origin tests, session fixation/expiry tests, webhook replay tests, connector SSRF/payload tests, permission matrix tests.
6. **Privacy:** telemetry and connector payload PII scans; export/delete propagation.
7. **Model independence:** deterministic baseline works with no LLM; at least two model adapters pass protected-invariant suite when configured.
8. **Acquisition benchmark:** compare application-first baseline against route-planner shadow mode on applications/interview, time-to-human-conversation, outreach response, interview rate, offer rate and user effort.
9. **Cost benchmark:** database, model, enrichment, telemetry and provider cost per active user, per qualified opportunity and per interview.
10. **Load:** 1x/10x/100x synthetic users with realistic state size, connector delays and retry storms.
11. **Recovery:** database restore into clean environment; outbox/provider reconciliation after restore.
12. **Commercial:** test-mode and then controlled live billing round trip, entitlement transition, cancellation, duplicate/out-of-order webhook handling and refund/support procedure.

## Architectural ordering

P0 correctness: migration ledger → durable employer state → transactional outbox → production auth/security qualification → OTel-compatible telemetry → distributed rate-control interface → backup/restore qualification.

P1 real-world reach: connector certification → job-source adapters → person/decision-maker graph → relationship route planner → introduction/outreach execution and verification.

P2 compounding advantage: experiment control plane → outcome-calibrated acquisition policy → employer-side signal-quality learning → cost-aware model/provider routing.

No feature should bypass the canonical career graph, Governor, outbox/connector delivery state or evidence/provenance rules.
