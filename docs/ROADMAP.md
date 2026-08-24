# Hired AI roadmap

Hired AI's canonical direction is **AI Career Agent**: a conversational career operating system that helps people discover opportunities, build professional relationships, strengthen their market position, win interviews, secure offers, and advance over time.

No roadmap item should pull the product back toward a generic job board, tracker, mass auto-apply tool, or customer-operated recruiting console.

## Competitive standard

Hired AI is designed to compete with the combined value users currently obtain from job boards, career-management tools, application agents, recruiters, career coaches, interview-prep products, and professional-network tools.

The product should not claim technical or commercial superiority until measured evidence supports it. The engineering target, however, is intentionally higher than a conventional job board or application bot.

The competitive progression is:

```text
Job board
"Here are hundreds of jobs."

Recommendation system
"Here are jobs you may like."

Application agent
"I can apply to jobs for you."

Hired AI
"I understand your career, evidence, preferences, relationships and outcomes. I found the few opportunities worth your time, can explain why, can strengthen your candidacy, can help create human paths into the company, can prepare and govern the work required to pursue them, and will learn from what happens next."
```

The behavioral target is:

> **"I'll ask my career agent."**

## Baseline capabilities to meet or exceed

Competitive career agents establish a minimum bar that Hired AI must meet or exceed through measured product performance:

- continuous high-scale opportunity discovery
- passive background searching
- conversational preference learning
- personalized role matching
- warm-introduction and human-path discovery
- resume/CV feedback and tailoring
- role-specific interview preparation and mock interviews
- salary and compensation intelligence
- offer comparison and negotiation preparation
- career-clarity guidance
- proactive follow-up

These are baseline capabilities, not the full product moat.

## Hired AI advantage thesis

The architecture is designed around a richer personal model than a search box or one-time prompt:

```text
person
+ verified evidence
+ preferences and constraints
+ career trajectory
+ market
+ opportunities
+ relationships
+ interaction history
+ applications
+ interview outcomes
+ compensation outcomes
+ repeated skill gaps
+ strategy experiments
= persistent career intelligence
```

The intended advantage is not "more applications." It is better decisions, stronger positioning, better access to humans, stronger evidence, better preparation, less wasted effort, and continuously improving career outcomes.

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
- Career-intelligence domain model
- Relationship-intelligence domain model
- Career-development planning primitive
- Outcome-conversion metrics
- Deterministic tests and Node 22/24 CI

## Product expansion: six intelligence layers

### 1. Opportunity Intelligence

Hired AI should search broader and evaluate more deeply than an individual user reasonably can.

- broader authorized job-source coverage
- high-scale background discovery
- cross-source normalization and deduplication
- expected-career-value ranking
- source quality scoring
- opportunity freshness and tombstoning
- compensation normalization
- role clustering
- proactive opportunity discovery
- interview-probability calibration
- unusual-opportunity detection
- notification only when expected value clears a configurable threshold

A user should be able to stop manually checking job boards while Hired AI continuously looks for materially relevant opportunities.

### 2. Career Intelligence

Hired AI should know more about the user's career than a traditional job board can infer from a resume alone.

- durable career profile
- skill and evidence graph
- employment/project/credential history
- demonstrated-vs-claimed capability tracking
- compensation history and targets
- aspirations and trajectory model
- work-style and culture preferences
- manager/team/company-stage preferences
- autonomy, pace and risk preferences
- market-position analysis
- positioning quality checks
- recurring weakness analysis
- opportunity ceiling analysis
- progressive preference learning from user decisions

The system must distinguish facts, user preferences, inferred signals and uncertain hypotheses.

### 3. Relationship Intelligence

Hired AI should treat professional relationships as durable career assets rather than disposable application channels.

- sourced people graph
- recruiter/hiring-manager/peer/founder/mentor/former-colleague/community classifications
- relationship context and interaction history
- referral and introduction paths
- contact-quality scoring
- network-gap analysis
- follow-up timing
- relationship maintenance recommendations
- professional-community discovery
- employer-specific relationship maps
- network adjacency to newly discovered opportunities
- anti-spam and duplicate-contact controls

The ideal behavior is not "send more messages." It is "help the user know the right people and build legitimate relationships over time."

### 4. Acquisition Agent

Hired AI should convert strong opportunities into disciplined, governed action.

