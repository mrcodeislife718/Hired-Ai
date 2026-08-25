# Hired-AI / Maya — Indeed Parity + Reliability Hardening

## Product position

Hired-AI is not a conventional job board with a chatbot attached. Maya is the conversational control surface for a Career Operating System that should understand a candidate, discover opportunities, establish readiness, improve positioning, coordinate governed pursuit, prepare interviews, learn from outcomes, and maintain career state over time.

The competitive rule is:

> Preserve the strongest mechanics users expect from mature job platforms, then improve the decision quality, truthfulness, continuity, personalization, and outcome learning around them.

## What we preserve and improve from mature job platforms

### Broad discovery

Preserve:
- large opportunity inventory;
- location, remote/hybrid/onsite, compensation, title, company and freshness filtering;
- easy browsing and search;
- saved preferences;
- visible application state.

Improve:
- cross-source canonicalization;
- stale-job verification;
- source confidence;
- semantic capability matching;
- selective ranking by realistic win probability and career value rather than volume.

### Low-friction application

Preserve:
- fast application preparation;
- saved candidate information;
- clear application state.

Improve:
- approval-gated external actions;
- evidence-backed claims only;
- role-readiness gate;
- application package provenance;
- provider acknowledgement and delivery verification;
- duplicate-application prevention.

### Candidate preferences

Preserve:
- job type;
- compensation floor;
- geography;
- work mode;
- commute/relocation constraints.

Improve:
- career trajectory;
- company stage/team preferences;
- risk tolerance;
- values;
- learning goals;
- long-term opportunity cost.

### Recruiter/employer visibility

Preserve:
- discoverable candidate profiles;
- searchable skills and experience;
- employer-facing hiring workflow.

Improve:
- evidence-backed candidate claims;
- explainable capability graph;
- verified work samples;
- readiness and evaluation evidence;
- candidate-controlled visibility and permissions.

## Known failure modes we explicitly design against

1. Dead or stale listings.
2. Duplicate/syndicated listings presented as separate opportunities.
3. Keyword matching that misses equivalent capability.
4. Recommendations optimized for application volume rather than outcomes.
5. Opaque scores with no evidence or uncertainty.
6. Unsupported resume/application claims.
7. One-click application spam and candidate fatigue.
8. Weak follow-up state and lost application history.
9. No causal learning from interview/rejection/offer outcomes.
10. Employer/recruiter quality and responsiveness not modeled.
11. AI-generated language treated as factual state.
12. External actions reported as successful before provider confirmation.
13. Cross-account leakage or tenant isolation failure.
14. Billing/entitlement drift.
15. Provider outages causing silent failure.

## Architecture laws

### Deterministic truth, generative language

The language model may explain, summarize and converse. It must not become the source of truth for consequential career state. Career decisions must originate from deterministic or explicitly evidence-scored state. If the language model fails, Maya must remain useful through deterministic fallback.

### Evidence before claim

Every material candidate claim must be classified as one of:
- VERIFIED_DIRECT;
- VERIFIED_EQUIVALENT;
- VERIFIED_ADJACENT;
- SELF_CLAIMED;
- UNKNOWN;
- MISSING.

No application package may promote SELF_CLAIMED, UNKNOWN or MISSING evidence into verified professional experience.

### Uncertainty is state

Major decisions should expose:
- decision/fit score;
- confidence;
- evidence coverage;
- unknowns;
- source freshness;
- source reliability;
- rationale.

A high fit score with low confidence must not be presented as certainty.

### External success requires external evidence

External action lifecycle:

REQUESTED -> PREPARED -> APPROVED -> DISPATCHED -> PROVIDER_ACKNOWLEDGED -> VERIFIED_RECEIVED

Failure states:

FAILED_RETRYABLE | FAILED_FINAL | DELIVERY_UNKNOWN | CANCELLED

`execute()` is not equivalent to successful delivery.

## Closure workstreams

### R1 — Opportunity reliability

Status: implementation started on `hardening/indeed-parity-reliability`.

Required:
- canonical cross-source opportunity identity;
- first-seen/last-seen/last-verified timestamps;
- freshness classification;
- source reliability confidence;
- stale-source recommendation block;
- canonical duplicate block;
- re-verification interface for stale opportunities;
- duplicate-application prevention.

Release gates:
- stale opportunities cannot reach application/outreach approval without re-verification;
- syndicated duplicates resolve to one canonical opportunity;
- canonicalization tests cover source changes and near-duplicates.

### R2 — Capability and evidence graph

Replace lexical-only matching with:

requirement -> normalized capability -> equivalent capability -> adjacent capability -> evidence -> confidence -> provenance

Required:
- capability ontology;
- aliases/equivalents;
- technology-family mapping;
- evidence recency;
- evidence depth;
- production/project/credential context;
- contradiction handling;
- evidence provenance.

Release gate:
- benchmark set of human-labeled job/candidate pairs demonstrates materially better precision/recall than lexical matching without increasing unsupported claims.

### R3 — Requirement criticality and calibrated readiness

