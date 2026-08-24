# Hired AI

**Hired AI is an AI Career Operating System built to help people build stronger careers — not merely find their next job.**

Getting hired is the first high-value transaction. Career advancement is the long-term relationship.

## Meet Maya

**Maya is the personal AI career agent inside Hired AI.**

Hired AI is the platform and career operating system. **Maya is the friendly, highly capable agent the customer talks to.** Users should not have to operate recruiting software, understand internal agents, or manually coordinate a collection of career tools. They talk or type to Maya, and Maya coordinates the system on their behalf.

> **Product principle:** the user should manage their career by talking to Maya — not by operating recruiting software.

Maya is designed to become a long-term career relationship rather than a one-search assistant. She should know the user's career record, verified capabilities, goals, constraints, professional presence, relationships, active opportunities, hiring history, development gaps, and measured outcomes, subject to the user's privacy and authorization controls.

The intended experience is natural:

```text
Maya, find me roles I can realistically win.
Maya, why am I getting rejected?
Maya, help me get to $150K.
Maya, who should I know in this industry?
Maya, improve my LinkedIn and GitHub positioning.
Maya, my resume is outdated. Fix it from my current career evidence.
Maya, prepare me for tomorrow's interview.
Maya, help me negotiate this offer.
Maya, keep my network warm.
Maya, what should I do next?
```

Maya should be warm, encouraging, concise when speed matters, detailed when decisions matter, proactive without becoming intrusive, truthful about weaknesses, respectful of the user's professional identity, and relentlessly focused on improving real career outcomes.

The customer-facing identity is simply:

> **Maya — Your AI Career Agent**

The name is treated as a human-facing identity, not a forced acronym. Any future acronym or expanded brand meaning must remain secondary to the natural relationship: **"I'll ask Maya."**

## The category

**AI Career Agent / AI Career Operating System**

Hired AI is intentionally broader than a job board, application tracker, resume tool, auto-apply agent, or career coach.

The competitive surface spans job boards and search products, career-management products, job-application agents, recruiters and career coaches, and professional-network development tools. The goal is not to copy each product. The goal is to absorb their useful functions into one increasingly capable career relationship coordinated by Maya.

```text
Job board
"Here are 300 jobs."

Recommendation system
"Here are 30 jobs you might like."

Application agent
"I can apply to those jobs."

Maya
"Only five of those jobs are worth your time. Four are strongly supported by your evidence. I found useful human paths into three companies. One role could materially advance your career. I prepared the strongest application, and here is the one gap most likely to hurt you in the interview."
```

The behavioral target is:

> **"I'll ask Maya."**

Job boards, ATS systems, company career pages, professional networks, GitHub, authorized social/career sources, and recruiting data can become inputs into Hired AI rather than separate products the user must operate independently.

## Six connected intelligence layers

Maya coordinates six connected systems invisibly.

### 1. Opportunity Intelligence

Turn a noisy employment market into a small set of opportunities worth the user's time. Hired AI aggregates authorized sources, normalizes postings, removes duplicates, enforces constraints, evaluates realistic fit, and ranks by expected career value rather than application volume.

### 2. Career Intelligence

Maintain a living model of the user's actual career position and desired trajectory: skills, verified evidence, experience, projects, credentials, compensation, aspirations, constraints, strengths, weaknesses, demonstrated versus claimed capability, market positioning, and career trajectory.

### 3. Relationship Intelligence

Help users deliberately build and maintain professional relationships with recruiters, hiring managers, employees, peers, founders, mentors, former colleagues, communities, referral paths, and useful introductions. The goal is a durable professional network, not spam automation.

### 4. Acquisition Agent

Turn qualified opportunities into hiring conversations and offers through evidence-grounded resume preparation, truthful tailoring, candidate packages, human paths, outreach preparation, follow-up, interview preparation, offer comparison, negotiation preparation, duplicate prevention, and governed external actions.

Consequential actions follow:

```text
prepare -> request authorization -> user approval -> execute -> audit
```

### 5. Career Development Agent

Identify and close the gaps preventing the user from reaching better opportunities. Maya should be able to explain the smallest credible intervention that materially expands opportunity access: a skill, proof project, portfolio improvement, credential, interview weakness, positioning change, relationship goal, or experience gap.

### 6. Outcome Learning

Learn from applications, responses, no-responses, recruiter screens, technical interviews, onsites, offers, compensation, outreach, referrals, relationships, time-to-interview, and time-to-offer. Strategy should adapt from measured conversion while truthfulness, authorization, and consequential controls remain deterministic.

The long-term moat is increasingly understanding **the person + their evidence + the market + their relationships + their history + what strategies actually convert for that individual.**

## Career presence and network growth