- evidence-grounded resume tailoring
- application question support
- governed application submission connectors
- governed email/outreach connectors
- calendar integration
- follow-up orchestration
- interview scheduling context
- application and outreach idempotency
- recruiter/hiring-manager path selection
- application prioritization by expected outcome
- offer comparison
- negotiation preparation

External identity-bearing actions remain governed, auditable and user-controlled.

### 5. Career Development Agent

When the user repeatedly loses strong opportunities because of a real gap, Hired AI should help close the gap rather than endlessly finding similar jobs.

- repeated-gap detection
- fastest credible gap-closure plans
- project and portfolio recommendations
- work-sample recommendations
- skill-development plans
- credential ROI analysis
- interview weakness drills
- positioning experiments
- network-building objectives
- evidence-strength verification after development work
- estimated opportunity/compensation impact of closing a gap

The desired interaction is:

> "You keep encountering the same missing capability in higher-value roles. Here is the fastest credible way to demonstrate it, why it matters, and how we will verify the improvement."

### 6. Outcome Learning

This is a central long-term moat.

Hired AI should learn from what actually happens rather than assuming its ranking model is correct.

- application-to-screen conversion
- screen-to-technical conversion
- technical-to-onsite conversion
- onsite-to-offer conversion
- outreach response rates
- referral conversion
- compensation outcomes
- time-to-interview
- time-to-offer
- source-quality outcomes
- relationship-path outcomes
- role-family outcomes
- positioning experiments
- counterfactual funnel analysis
- outcome-calibrated scoring
- strategy changes based on measured evidence

The system must preserve failed predictions and unsuccessful strategies rather than learning only from successes.

## Correcting known weaknesses of AI career agents

### Human nuance

AI should not pretend to know subtle workplace culture with certainty. Hired AI should combine explicit user preferences, sourced company signals, interview feedback, network evidence and uncertainty rather than generating confident cultural judgments from weak data.

### Initial-prompt dependence

The career model must progressively update from user decisions, resume/portfolio evidence, conversations, job acceptance/rejection behavior, interactions, interview outcomes and compensation outcomes. Onboarding is the start of learning, not the final career profile.

### No final hiring authority

Employers make hiring decisions. Hired AI should optimize the controllable upstream variables: opportunity selection, evidence, positioning, human access, timing, preparation, follow-up, skill development and negotiation.

### Privacy

Privacy should become a competitive capability:

- explicit data categories
- user-controlled retention
- connector-level authorization
- least-privilege access
- visibility into what may be shared externally
- approval for identity-bearing actions
- export and deletion pathways
- separation of private career intelligence from externally shareable evidence

## Passive career mode

Hired AI should remain useful after the user gets a job.

With user authorization it should continue to watch for:

- unusually strong opportunities
- compensation changes
- emerging skill gaps
- relevant people entering the user's network orbit
- former contacts changing companies
- companies hiring into the user's target trajectory
- opportunities to maintain important relationships
- signals that the user's market value has materially changed

The product relationship therefore extends from job search into long-term career advancement.

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
- natural voice conversation
- file and resume understanding
- mock interview conversation
- negotiation rehearsal
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

Hired AI must not claim superiority from architecture alone.

We should attempt to prove superiority using controlled cohort comparisons and retained evidence across:

- qualified-opportunity precision
- recall of genuinely valuable opportunities
- user hours saved
- useful professional relationships created
- recruiter/hiring-manager conversations
- application-to-screen conversion
- interview conversion
- offer conversion
- compensation improvement
- time-to-interview
- time-to-offer
- false-positive opportunity rate
- application waste avoided
- retention beyond a single job search
- user trust and override rate

The strongest competitive claim is not that Hired AI has more features. It is that users obtain better measurable career outcomes with less wasted effort.

## Long-term platform expansion

Once Hired AI has sufficient candidate-side evidence and measured outcomes, an employer-side product becomes possible.

The employer product should not merely reproduce resume keyword search. Its long-term value proposition would be evidence-grounded candidate discovery:

> "Show me people who can actually demonstrate the capabilities this role requires."

That creates a potential two-sided career and talent network while keeping the initial product focused on serving individuals exceptionally well.

## Mission

> **Help people build stronger careers — not merely find their next job.**

Getting hired is the first high-value transaction. Career advancement is the long-term relationship.
