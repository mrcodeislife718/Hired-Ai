# Hired AI roadmap

Hired AI's canonical direction is **AI Career Agent**: a conversational career operating system that helps people discover opportunities, build professional relationships, strengthen their market position, win interviews, secure offers, and advance over time.

No roadmap item should pull the product back toward a dashboard-first tracker, generic job board, or mass auto-apply tool.

## Implemented foundation

- Typed opportunity and hiring-state domain model
- Conversational customer interface
- Deterministic discovery normalization
- Hard-constraint qualification
- Requirement extraction and interview-area inference
- Repository-backed evidence graph
- Truthful strong/adjacent/missing gap model
- Explainable opportunity scoring
- Public/authorized human-path abstraction
- Job-specific resume package and outreach drafting
- Application package assembly
- Follow-up scheduling primitive
- Interview preparation plans
- Funnel feedback and career-strategy aggregation
- Explicit approval governor for outreach/application/follow-up actions
- Duplicate prevention, legal state transitions, and audit trail
- Deterministic tests and Node 22/24 CI

## Product expansion: six intelligence layers

### Opportunity Intelligence

- broader authorized job-source coverage
- cross-source normalization and deduplication
- expected-career-value ranking
- source quality scoring
- opportunity freshness and tombstoning
- compensation normalization
- role clustering
- proactive opportunity discovery
- interview-probability calibration

### Career Intelligence

- durable career profile
- skill and evidence graph
- employment/project/credential history
- compensation history and targets
- aspirations and trajectory model
- market-position analysis
- positioning quality checks
- demonstrated-vs-claimed capability tracking
- opportunity ceiling analysis

### Relationship Intelligence

- sourced people graph
- recruiter/hiring-manager/peer/founder/mentor classifications
- relationship context and history
- referral and introduction paths
- contact-quality scoring
- network-gap analysis
- follow-up timing
- relationship maintenance recommendations
- professional-community discovery
- anti-spam and duplicate-contact controls

### Acquisition Agent

- stronger resume tailoring
- application question support
- governed application submission connectors
- governed email/outreach connectors
- calendar integration
- follow-up orchestration
- interview scheduling context
- offer comparison
- negotiation preparation
- application and outreach idempotency

### Career Development Agent

- repeated-gap detection
- fastest credible gap-closure plans
- project and portfolio recommendations
- skill-development plans
- credential ROI analysis
- interview weakness drills
- positioning experiments
- network-building objectives
- evidence-strength verification after development work

### Outcome Learning

- application-to-screen conversion
- screen-to-technical conversion
- technical-to-onsite conversion
- onsite-to-offer conversion
- outreach response rates
- referral conversion
- compensation outcomes
- time-to-interview
- time-to-offer
- strategy experiments
- counterfactual funnel analysis
- outcome-calibrated scoring

## Connector layer

Adapters should sit behind source-neutral interfaces for:

- company career feeds
- ATS APIs/pages where permitted
- authorized job-board feeds
- GitHub and other portfolio evidence
- email
- calendar
- professional-contact providers
- user-authorized professional-network data
- credentials and learning evidence

Every connector must preserve provenance, rate limits, terms, privacy boundaries, and user authority.

## Conversational agent quality

The career agent must become genuinely useful as a conversation partner, not merely a command parser.

Required capabilities include:

- persistent career context
- multi-turn goal refinement
- concise default responses with deeper explanation on request
- structured job/person/evidence/action cards inline when useful
- proactive but bounded recommendations
- voice conversation
- file and resume understanding
- explainable recommendations
- uncertainty and limitation disclosure
- graceful degraded behavior when a provider is unavailable

## Production hardening

- durable Postgres schema and migrations
- encrypted secrets
- authentication and account recovery
- per-connector scopes
- idempotency keys
- retries and circuit breakers
- telemetry and trace IDs
- freshness validation
- source conflict resolution
- PII retention and deletion policy
- model-provider abstraction
- structured model-output validation
- evaluation corpus
- deployment manifests
- abuse prevention
- auditability for identity-bearing actions

## Commercial proof

Hired AI should not claim superiority from architecture alone.

Commercial proof should measure:

- qualified-opportunity precision
- useful relationships created
- recruiter/hiring-manager conversations
- time saved
- application-to-screen conversion
- interview conversion
- offer conversion
- compensation improvement
- time-to-interview
- time-to-offer
- retention beyond a single job search

## Long-term behavioral target

The desired habit is:

> "I'll ask my career agent."

The user should no longer need to decide which job board, tracker, resume tool, networking tool, interview-prep tool, or career-planning product to open for ordinary career work.
