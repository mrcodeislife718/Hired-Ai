# Hired AI architecture

Hired AI is a governed multi-agent pipeline, not an auto-apply bot.

## Data plane

Job sources -> Scout -> Qualification -> Company Intelligence -> Evidence Graph -> Scoring -> Human Paths -> Candidate Package -> Approval -> External action -> Funnel state -> Feedback.

## Control plane

The Governor owns state transitions, deduplication, approval requests, explicit human authorization, execution eligibility, and audit events. Identity-bearing actions are separated into prepare/request/approve/execute stages.

## Opportunity score

The initial deterministic score is weighted across technical fit, compensation, career upside, location, evidence strength, competition, freshness, and estimated interview probability. All component scores are retained so ranking is explainable.

## Evidence grounding

A required skill can be strong, adjacent, or missing. Resume/application generation receives verified evidence IDs and emits gap disclosures for anything not directly supported. This makes unsupported qualification claims a detectable system error rather than a writing choice.

## Human path

Recruiter/hiring-manager discovery is represented as sourced `HumanPath` records with confidence and channel. Connectors should only ingest publicly available or authorized data and retain source provenance.

## Feedback loop

No response, rejection, recruiter screen, technical outcomes, onsite progression, and offers are stored as feedback events. The Career Strategist summarizes conversion signals. Future learning should adjust ranking weights from measured outcomes while preserving deterministic guardrails.

## 8-node model

Input: jobs, companies, resume/profile, GitHub evidence, recruiter information.

Process: discover -> normalize -> qualify -> score -> evidence-match -> contact -> follow-up.

Output: high-quality conversations, applications, interviews, offers.

Feedback: replies, rejection reasons, interview outcomes, conversion metrics.

Incentives: maximize quality interviews/offers rather than application volume.

Bottlenecks: evidence gaps, positioning, human access, interview gaps.

Dependencies: sources, company sites, contact providers, GitHub, email, AI providers.

Failure points: stale jobs, hallucinated qualifications, duplicates, bad contacts, spam behavior, unauthorized submission.
