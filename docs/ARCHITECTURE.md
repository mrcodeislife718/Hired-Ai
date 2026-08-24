# Hired AI architecture

Hired AI is an **AI Career Agent**: a conversational career operating system for helping people discover opportunities, strengthen their professional position, build useful relationships, win interviews, secure offers, and advance over time.

Hired AI is not an auto-apply bot, not a job board with an AI wrapper, and not career-management software that makes the customer operate a collection of screens. The conversational career agent is the primary interface to a set of governed career systems underneath it.

## Category

**AI Career Agent**

The intended behavioral shift is:

```text
Old behavior
job board -> search/filter -> research -> tailor -> network -> apply -> track -> follow up -> prepare

Hired AI behavior
ask my career agent -> agent coordinates the work -> I authorize consequential actions -> agent learns from outcomes
```

Job boards, ATS systems, company career pages, professional networks, and authorized recruiting data can become inputs into Hired AI rather than separate products the user must operate independently.

## Mission

**Help people build stronger careers — not merely find their next job.**

Getting hired is the first high-value transaction. Career advancement is the long-term relationship.

## Six connected intelligence layers

### 1. Opportunity Intelligence

Turn a noisy employment market into a small set of opportunities worth the user's time.

Responsibilities:

- aggregate authorized job sources
- normalize heterogeneous postings
- deduplicate repeated opportunities
- enforce hard constraints
- infer role requirements and seniority
- determine realistic fit
- rank by expected career value instead of keyword similarity
- compare compensation, location, freshness, competition, evidence strength, interview probability, and career upside
- identify opportunities before the user explicitly searches for them

Target behavior:

> Only five of these opportunities are worth your time. Four are strongly supported by your evidence, three have useful human paths, and one has unusually high career upside.

### 2. Career Intelligence

Maintain a living model of the user's actual career position and desired trajectory.

The model should include:

- skills
- verified evidence
- work history
- project history
- credentials
- compensation and target compensation
- preferred work modes and locations
- aspirations
- constraints
- strengths
- weaknesses
- demonstrated versus claimed capability
- desired role trajectory
- market positioning

Career Intelligence should answer:

- What roles can I realistically win now?
- What roles am I close to qualifying for?
- Why am I getting rejected?
- What is holding back my compensation?
- Is my positioning aligned with what my evidence proves?
- What should my next career move be?

### 3. Relationship Intelligence

Help the user build and maintain a durable professional network rather than treating networking as one-off cold outreach.

Relationship Intelligence models relevant:

- recruiters
- hiring managers
- employees
- peers
- founders
- mentors
- former colleagues
- communities
- referral paths
- introductions

Every path should retain source/provenance, confidence, relationship context, and authorization boundaries.

The system should help users identify who is worth knowing, why, when to contact them, when to follow up, and how to maintain relationships after an immediate application ends.

Spam, deceptive identity representation, indiscriminate mass outreach, and source-rule violations are outside the product doctrine.

### 4. Acquisition Agent

Coordinate the work required to turn a qualified opportunity into a real hiring conversation and ultimately an offer.

Capabilities include:

- evidence-grounded resume preparation
- application package assembly
- truthful tailoring
- recruiter and hiring-manager path preparation
- outreach preparation
- follow-up scheduling
- application state continuity
- interview preparation
- offer and negotiation preparation
- governed external execution
- duplicate-application prevention

Consequential external actions follow:

```text
prepare -> request authorization -> approve -> execute -> audit
```

The user can delegate substantial work without giving a model unrestricted authority over their professional identity.

### 5. Career Development Agent

Close the gaps preventing the user from reaching better opportunities.

The system should convert market evidence into specific development recommendations such as:

> You are repeatedly losing high-compensation platform roles because your current evidence does not demonstrate production Kubernetes operation. Here is the fastest credible way to build and verify that evidence.

Career Development should be able to recommend and later evaluate:

- skills to learn
- projects to build
- portfolio proof to strengthen
- credentials when they have demonstrated market value
- interview weaknesses to drill
- positioning changes
- network-building goals
- experience gaps

The system should prefer the smallest credible intervention that materially expands opportunity access.

### 6. Outcome Learning

Learn from what actually happens instead of optimizing for activity metrics.

Observed evidence includes:

- applications
- responses
- no-responses
- recruiter screens
- technical interviews
- interview failures
- onsites
- offers
- compensation
- accepted and rejected offers
- outreach responses
- referrals
- relationship activity
- time-to-interview
- time-to-offer

Outcome Learning should update strategy from measured conversion while keeping policy, truthfulness, authorization, and safety deterministic.

