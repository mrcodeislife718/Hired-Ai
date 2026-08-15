# Roadmap

## Implemented foundation

- Typed opportunity and pipeline domain model
- Deterministic discovery normalization
- Hard-constraint qualification
- Requirement extraction surface and interview-area inference
- Repository evidence graph
- Truthful strong/adjacent/missing gap model
- Explainable 0-100 opportunity score
- Public/authorized human-path abstraction
- Job-specific resume package and outreach drafting
- Application package assembly
- Follow-up scheduling primitive
- Interview preparation plans
- Funnel feedback and career-strategy aggregation
- Explicit approval governor for outreach/application/follow-up actions
- Duplicate prevention, legal state transitions, and audit trail
- Dashboard API and browser command center
- Deterministic tests and Node 22/24 CI

## Next connector layer

Adapters should be added behind source-neutral interfaces for company career feeds, ATS APIs/pages where permitted, authorized job-board feeds, GitHub evidence indexing, email, calendar, and professional-contact providers. Every connector must preserve provenance, rate limits, terms, and authority boundaries.

## Production hardening

Persistent Postgres store, migrations, encrypted secrets, authentication, per-connector scopes, idempotency keys, retries/circuit breakers, telemetry, trace IDs, freshness validation, job tombstoning, source conflict resolution, PII retention policy, prompt/model provider abstraction, schema validation, evaluation corpus, and deployment manifests.

## Optimization layer

Outcome-calibrated scoring, source quality models, role clustering, salary normalization, commute estimates, contact-quality scoring, application timing experiments, follow-up cadence experiments, interview weakness models, and counterfactual funnel analysis.
