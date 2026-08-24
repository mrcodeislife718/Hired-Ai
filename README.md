# Hired AI

**A governed, evidence-grounded AI career agent built to help people get hired, build stronger professional networks, and continuously improve their career opportunities.**

Hired AI turns the job search into a conversation. Users talk or type to a friendly AI career agent that can understand what they want, discover opportunities, evaluate real fit, connect qualifications to evidence, prepare applications, identify useful professional relationships, plan outreach and follow-up, prepare interviews, and learn from hiring outcomes.

> **Product principle:** the user should manage their career by talking to their AI career agent — not by operating recruiting software.

## The Hired AI experience

The customer experience is centered on a dedicated conversational career agent with a persistent text-and-voice interface.

The agent should feel approachable enough for someone looking for their first job and capable enough for an experienced professional managing a complex career transition.

Users can say things such as:

```text
Find me jobs that I have a strong chance of getting.

I need something remote paying at least $90,000.

Why do you think this company is a good fit for me?

What am I missing for this position?

Improve my resume for this job without exaggerating my experience.

Who should I know at this company?

Help me build a stronger network in AI engineering.

Who should I follow up with today?

Prepare me for tomorrow's interview.

What have you learned from the jobs that rejected me?

What should I do this week to increase my chances of getting hired?
```

Hired AI responds conversationally and introduces structured information only when it helps the user make a decision or complete an action: job matches, evidence, people, application material, interview preparation, follow-ups, and career recommendations can appear directly within the conversation.

## What Hired AI works on

### Find better opportunities

Hired AI discovers and normalizes opportunities, applies the user's real constraints, rejects obvious mismatches, evaluates requirements, estimates fit, and prioritizes opportunities worth the user's time.

The objective is not maximum application volume. It is better opportunities and better hiring outcomes.

### Prove the user's fit

Required skills can be classified as strong, adjacent, learning-gap, or missing. Hired AI can connect qualifications to repository-backed portfolio evidence instead of relying entirely on unsupported self-description.

This allows the agent to explain both:

- why the user is qualified
- where the user genuinely has a gap

Application material should never require invented experience to sound competitive.

### Build the user's professional network

Getting hired is not only an application problem. It is also a relationship problem.

Hired AI is designed to help users deliberately grow useful professional relationships by identifying relevant recruiters, hiring managers, employees, founders, peers, communities, and potential referral paths using public or authorized information with retained provenance.

The agent can help users:

- identify people worth knowing
- understand why a relationship may be relevant
- prepare personalized outreach
- remember prior interactions
- plan appropriate follow-ups
- maintain relationships beyond a single application
- discover introductions and referral paths
- build a network around the career they want, not merely the career they currently have

The goal is a durable professional network, not spam automation.

### Prepare stronger applications

For promising opportunities, Hired AI can assemble an evidence-grounded candidate package including resume strategy, relevant portfolio proof, outreach preparation, application material, gap disclosures, and interview preparation.

### Reach the right humans

Hired AI can derive and retain sourced human paths for relevant recruiters, hiring managers, company contacts, referrals, and authorized communication channels.

Relationship-building and identity-bearing communication remain governed actions.

### Keep momentum

Hired AI remembers opportunity state, follow-ups, responses, interviews, rejections, and offers so users do not have to manually reconstruct their job search every day.

A user can simply ask:

```text
What needs my attention today?
```

and receive prioritized next actions in the conversation.

### Prepare for interviews

Hired AI can use role requirements, company intelligence, evidence gaps, and the user's actual background to prepare focused interview guidance rather than generic question lists.

### Learn from outcomes

No-response, rejection, recruiter-screen, technical, onsite, and offer outcomes become feedback evidence.

Over time the system is designed to learn which roles, positioning, evidence, relationships, and strategies produce better results while retaining deterministic guardrails around consequential actions.

## How the system works

```text
              USER
       voice / text / files
                |
                v
       Conversational Career Agent
                |
       Intent + career context
                |
     +----------+-----------+
     |          |           |
     v          v           v
 Opportunities People    Career Strategy
     |          |           |
     +----------+-----------+
                |
                v
Scout -> Qualification -> Company Intelligence
                |
                v
        Portfolio Evidence Graph
                |
                v
       Explainable Opportunity Score
                |
                v
       Recruiter / Human Paths
                |
                v
 Resume + Application + Outreach + Interview Prep
                |
                v
             Governor
       prepare -> approve -> execute
                |
                v
 Hiring State + Relationships + Follow-Up + Feedback
                |
                +----------------------+
                                       |
                              Career Learning Loop
```