This is a core long-term moat: Hired AI should increasingly understand the person, their evidence, their market, their relationships, their history, and which strategies actually convert for that individual.

## Unified architecture

```text
                     USER
              voice / text / files
                       |
                       v
             Conversational Career Agent
                       |
          intent + persistent career context
                       |
        +--------------+--------------+
        |              |              |
        v              v              v
 Opportunity      Career        Relationship
 Intelligence   Intelligence    Intelligence
        |              |              |
        +--------------+--------------+
                       |
                       v
              Acquisition Agent
                       |
            Governor / authorization
                       |
                       v
             External career actions
                       |
                       v
        Applications / people / interviews
                       |
           +-----------+-----------+
           |                       |
           v                       v
 Career Development          Outcome Learning
           |                       |
           +-----------+-----------+
                       |
                       v
             Updated career strategy
                       |
                       +-----> conversation continues
```

## Customer interface doctrine

The customer should not have to operate the architecture.

The primary surface is a friendly conversation with the career agent. Structured job cards, evidence, people, application packages, interview plans, negotiation guidance, and approval requests appear inline only when useful.

Examples:

```text
Find me roles I can realistically win.
Who should I know in this industry?
Why am I getting rejected?
Fix my positioning.
Which skills would increase my compensation fastest?
Prepare me for this interview.
Help me negotiate this offer.
What should my next career move be?
Keep my network warm.
Find opportunities before I need another job.
```

The user should increasingly think **"I'll ask my career agent"** rather than deciding which job board, tracker, resume tool, networking tool, or career app to open.

## Existing implementation mapping

The current codebase already provides foundations for the six-layer system:

- `ScoutAgent` + discovery adapters -> Opportunity Intelligence
- `QualificationAgent` + `EvidenceAgent` + candidate profile -> Career Intelligence / qualification
- `RecruiterAgent` + `HumanPath` -> Relationship Intelligence foundation
- `ResumeAgent`, `OutreachAgent`, `ApplicationAgent`, `FollowUpAgent`, `InterviewAgent` -> Acquisition Agent
- evidence gaps + interview gap drills -> Career Development foundation
- `CareerStrategist` + feedback events -> Outcome Learning foundation
- `Governor` -> authority boundary across consequential actions

These foundations should evolve behind stable contracts rather than into disconnected products.

## Evidence grounding

A required skill can be strong, adjacent, learning-gap, or missing.

Resume/application generation receives verified evidence IDs and emits gap disclosures for unsupported areas. Unsupported qualification claims should remain detectable system errors rather than persuasive writing choices.

## Governed autonomy

Conversation is the interface, not the authority boundary.

A production model provider may improve intent interpretation and dialogue quality, but model output does not own authorization, execution eligibility, evidence truth, durable state, or audit truth.

The Governor owns consequential state transitions, duplicate protection, approval requests, explicit human authorization, execution eligibility, and audit evidence.

## Opportunity ranking

The deterministic scoring foundation retains components for:

- technical fit
- compensation
- career upside
- location
- evidence strength
- competition
- freshness
- estimated interview probability

Every important recommendation should be explainable conversationally rather than presented as an opaque score.

## Relationship doctrine

Professional relationships are durable career assets.

Hired AI should help users build useful networks around where they want their career to go, remember interaction history, avoid inappropriate repetition, recommend timely follow-ups, and preserve relationship context beyond a single application.

## Feedback doctrine

No response, rejection, recruiter screen, technical outcomes, onsite progression, offers, compensation outcomes, outreach responses, and referrals are evidence.

Future adaptive ranking and career strategy should learn from measured outcomes while preserving deterministic guardrails and auditable changes.

## Persistence and operational resilience

Hired AI supports or is designed around:

- durable persistence
- automatic checkpointing
- audit evidence
- trace recording
- bounded retries
- circuit breakers
- source provenance
- model-provider abstraction
- failure isolation

The conversational career experience should remain useful when an external model or data provider is degraded.

## Competitive direction

Hired AI can compete across several existing product categories while presenting one customer relationship:

- job boards and search products -> Opportunity Intelligence
- career trackers and career-management software -> Career Intelligence
- networking and professional graph tools -> Relationship Intelligence
- auto-apply/application agents -> Acquisition Agent
- career coaching and upskilling guidance -> Career Development
- analytics and optimization -> Outcome Learning

The goal is not to copy each competitor's interface. The goal is to absorb the useful functions into one increasingly capable career agent.

## Canonical product boundary

```text
conversational AI career agent
+ opportunity intelligence
+ career intelligence
+ relationship intelligence
+ governed acquisition
+ career development
+ outcome learning
= Hired AI
```

Any future feature should strengthen this system or remain outside the product.