# Hired AI

**A governed, evidence-grounded AI job-acquisition system that users can talk or type to.**

Hired AI is designed to work the job search with the user rather than forcing the user to operate a hiring dashboard. The primary experience is conversational: describe the role you want, ask for the best opportunities, question why a job is a fit, prepare an application, find a recruiter path, work follow-ups, or prepare for an interview.

Behind that conversation is a governed multi-agent system for opportunity discovery, qualification, company intelligence, portfolio-evidence matching, scoring, application preparation, outreach, follow-up, interview preparation, and hiring-funnel learning.

> **Product principle:** the AI operates the job-acquisition system. The user talks to the AI and stays in control of consequential actions.

## Product experience

The default interface is a familiar AI conversation surface:

- persistent text composer
- browser voice input when supported
- resume/text attachment ingestion
- opportunity cards embedded directly in the conversation
- contextual actions such as **Explain fit**, **Prepare application**, **Find recruiter path**, and **Prepare interview**
- job, application, people, interview, and pipeline navigation
- approval-gated identity-bearing actions

Example requests:

```text
Find me the strongest AI engineering roles that match what I have actually built.

Why am I only an 88% match for this role?

Which opportunity gives me the best estimated chance of an interview?

Prepare the application, but do not submit anything until I approve it.

Find a recruiter or hiring-manager path for my top opportunity.

Prepare me for the technical interview.

Work my pipeline and tell me what needs attention today.
```

## What Hired AI does

```text
Conversation / voice / resume / preferences
                    |
                    v
             Intent + context
                    |
                    v
        Opportunity discovery layer
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
         Human / Recruiter Paths
                    |
                    v
 Resume + Application + Outreach + Interview Prep
                    |
                    v
               Governor
          prepare -> approve -> execute
                    |
                    v
      Hiring Pipeline + Follow-Up + Feedback
                    |
                    +--------------------+
                                         |
                              Career Strategy Learning
```

## Current capabilities

### Conversational job acquisition

The browser UI is now chat-first rather than dashboard-first. Hired AI can conversationally surface ranked opportunities, explain qualification, expose evidence gaps, prepare application packages, show recruiter paths, prepare interviews, and summarize pipeline state.

The current local conversational layer is deterministic and evidence-backed. The architecture already contains a provider abstraction for adding a production model backend without moving authorization, state mutation, verification, or audit truth into the model.

### Multi-agent pipeline

Specialized components currently cover:

- Scout / opportunity normalization
- qualification and hard rejection rules
- company intelligence
- evidence matching
- recruiter/human-path discovery
- resume preparation
- outreach preparation
- application assembly
- follow-up
- interview preparation
- career-strategy feedback analysis

### Evidence-grounded qualification

Required skills are classified as strong, adjacent, learning-gap, or missing. Qualification and application preparation can reference repository-backed evidence rather than relying on unsupported self-description.

The system is designed to make unsupported qualification claims detectable rather than allowing them to become persuasive but unverified application copy.

### Explainable ranking

Opportunity scoring currently retains components for:

- technical fit
- compensation
- career upside
- location
- evidence strength
- competition
- freshness
- estimated interview probability

Hired AI optimizes for quality opportunities and interviews rather than raw application volume.

### Governed external actions

Identity-bearing actions are separated into explicit stages:

```text
prepare
-> request approval
-> human approval
-> execute
-> audit
```

The Governor owns consequential state transitions, approval requests, execution eligibility, and audit events.

### Durable state

- PostgreSQL persistence when `DATABASE_URL` is configured
- atomic local JSON checkpoints otherwise
- automatic checkpointing
- audit events
- trace recording
- bounded retries and circuit breakers

### Job discovery

Current discovery adapters include:

- Greenhouse
- Lever
- authorized JSON feeds

The discovery system normalizes incoming jobs before qualification and deduplicates source/source-ID pairs.

### Portfolio indexing

Hired AI can index GitHub portfolio evidence so opportunity qualification can be connected to concrete repository-backed proof.

### Resume ingestion

Text resume ingestion extracts recognized technical skills, URLs, and contact references conservatively. The conversational interface accepts text-readable attachments for local analysis.

## Hiring pipeline

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

`REJECTED` is retained as an explicit terminal/feedback state rather than disappearing from the evidence history.

## Why the interface is conversational

Job seekers already know how to use modern AI assistants. Hired AI deliberately uses that familiar interaction model so the user does not need to learn a complex operations dashboard before receiving value.

The command center, pipeline state, approvals, traces, and metrics remain available as system capabilities, but they support the AI rather than becoming the primary user experience.

This reduces interaction friction while preserving strong control boundaries underneath the conversation.

## Architecture principles

1. **Conversation is the interface, not the authority boundary.**
2. **Models may interpret intent; deterministic systems own consequential controls.**
3. **Qualification claims should be tied to evidence whenever possible.**
4. **External actions require explicit authorization.**
5. **Job-search quality matters more than application volume.**
6. **Failures, rejections, and no-responses are learning evidence.**
7. **Users should be able to understand why an opportunity was ranked highly.**
8. **The product should remain useful when a model provider is unavailable.**

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

If `HIRED_API_KEY` is configured, `/api/*` requires the corresponding bearer token. If it is omitted, the local demo can be used without authentication setup.

## API surface

Important endpoints include:

```text
POST /api/chat
GET  /api/dashboard
GET  /api/opportunities
GET  /api/opportunities/:id/package
POST /api/opportunities/:id/outreach-request
POST /api/opportunities/:id/application-request
POST /api/opportunities/:id/transition
POST /api/opportunities/:id/feedback
POST /api/approvals/:id/approve
POST /api/approvals/:id/execute
POST /api/discover
POST /api/portfolio/index
GET  /api/followups
GET  /api/audit
GET  /api/traces
GET  /health
```

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

Hired AI is an active engineering product. The current implementation provides the governed job-acquisition foundation and a conversational local product surface. Production commercialization still requires deployment-specific choices for identity, billing, model/provider infrastructure, external action connectors, privacy/data-retention policy, and measured acquisition/conversion proof.

The repository does not claim production user volume or hiring outcomes that have not been measured.