## Conversational interface

The primary product surface is a familiar AI conversation experience:

- persistent text composer
- voice input where supported
- resume and career-document attachment
- contextual job cards inside conversation
- evidence and gap explanations
- people and relationship suggestions
- application preparation
- interview preparation
- follow-up recommendations
- approval requests presented at the moment authorization is needed
- persistent career context

The product should minimize navigation. When information can be requested naturally, the user should be able to ask for it naturally.

## Multi-agent career system

Specialized components currently cover:

- Scout / opportunity normalization
- qualification and hard-rejection rules
- company intelligence
- evidence matching
- recruiter and human-path discovery
- resume preparation
- outreach preparation
- application assembly
- follow-up
- interview preparation
- career-strategy feedback analysis

The conversational agent coordinates these capabilities rather than requiring the user to operate each component separately.

## Explainable opportunity ranking

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

Hired AI is designed to do substantial work for the user without silently taking identity-bearing actions.

Consequential external actions follow an explicit control path:

```text
prepare
-> request authorization
-> user approval
-> execute
-> audit
```

The Governor owns consequential state transitions, approval requests, execution eligibility, and audit events.

This creates a path toward increasingly autonomous assistance without confusing convenience with unrestricted authority.

## Hiring lifecycle

Internally, Hired AI can retain structured hiring state:

```text
DISCOVERED
   |
QUALIFIED
   |
CONTACTED
   |
APPLIED
   |
RECRUITER_SCREEN
   |
TECHNICAL
   |
ONSITE
   |
OFFER
```

`REJECTED` remains explicit feedback evidence rather than disappearing from the user's career history.

Users do not need to manage these states manually. They can ask Hired AI where things stand and what should happen next.

## Current infrastructure

- PostgreSQL persistence when `DATABASE_URL` is configured
- atomic local JSON checkpoints otherwise
- automatic checkpointing
- audit events
- trace recording
- bounded retries and circuit breakers
- Greenhouse discovery adapter
- Lever discovery adapter
- authorized JSON-feed ingestion
- GitHub portfolio evidence indexing
- conservative text-resume ingestion
- model-provider abstraction

The AI/model layer may interpret language and assist reasoning, while authorization, durable state, evidence, verification, and consequential controls remain outside the model boundary.

## Product goals

Hired AI is being built to improve measurable career outcomes, including:

- qualified opportunities discovered
- high-fit opportunities pursued
- useful professional relationships created
- recruiter and hiring-manager conversations
- application-to-screen conversion
- interview conversion
- time to interview
- offer conversion
- compensation improvement
- time saved by the user

The repository does not claim outcome improvements until they are measured with real users.

## Architecture principles

1. **Conversation is the primary customer interface.**
2. **The AI should do the operational work instead of transferring that work to the user.**
3. **Models may interpret intent; deterministic systems own consequential controls.**
4. **Qualification claims should be tied to evidence whenever possible.**
5. **External identity-bearing actions require appropriate authorization.**
6. **Job-search quality matters more than application volume.**
7. **Professional relationships are long-term assets, not disposable application channels.**
8. **Failures, rejections, and no-responses are learning evidence.**
9. **Users should be able to understand why an opportunity or action is recommended.**
10. **The product should remain useful when a model provider is unavailable.**
11. **Automation must not become spam, deception, or fabricated qualification.**
12. **Success means helping the user move toward better employment and career outcomes.**

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

Demo opportunities are loaded automatically unless:

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

If `HIRED_API_KEY` is configured, `/api/*` requires the corresponding bearer token. If it is omitted, the local development experience can be used without authentication setup.

## API

The implementation exposes APIs for conversation, opportunities, candidate packages, governed application/outreach requests, hiring-state transitions, feedback, approvals, discovery, portfolio evidence, follow-ups, audit evidence, traces, and health checks.

The API is an implementation surface; customers should not need to understand it to use Hired AI effectively.

## Verification

Run the full local qualification suite:

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

## Product status

Hired AI is an active engineering product. The current implementation provides the governed job-acquisition foundation and conversational product surface.

Commercial completion requires measured user outcomes plus production decisions and implementation around identity, billing, model infrastructure, voice, job-source coverage, external communication/application connectors, privacy, data retention, relationship intelligence, and deployment.

The standard for completion is not simply that Hired AI can search for jobs. It should become an efficient, trustworthy career agent that materially improves a user's ability to discover opportunities, build relationships, win interviews, secure offers, and advance their career.