Requirement classes:
- blocker;
- core;
- important;
- trainable;
- preferred;
- boilerplate/noise.

Readiness must use:
- requirement importance;
- evidence strength;
- recency;
- depth;
- transferability;
- uncertainty.

Separate:
- textual match;
- capability match;
- role execution risk;
- pursuit recommendation.

Release gate:
- readiness calibration evaluated against recruiter screens, technical interviews and offers.

### R4 — Structured Career Twin

Typed persistent state separate from chat history:
- career objective;
- salary floor/target;
- target titles;
- target industries;
- company preferences;
- rejected companies and reasons;
- work-mode/geography constraints;
- demonstrated capabilities;
- claimed capabilities;
- portfolio evidence;
- credentials;
- recurring gaps;
- interview weaknesses;
- relationship history;
- application fatigue/load;
- compensation history;
- offers;
- learning progress;
- long-term trajectory.

Every field needs source/provenance, confidence and updated-at metadata.

### R5 — Employer Intelligence Graph

Model:
company -> team -> role -> recruiter/hiring path -> stack -> compensation -> hiring velocity -> response behavior -> interview pattern -> historical outcomes

Required:
- role freshness;
- repost detection;
- employer response rate when enough first-party data exists;
- hiring-stage timing;
- team and technology signals;
- compensation quality;
- duplicate/requisition identity;
- source attribution;
- explicit unknowns.

Do not manufacture private company knowledge.

### R6 — Multi-intent Maya planner

Replace regex-only routing as the sole intent mechanism with:

natural language -> structured intent set -> deterministic task graph -> authorized tools -> evidence/state -> result -> language rendering

Requirements:
- multiple intents per turn;
- deterministic schema validation;
- explicit tool permissions;
- no hidden consequential actions;
- fallback to current deterministic routes;
- traceable task graph.

### R7 — Outcome and causal learning

Every pursuit records:
- job snapshot/version;
- source;
- recommendation state;
- fit/readiness/confidence;
- resume version;
- evidence selected;
- outreach version;
- warm/cold path;
- application timing;
- interview preparation used;
- resulting stage/outcome;
- timestamps.

Learning should distinguish correlation from causal claims. Changes should be evaluated through cohorts or experiments when possible.

### R8 — Application delivery reliability

Required states:
- prepared;
- approval requested;
- approved;
- dispatched;
- provider acknowledged;
- received/verified when possible;
- retryable failure;
- final failure;
- unknown.

Requirements:
- idempotency keys;
- retry policy;
- provider response storage;
- no duplicate submission;
- dead-letter/manual review queue;
- human-visible delivery state.

### R9 — Production reliability

Required:
- liveness check;
- readiness check;
- dependency health;
- business/synthetic health;
- structured logs;
- request/trace IDs;
- centralized error telemetry;
- timeouts;
- safe retries;
- circuit breakers;
- durable distributed rate limiting for multi-instance deployment;
- database migration/rollback discipline;
- backup/restore drill;
- secret rotation plan;
- session/device revocation;
- credential encryption;
- audit integrity;
- load testing;
- provider-failure testing;
- tenant-isolation tests;
- account export/delete tests.

### R10 — Marketplace/employer side

Candidate-side product launches first. Employer expansion should add:
- evidence-backed candidate discovery;
- role intake;
- requirement criticality;
- explainable matching;
- candidate-controlled visibility;
- recruiter workflow;
- outcome feedback;
- employer quality controls;
- anti-spam/rate limits;
- bias/fairness evaluation.

## Reliability scorecard

Production targets:
- hallucinated material candidate claims: 0 tolerated;
- unauthorized applications/outreach: 0 tolerated;
- cross-account leakage: 0 tolerated;
- duplicate external submission: 0 tolerated;
- stale opportunity recommended without required re-verification: 0 tolerated;
- consequential state transition without audit event: 0 tolerated;
- unconfirmed external action represented as delivered: 0 tolerated;
- deterministic Maya fallback available when language provider is unavailable;
- restore procedure tested;
- account purge tested;
- opportunity ranking and readiness calibration measured against outcomes.

## Commercial launch gate

A launch candidate is not commercially complete until all of the following pass:

1. build;
2. complete automated test suite;
3. production PostgreSQL persistence;
4. Stripe checkout;
5. signed webhook round trip;
6. entitlement activation/revocation;
7. production deployment health;
8. synthetic Maya conversation;
9. opportunity discovery;
10. stale/duplicate reliability checks;
11. evidence-grounded application package;
12. approval-gated application request;
13. account export;
14. account deletion;
15. observability signal from the full synthetic journey.

## Product success metric

Do not optimize for applications sent.

Primary north-star candidate metric:

> Qualified career outcomes per active user.

Supporting metrics:
- qualified opportunities surfaced;
- user-approved pursuits;
- recruiter-screen conversion;
- technical-interview conversion;
- onsite conversion;
- offer conversion;
- compensation improvement;
- time-to-interview;
- time-to-offer;
- retention;
- successful relationship paths;
- evidence coverage improvement.

The system should prefer ten strong pursuits over one hundred low-probability applications when the evidence supports that decision.
