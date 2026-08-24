# Hired AI

**Hired AI is a conversational AI Career Agent built to help people build stronger careers — not merely find their next job.**

Getting hired is the first high-value transaction. Career advancement is the long-term relationship.

Hired AI unifies opportunity discovery, career intelligence, professional networking, application execution, career development, and outcome learning behind one friendly conversational agent. Users talk or type naturally; the agent coordinates the work, surfaces structured information only when useful, and keeps consequential identity-bearing actions governed.

> **Product principle:** the user should manage their career by talking to their AI career agent — not by operating recruiting software.

## The category

**AI Career Agent**

Hired AI is intentionally broader than a job board, application tracker, resume tool, auto-apply agent, or career coach.

The competitive surface spans:

- job boards and search products such as Indeed, LinkedIn Jobs, and ZipRecruiter
- career-management products such as Teal and Huntr
- job-application agents and auto-apply systems
- recruiters and career coaches
- professional-network development tools

The goal is not to copy each of those products. The goal is to absorb their useful functions into one increasingly capable career relationship.

```text
Job board
"Here are 300 jobs."

Recommendation system
"Here are 30 jobs you might like."

Application agent
"I can apply to those jobs."

Hired AI
"Only five of those jobs are worth your time. Four are strongly supported by your evidence. I found useful human paths into three companies. One role could materially advance your career. I prepared the strongest application, and here is the one gap most likely to hurt you in the interview."
```

The behavioral target is simple:

> **"I'll ask my career agent."**

Job boards, ATS systems, company career pages, professional networks, and authorized recruiting data can become inputs into Hired AI rather than separate products the user must operate independently.

## The customer experience

The customer experience is a persistent conversational career agent with text, voice, and career-document context.

It should feel approachable enough for someone seeking a first job and capable enough for an experienced professional navigating a major career transition.

Users can say:

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

The agent responds conversationally. Job matches, evidence, people, application material, interview preparation, negotiation guidance, follow-ups, approvals, and career recommendations can appear directly inside the conversation when useful.

## Six connected intelligence layers

### 1. Opportunity Intelligence

Turn a noisy employment market into a small set of opportunities worth the user's time.

Hired AI is designed to:

- aggregate authorized job sources
- normalize heterogeneous postings
- remove duplicates
- enforce real user constraints
- infer requirements and seniority
- determine realistic fit
- rank by expected career value rather than keyword similarity
- compare compensation, location, freshness, competition, evidence strength, interview probability, and career upside
- proactively surface opportunities before the user explicitly searches

The objective is not maximum application volume. It is better opportunities and better career outcomes.

### 2. Career Intelligence

Maintain a living model of the user's actual career position and desired trajectory.

The career model should understand:

- skills
- verified evidence
- experience
- projects
- credentials
- compensation and targets
- aspirations
- constraints
- strengths
- weaknesses
- demonstrated versus claimed capability
- desired trajectory
- market positioning

This layer should answer questions such as:

```text
What roles can I realistically win now?
What am I close to qualifying for?
Why am I getting rejected?
What is holding back my compensation?
What should my next move be?
```

### 3. Relationship Intelligence

Getting hired and advancing are relationship problems as well as application problems.

Hired AI is designed to help users deliberately build and maintain professional relationships with:

- recruiters
- hiring managers
- employees
- peers
- founders
- mentors
- former colleagues
- communities
- referral paths
- useful introductions

The agent should help identify who is worth knowing, explain why, prepare personalized outreach, remember interaction history, recommend appropriate follow-ups, and maintain useful relationships beyond one application.

The goal is a durable professional network, not spam automation.

### 4. Acquisition Agent

Turn qualified opportunities into real hiring conversations and offers.

Capabilities include:

- evidence-grounded resume preparation
- truthful application tailoring
- candidate-package assembly
- recruiter and hiring-manager path preparation
- outreach preparation
- follow-up orchestration
- application-state continuity
- interview preparation
- offer comparison and negotiation preparation
- duplicate-application prevention
- governed external actions

Consequential actions follow:

```text
prepare -> request authorization -> user approval -> execute -> audit
```

The user can delegate substantial work without giving a model unrestricted authority over their professional identity.

### 5. Career Development Agent

Identify and close the gaps preventing the user from reaching better opportunities.

The system should be able to say things like:

> You are repeatedly losing high-compensation platform roles because your current evidence does not demonstrate production Kubernetes operation. Here is the fastest credible way to build and verify that evidence.

Career Development can eventually recommend and evaluate:

- skills to learn
- projects to build
- portfolio proof to strengthen
- credentials when they have real market value
- interview weaknesses to drill
- positioning changes
- network-building goals
- experience gaps

The system should prefer the smallest credible intervention that materially expands opportunity access.

