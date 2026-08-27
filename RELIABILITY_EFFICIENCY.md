# Reliability & Efficiency Standard

Maya must become harder to break and cheaper to operate as it matures. Reliability and efficiency are release properties, not optional optimizations.

## Reliability invariants

- Consequential career truth is owned by deterministic/evidence-backed state, not model prose.
- Provider/model failures degrade safely to verified deterministic behavior where possible.
- External actions are idempotent and never reported successful before provider confirmation.
- Session, account, billing, tenant and persistence boundaries fail closed.
- Important actions are observable, attributable, replayable and recoverable.
- A known-good state must be restorable after operational failure.

## Efficiency invariants

- Stable career state is reused until evidence/version changes invalidate it.
- Deterministic logic replaces model inference where it can preserve the same outcome.
- Provider calls, enrichment, search and verification should be batched/deduplicated when safe.
- Every expensive action should have an observable cost and useful outcome.
- Optimizations may not silently reduce correctness, fairness, safety or career-outcome quality.

## Primary economic metric

Cost per successful career outcome, with supporting metrics for model calls, cache hit rate, provider cost, latency, conversion, interview rate, offer rate and post-placement retention.

## Mandatory audit

1. What fails first under load?
2. What happens when dependencies disappear?
3. Can state be corrupted or lost?
4. Can the system replay and explain what happened?
5. Can it roll back or restore safely?
6. What work is repeated unnecessarily?
7. What data movement or provider traffic is avoidable?
8. What expensive intelligence can be replaced by cheaper deterministic logic?
9. What is the cost per useful outcome?
10. Does any optimization reduce quality, safety, fairness or correctness?

Release flow: input -> normal operation -> resource accounting -> failure injection -> recovery -> verification -> cost accounting -> adaptive improvement.