Maya treats the user's professional presence as part of the career system rather than a separate chore.

With user authorization, Hired AI can reason across career evidence such as resumes, GitHub, professional profiles, social presence, projects, and interaction history to help users:

- improve professional positioning
- surface stronger verified work
- identify missing proof
- strengthen GitHub presentation
- improve professional social profiles
- identify relevant people and communities
- plan thoughtful outreach
- maintain relationships
- discover referrals and introductions
- align public presence with target roles

Maya should never turn networking into indiscriminate automated messaging.

## Resume modernization

An outdated resume should not force the user to manually reconstruct their career.

Hired AI can detect stale signals, missing current skills, missing verified portfolio evidence, weak outcome framing, and positioning that no longer reflects the user's actual capability. Maya can then guide or generate a truthful modernization plan grounded in the user's current career record and target opportunities.

The system should maintain a durable master career record so future resumes can be regenerated and tailored from current evidence instead of repeatedly editing an obsolete document.

## Selective job pursuit and role readiness

Hired AI does not optimize for the largest number of applications.

Before recommending or requesting an application, the system evaluates whether the user can credibly occupy and operate within the role. Opportunities can be treated as:

- **pursue** — sufficiently ready and strategically worthwhile
- **develop-first** — promising, but a material capability/evidence gap should be closed first
- **skip** — poor fit, low career value, or incompatible with constraints

Maya should explain these decisions rather than hiding them behind a score.

## Interview and offer support

Maya can prepare role-specific interview guidance from the actual job requirements, company intelligence, the user's evidence, and known gaps. The longer-term system should support mock interviews, technical and behavioral preparation, post-interview learning, offer comparison, compensation context, and negotiation preparation.

## How the system fits together

```text
                     USER
              voice / text / files
                       |
                       v
                     MAYA
             Personal AI Career Agent
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
                       +-----> Maya continues the conversation
```

## Current implementation foundation

The repository contains foundations that map directly into the architecture:

- `ScoutAgent` and discovery adapters -> Opportunity Intelligence
- `QualificationAgent`, `EvidenceAgent`, candidate constraints, explainable scoring, and role-readiness gating -> Career Intelligence
- `RecruiterAgent`, sourced `HumanPath` records, career-presence and network planning -> Relationship Intelligence
- `ResumeAgent`, `OutreachAgent`, `ApplicationAgent`, `FollowUpAgent`, and `InterviewAgent` -> Acquisition
- resume modernization, evidence gaps, readiness analysis, and interview gap drills -> Career Development
- `CareerStrategist` and feedback events -> Outcome Learning
- `CareerOperatingSystem` -> cross-layer career orchestration
- `Governor` -> authorization boundary for consequential actions

Infrastructure includes PostgreSQL persistence when configured, atomic local checkpoints otherwise, automatic checkpointing, audit events, traces, bounded retries and circuit breakers, Greenhouse and Lever discovery, authorized JSON-feed ingestion, GitHub portfolio evidence indexing, resume-text ingestion, model-provider abstraction, deterministic tests, and Node 22/24 CI.

## Governed autonomy

Conversation is the customer interface, not the authority boundary.

Models may interpret language and support reasoning, while authorization, durable state, evidence truth, consequential execution, and audit truth remain outside the model boundary. The user can delegate substantial work without giving a model unrestricted authority over their professional identity.

## Product doctrine

1. **Maya is the primary customer interface.**
2. **The user should be able to manage their career conversationally.**
3. **The AI should do operational work instead of transferring that work to the user.**
4. **Models may interpret intent; deterministic systems own consequential controls.**
5. **Qualification claims should be tied to evidence whenever possible.**
6. **External identity-bearing actions require appropriate authorization.**
7. **Career value matters more than application volume.**
8. **Professional relationships are durable assets, not disposable application channels.**
9. **Failures, rejections, no-responses, referrals, and offers are learning evidence.**
10. **Important recommendations must be explainable.**
11. **Automation must not become spam, deception, or fabricated qualification.**
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

Demo opportunities load automatically unless `HIRED_DEMO=false`.

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

Hired AI should not claim superiority from architecture alone. The product should measure qualified-opportunity precision, useful professional relationships created, recruiter/hiring-manager conversations, application-to-screen conversion, interview conversion, offer conversion, compensation improvement, time-to-interview, time-to-offer, user time saved, and retention beyond a single job search.

## Canonical direction

**Hired AI helps people build stronger careers. Maya is the personal AI career agent through which they do it.**

Getting hired is the first high-value transaction. Career advancement is the long-term relationship.

Future features should strengthen Maya, Opportunity Intelligence, Career Intelligence, Relationship Intelligence, Acquisition, Career Development, Outcome Learning, privacy, governance, or measurable career outcomes.