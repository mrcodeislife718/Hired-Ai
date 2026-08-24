# Hired AI architecture

Hired AI is a governed conversational job-acquisition system, not an auto-apply bot and not a dashboard-first product.

The product rule is simple:

> **The AI operates the job-acquisition system. The user talks to the AI and stays in control of consequential actions.**

## Experience plane

The default product surface is a familiar AI-assistant interaction model:

```text
voice / text / resume / preferences
              |
              v
       conversational UI
              |
              v
       intent + context
              |
              v
  structured actions + evidence
```

The conversation may surface job cards, evidence, application packages, human paths, interview preparation, pipeline state, approvals, and follow-ups without requiring the user to navigate a complex operations dashboard.

Supporting product surfaces can include Jobs, Applications, People, Interviews, Pipeline, and Command Center, but Chat remains the primary entry point.

## Data plane

```text
Job sources
   |
   v
Scout
   |
   v
Qualification
   |
   v
Company Intelligence
   |
   v
Evidence Graph
   |
   v
Explainable Scoring
   |
   v
Human Paths
   |
   v
Candidate Package
   |
   v
Approval
   |
   v
External Action
   |
   v
Funnel State
   |
   v
Feedback / Learning
```

## Conversational orchestration

Conversation is an orchestration surface, not an authority boundary.

A natural-language request is translated into bounded system work such as:

```text
"Find my best jobs"
  -> ranked qualified opportunities

"Why am I a fit?"
  -> evidence + gaps + score explanation

"Prepare my application"
  -> resume + application package

"Find a recruiter"
  -> public/authorized human paths

"Prepare me for the interview"
  -> role-specific interview plan

"Work my pipeline"
  -> approvals + follow-ups + next actions
```

A production model provider may improve intent interpretation and dialogue quality, but model output does not own authorization, execution eligibility, state mutation, evidence truth, or audit truth.

## Control plane

The Governor owns:

- state transitions
- duplicate protection
- approval requests
- explicit human authorization
- execution eligibility
- consequential-action audit events

Identity-bearing actions remain separated into:

```text
prepare -> request -> approve -> execute
```

Conversational convenience never bypasses that boundary.

## Opportunity score

The deterministic opportunity score currently retains components for:

- technical fit
- compensation
- career upside
- location
- evidence strength
- competition
- freshness
- estimated interview probability

All component scores remain inspectable so ranking can be explained conversationally rather than presented as an opaque number.

## Evidence grounding

A required skill can be:

- strong
- adjacent
- learning-gap
- missing

Resume/application generation receives verified evidence IDs and emits gap disclosures for unsupported areas. This makes unsupported qualification claims a detectable system error rather than a writing choice.

## Human path

Recruiter and hiring-manager discovery is represented as sourced `HumanPath` records with confidence and channel.

Connectors should only ingest publicly available or authorized data and retain source provenance.

The conversation can expose these paths and prepare outreach, but identity-bearing contact remains Governor-controlled.

## Feedback loop

No response, rejection, recruiter screen, technical outcomes, onsite progression, and offers are stored as feedback events.

The Career Strategist summarizes conversion signals. Future adaptive ranking can learn from measured outcomes while preserving deterministic guardrails and auditable changes.

## Persistence and operational resilience

Hired AI supports:

- PostgreSQL persistence when configured
- atomic local checkpoints otherwise
- auto-checkpointing
- audit events
- trace recording
- bounded retries
- circuit breakers

The conversational interface should remain useful even when a model provider is degraded or unavailable.

## 8-node model

**Input:** jobs, companies, resume/profile, GitHub evidence, recruiter information, user requests.

**Process:** converse -> discover -> normalize -> qualify -> score -> evidence-match -> prepare -> approve -> act -> follow-up.

**Output:** high-quality opportunities, conversations, applications, interviews, offers.

**Feedback:** replies, rejection reasons, interview outcomes, conversion metrics.

**Incentives:** maximize quality interviews/offers rather than application volume.

**Bottlenecks:** evidence gaps, positioning, human access, interview gaps, low-quality sources.

**Dependencies:** sources, company sites, contact providers, GitHub, email, AI providers, persistence.

**Failure points:** stale jobs, hallucinated qualifications, duplicates, bad contacts, spam behavior, unauthorized submission, model/provider outage, silent external-action failure.

## Product boundary

Hired AI should feel easy because the interaction model is familiar. It should not become uncontrolled because the interaction model is easy.

The correct architecture is therefore:

```text
familiar conversation
+ specialized job-acquisition agents
+ evidence-grounded qualification
+ explainable ranking
+ governed external actions
+ persistent pipeline memory
+ outcome learning
= Hired AI
```