### 6. Outcome Learning

Learn from what actually happens instead of optimizing for activity metrics.

Relevant evidence includes:

- applications
- responses and no-responses
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

Outcome Learning should adapt strategy from measured conversion while keeping truthfulness, authorization, and consequential controls deterministic.

This can become a major moat: Hired AI should increasingly understand **the person + their evidence + the market + their relationships + their history + what strategies actually convert for that individual.**

## How the system fits together

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

## Current implementation foundation

The repository already contains foundations that map directly into the six-layer architecture:

- `ScoutAgent` and discovery adapters -> Opportunity Intelligence
- `QualificationAgent`, `EvidenceAgent`, candidate constraints, and explainable scoring -> Career Intelligence / qualification
- `RecruiterAgent` and sourced `HumanPath` records -> Relationship Intelligence foundation
- `ResumeAgent`, `OutreachAgent`, `ApplicationAgent`, `FollowUpAgent`, and `InterviewAgent` -> Acquisition Agent
- evidence gaps and interview gap drills -> Career Development foundation
- `CareerStrategist` and feedback events -> Outcome Learning foundation
- `Governor` -> authorization boundary for consequential actions

Current infrastructure also includes:

- PostgreSQL persistence when `DATABASE_URL` is configured
- atomic local checkpoints otherwise
- automatic checkpointing
- audit events
- trace recording
- bounded retries and circuit breakers
- Greenhouse discovery
- Lever discovery
- authorized JSON-feed ingestion
- GitHub portfolio evidence indexing
- conservative resume-text ingestion
- model-provider abstraction
- deterministic tests and Node 22/24 CI

## Evidence-grounded qualification

Required skills can be classified as:

- strong
- adjacent
- learning-gap
- missing

Qualification and application preparation can reference repository-backed evidence instead of relying on unsupported self-description.

Application material should never require fabricated experience to sound competitive.

## Explainable ranking

Opportunity scoring currently retains components for:

- technical fit
- compensation
- career upside
- location
- evidence strength
- competition
- freshness
- estimated interview probability

Users should be able to ask *why* any opportunity was ranked the way it was.

## Governed autonomy

Conversation is the customer interface, not the authority boundary.

Models may interpret language and support reasoning, while authorization, durable state, evidence truth, consequential execution, and audit truth remain outside the model boundary.

The Governor owns consequential state transitions, approval requests, execution eligibility, duplicate protection, and audit evidence.

## Product doctrine

1. **Conversation is the primary customer interface.**
2. **The AI should do operational work instead of transferring that work to the user.**
3. **Models may interpret intent; deterministic systems own consequential controls.**
4. **Qualification claims should be tied to evidence whenever possible.**
5. **External identity-bearing actions require appropriate authorization.**
6. **Career value matters more than application volume.**
7. **Professional relationships are durable assets, not disposable application channels.**
8. **Failures, rejections, no-responses, referrals, and offers are learning evidence.**
9. **Important recommendations must be explainable.**
10. **Automation must not become spam, deception, or fabricated qualification.**
11. **The product should remain useful when an external model/provider is degraded.**
12. **Success means materially improving employment and career outcomes.**

## Run locally

Requires Node.js 22 or newer.

```bash
npm install
npm run check
npm run serve
```

Open:

```text
http://localhost:3000
```

Demo opportunities load automatically unless:

```bash
HIRED_DEMO=false
```

## Optional environment

```bash
HIRED_API_KEY=...
DATABASE_URL=postgres://...
GITHUB_OWNER=...
GITHUB_TOKEN=...
GREENHOUSE_BOARDS=...
LEVER_COMPANIES=...
JOB_JSON_FEEDS=...
```

## Verification

Run the local qualification suite:

```bash
npm run check
```

The repository includes deterministic tests and Node 22/24 CI configuration.

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/API.md`](docs/API.md)
- [`docs/OPERATIONS.md`](docs/OPERATIONS.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)
- [`PORTFOLIO_PROOF.md`](PORTFOLIO_PROOF.md)

## Commercial proof standard

Hired AI should not claim superiority from architecture alone.

The product should measure:

- qualified-opportunity precision
- useful professional relationships created
- recruiter and hiring-manager conversations
- application-to-screen conversion
- interview conversion
- offer conversion
- compensation improvement
- time-to-interview
- time-to-offer
- user time saved
- retention beyond a single job search

The repository does not claim outcome improvements until they are measured with real users.

## Canonical direction

**Help people build stronger careers — not merely find their next job.**

Any future feature should strengthen Opportunity Intelligence, Career Intelligence, Relationship Intelligence, Acquisition, Career Development, Outcome Learning, or the conversational career-agent experience. Features that pull Hired AI toward an unrelated product direction should remain outside this repository.
