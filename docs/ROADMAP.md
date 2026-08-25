# Hired-AI / Maya Roadmap

## Product objective

Build a technically superior two-sided career and hiring operating system that optimizes durable successful matches rather than clicks, application volume or paid ranking.

## Completed architecture / engine tranches

- conversational Maya with deterministic truth and LLM rendering fallback
- multi-source opportunity discovery foundation
- opportunity deduplication, freshness and re-verification gates
- evidence-grounded role matching and readiness
- Career OS orchestration
- free + paid Resume Studio architecture and truthfulness audits
- GitHub career audit and professional-presence planning
- social/networking and relationship intelligence foundations
- role-specific interview preparation
- offer comparison and negotiation engine
- fulfillment-fit and employer-quality assessment foundations
- no-pay-to-win organic ranking firewall
- Career Twin with provenance and confidence
- Career Outcome Ledger with 30/90/365-day and Regret Rate tracking
- durable snapshot path for Career Twin, outcomes, saved opportunities and watch rules
- deterministic watch-rule evaluation across query/title/location/work mode/salary/fit
- employer organization, RBAC, role-intake and candidate-consent foundations
- explicit external delivery state machine through verified receipt

## Commercial closure sequence

### Tranche 1 — authenticated candidate production surfaces
- wire Career Twin read/edit API
- wire outcome check-in API
- wire saved opportunities API
- wire watch create/list/delete/match API
- expose these surfaces in Maya UI
- checkpoint after every consequential mutation

### Tranche 2 — free acquisition
- make Resume Studio usable without an active subscription
- keep free quality truthful and professional
- convert into account/Career Twin onboarding without coercive paywalls
- instrument resume -> account -> opportunity -> paid conversion

### Tranche 3 — employer production foundation
- persist organizations, members, jobs and candidate consent
- employer account mode and organization onboarding
- role intake UI separating real must-haves from trainable/preferred requirements
- job lifecycle: draft/open/paused/closed
- candidate sourcing constrained by explicit visibility consent
- evidence-backed candidate explanations and uncertainty

### Tranche 4 — communications and scheduling
- integrate message providers
- use Delivery Ledger for every external action
- never equate dispatch with provider acknowledgement or verified receipt
- add calendar scheduling connectors
- idempotency, retries, dead-letter handling and provider failure states

### Tranche 5 — market intelligence
- salary/total-compensation connectors with timestamps and provenance
- employer-quality data connectors with source independence and confidence
- company/team/hiring signals
- role freshness and likely-real-opening confidence

### Tranche 6 — enterprise integration
- ATS/HRIS connectors
- organization SSO/RBAC expansion
- internal mobility
- audit/export/compliance controls
- enterprise analytics and quality-of-hire learning

### Tranche 7 — production qualification
- distributed rate limiting
- structured logs/traces/request IDs
- dependency health and synthetic journeys
- backup + restore drills
- migration rollback
- load/concurrency tests
- provider outage/chaos tests
- privacy/export/delete verification
- checkout -> webhook -> entitlement production round trip

## Commercial completion gate

Hired-AI is commercially complete only after:

1. candidate can sign up and receive real value
2. free Resume Studio works
3. paid checkout and entitlements work
4. Maya can discover, evaluate, save and track opportunities reliably
5. Career Twin and outcomes survive restart
6. application/outreach actions remain governed and externally verified
7. employer can onboard an organization, define a real role and source only consented candidates
8. all consequential judgments are explainable and expose uncertainty
9. production observability and recovery are proven
10. at least one real candidate and one real employer workflow succeed end-to-end
