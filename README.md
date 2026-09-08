# Hired AI

**Hired AI is a conversational Career Operating System. Maya is the interface.**

The product is built around a simple idea: people should be able to manage their career by talking to Maya instead of learning a collection of recruiting tools, resume editors, application trackers, networking dashboards, interview systems, and career-planning workflows.

Maya helps users start, transition, find work, prove capability, prepare applications, build professional relationships, interview, negotiate, advance, improve compensation, and learn from outcomes over time.

> **Maya — Your Conversational Career OS**

## Conversation is the operating surface

Hired AI is not a conventional recruiting product with a chatbot added on top. The architecture can contain many specialized engines, but the customer should experience one continuous conversation.

Users can naturally say things such as:

```text
Maya, help me figure out my best next career move.
Maya, I want to change careers. What actually transfers?
Maya, find roles I can realistically win.
Maya, why am I not getting interviews?
Maya, audit my resume against what I can actually prove.
Maya, what evidence am I missing?
Maya, prepare me for this interview.
Maya, help me negotiate this offer.
Maya, help me get promoted and earn more.
Maya, what should I do next?
```

Maya uses durable career state, verified evidence, opportunity state, workflow state, outcome history, and relevant long-term context under the conversation. She should continue the journey rather than repeatedly restarting it.

## Friendly Maya voice

Maya now has both a **friendly conversational voice standard** and an **optional spoken interaction surface**.

Her communication style is warm, plainspoken, observant, practical, candid, encouraging when earned, and profession-aware. She should sound like a capable career friend who understands the system without pretending to be human, manufacturing intimacy, or turning every interaction into motivational language.

The browser interface supports:

- explicit-tap speech input when the browser exposes speech recognition
- optional spoken Maya replies through device/browser speech synthesis
- independent control of spoken replies
- interruption-safe behavior: Maya stops speaking before a new voice turn
- graceful text-only fallback when voice capabilities are unavailable
- the same career state, truth rules, and workflows whether the user types or speaks

The microphone is never activated silently. Voice is optional and is not required to receive the product's core value.

## Conversational onboarding

Onboarding is designed as the first useful Maya conversation, not as a long profile form.

A new user can begin with the outcome they want. Maya progressively gathers only the information that changes a decision or unlocks useful work: current situation, desired direction, constraints, career history, evidence, preferences, compensation context, and target opportunities.

The onboarding standard is:

```text
outcome first
    ↓
use what Maya already knows
    ↓
ask only the next high-value question
    ↓
produce immediate useful work
    ↓
build durable career state as the conversation progresses
```

The user should not have to understand Hired AI's internal architecture or repeat information already present in their authorized career state.

## Universal career intelligence

Hired AI does **not** assume software or office work is the default. Healthcare, skilled trades, education, retail, hospitality, finance, public service, logistics, manufacturing, creative work, sales, legal, science, technology, independent work, and other careers are first-class contexts.

Maya uses evidence appropriate to the profession, including employment history, licenses, certifications, education, references, assessments, work samples, operational records, publications, awards, portfolios, customer outcomes, volunteer work, projects, completed gigs, or other legitimate proof.

GitHub is useful when relevant; it is not a universal requirement.

Mandatory legal or professional requirements remain hard gates. Positioning cannot substitute for a required license, clearance, registration, certification, authorization, or safety qualification.

## Dynamic competitive candidate selection intelligence

Maya treats a serious application as a **role-specific evidence-selection problem**, not merely a resume-writing exercise.

The competitive selection system is driven dynamically from the current candidate, current evidence, current resume, and actual selected opportunity. It does not contain a production candidate fixture, fixed company, fixed role, or fixed skill list.

For each target opportunity Maya can evaluate the candidate from three perspectives:

1. **Hiring manager** — can this person credibly perform the work, own meaningful scope, and deliver useful outcomes?
2. **Senior recruiter** — are the strongest relevant qualifications obvious during a fast human screen?
3. **ATS / candidate-job matching** — are supported role concepts textually discoverable without injecting unsupported keywords?

Each important role requirement is mapped to attributable evidence and classified as:

- **Strong**
- **Moderate**
- **Weak**
- **Missing**

Maya also distinguishes **missing from the resume** from **missing from the candidate**. Authorized proof can come from employment evidence, credentials, assessments, GitHub, portfolios, projects, work samples, references, publications, awards, operational records, or other legitimate sources.

That matters because a resume-only optimizer can incorrectly declare a capability missing simply because the candidate did not compress it into the document.

For a target role Maya can produce:

- requirement-to-evidence coverage with provenance
- hiring-manager, recruiter, and ATS/matching assessments
- supported keyword omissions without keyword stuffing
- current resume story versus the role-specific story the evidence supports
- proof-backed bullet guidance around action, impact, scope, ownership, and depth
- what should be emphasized, moved earlier, shortened, removed, or left explicitly as a gap
- the five highest-impact changes before submission
- a role-specific resume plan compiled from one factual claim set
- likely selection and rejection reasons
- a competitive shortlist simulation whose interview probability is explicitly an estimate, not employer truth

When a job source provides a real applicant count, Maya can use that opportunity-specific signal. Otherwise the simulation uses its bounded default assumptions and clearly labels them as assumptions.

The governing principle is:

> **Do not optimize the candidate to look qualified. Discover what the candidate can actually prove, then make the relevant evidence impossible to overlook.**

## Wired through the conversational lifecycle

The competitive-selection system is not a detached report generator.

During resume review, `CareerOperatingSystem.buildPlan()` now includes competitive selection analyses for the strongest live target opportunities and can promote the highest-value corrections into Maya's next actions.

The shared Maya role-plan adapter also carries competitive selection intelligence into role-specific application-question and interview workflows. The same opportunity and evidence state therefore feeds positioning, application reasoning, and interview preparation instead of producing separate contradictory stories.

The flow is:

```text
conversation
    ↓
current career state + evidence
    ↓
real target opportunity
    ↓
requirement decomposition
    ↓
requirement → evidence map
    ↓
hiring-manager / recruiter / ATS views
    ↓
strongest-defensible positioning
    ↓
resume + application answers + outreach + interview preparation
    ↓
governed execution
    ↓
verified outcome learning
```

## Strongest-defensible candidate advocacy

Maya's job is to present the user as the strongest credible candidate the evidence supports.

She may improve ordering, emphasis, clarity, professional language, transferable framing, adjacent-capability framing, and the strength of rhetoric when the underlying evidence supports it.

She may **not** invent employers, titles, dates, credentials, tools, licenses, ownership, scope, production status, metrics, revenue, user counts, outcomes, or experience that did not occur.

The optimization target is:

> **maximize the probability that the right employer correctly recognizes the candidate's maximum defensible value.**

## Career Advantage

Maya optimizes for durable career mobility, not application volume.

She can help answer:

- How do I get started?
- What transfers if I change careers?
- Which opportunities can I realistically win now?
- What is actually blocking my job-search funnel?
- What small proof action would expand my access the most?
- Should I pursue, develop first, or skip this role?
- How do I improve my interview conversion?
- How do I negotiate the whole offer rather than salary alone?
- How do I build next-level evidence for promotion?
- How do I increase income, resilience, and long-term career options?

A weak application-to-screen rate should not trigger the same intervention as strong screening conversion followed by weak interviews. Maya diagnoses the failing stage before changing strategy.

## Connected intelligence

Under one conversational surface, Hired AI coordinates:

### Opportunity Intelligence
Normalizes authorized job sources, prevents duplicates, checks constraints and freshness, and ranks opportunities by career value.

### Career Intelligence
Maintains goals, constraints, preferences, compensation context, trajectory, capabilities, evidence, uncertainty, and Career Twin state.

### Evidence & Positioning Intelligence
Decomposes requirements, maps proof, distinguishes hard gates from preferences, finds hidden evidence, models likely objections, and compiles strongest-defensible positioning.

### Acquisition Intelligence
Keeps resumes, application answers, outreach, proof, and interview narratives consistent with one material fact set.

### Relationship Intelligence
Builds useful paths across recruiters, hiring managers, peers, mentors, former colleagues, founders, associations, communities, customers, referrals, and other profession-appropriate networks.

### Career Development
Finds the smallest high-value intervention that expands access: evidence, experience, credential, assessment, work sample, relationship, or practice.

### Advancement & Negotiation
Supports promotion cases, internal mobility, next-level scope, compensation analysis, negotiation, and external leverage.

### User Value Orchestration
Ranks available next moves against likely outcome progress, effort reduction, trust, time saved, income upside, and strategic compounding rather than maximizing feature usage.

### Outcome Learning
Learns from applications, screens, interviews, assessments, rejections, offers, compensation, relationships, post-hire satisfaction, advancement, and retention without treating a single sparse result as universal truth.

## Governed autonomy

Conversation is the customer interface, not the authority boundary.

Deterministic systems retain ownership of durable state, evidence truth, readiness, authorization, billing truth, external-action confirmation, and audit events.

Identity-bearing actions follow:

```text
prepare → request authorization → user approval → execute → verify → audit
```

Maya does not claim that an application, message, calendar action, or other external operation succeeded until the system has the required execution evidence.

## Long-horizon continuity

Career continuity follows:

```text
dream → readiness → proof → access → interview → offer → employment → advancement
```

Long-term conversational memory is selective and source-bound. It can improve continuity, but remembered conversation is not automatically verified professional evidence and cannot satisfy a credential gate by itself.

## Employer and institution value

Hired AI also includes employer-side foundations for organizations, role management, candidate-consent controls, sourcing, structured evaluation, hiring collaboration, and post-hire outcomes.

The central employer question remains:

> **What credible evidence do we have that this person can perform this job?**

Training organizations and workforce programs can connect training to proof, readiness, employer access, applications, interviews, placement, retention, and advancement while preserving participant consent.

## Current implementation foundation

The repository includes:

- TypeScript career and acquisition engines
- Maya conversational Career OS service with deterministic fallback
- friendly Maya voice and support policy
- optional browser speech input and spoken replies
- guided conversational onboarding entry points
- source-bound long-horizon memory
- Career Twin and durable career outcomes
- universal cross-profession career intelligence
- dynamic requirement-to-evidence candidate selection analysis
- hiring-manager, recruiter, and ATS/matching perspectives
- evidence discovery beyond resume text
- opportunity discovery, scoring, reliability, readiness, and saved watches
- evidence-backed application compilation
- profession-neutral interview and application-question intelligence
- user-value orchestration
- proactive next-action logic
- employer-quality and mutual-fit logic
- governed external actions and delivery verification
- PostgreSQL persistence when configured
- Stripe subscription and webhook verification
- tenant-isolated accounts, sessions, conversation history, and memory
- Node 22/24 CI
- production-integrity, branch-hygiene, and portfolio-proof gates

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

No production demo candidate or demo opportunity dataset is loaded. Real account state and configured opportunity/evidence sources drive the product.

## Optional environment

```bash
HIRED_API_KEY=...
DATABASE_URL=postgres://...
OPENAI_API_KEY=...
HIRED_MAYA_MODEL=...
GITHUB_OWNER=...
GITHUB_TOKEN=...
GREENHOUSE_BOARDS=...
LEVER_COMPANIES=...
JOB_JSON_FEEDS=...
```

GitHub configuration is optional and should only be used when GitHub is relevant evidence for the user's career context.

## Verification

```bash
npm run check
```

The check path builds TypeScript, runs the test suite, and executes the production-integrity gate. CI qualifies supported Node versions and the repository separately maintains branch-hygiene and portfolio-proof checks.

## Product doctrine

1. Maya is the conversational Career Operating System and primary customer interface.
2. Conversation, text or voice, is the operating surface rather than a wrapper around separate career software.
3. Onboarding should create useful work immediately instead of delaying value behind a long setup form.
4. Voice is optional, explicit, and governed by the same truth and authority boundaries as text.
5. Treat every profession and industry as first-class.
6. Optimize for durable career outcomes, not application volume or message volume.
7. Proactively identify the highest-value next move instead of requiring the user to ask the perfect question.
8. Use existing authorized state before asking the user to repeat information.
9. Advocate for the candidate as strongly as the evidence defensibly allows.
10. Never replace a mandatory credential with positioning.
11. Search authorized evidence before declaring a capability missing merely because it is absent from the resume.
12. Compile material claims from attributable evidence and preserve consistency across artifacts.
13. Diagnose the failing career or hiring stage before changing strategy.
14. Prefer the smallest high-value proof action over generic skill accumulation.
15. Professional relationships are durable career assets, not spam channels.
16. External identity-bearing actions require authorization and verified execution.
17. Important recommendations must be explainable and uncertainty must remain visible.
18. Estimated interview probabilities are estimates, not employer facts.
19. Learn from real outcomes without overfitting sparse samples.
20. Payment may buy capability and service, never better ethics, fabricated fit, or distorted organic ranking.

## Canonical direction

**Hired AI helps people build stronger careers. Maya is the conversational Career Operating System through which they do it.**

The product should keep absorbing useful career functionality into one coherent, evidence-backed relationship until asking or talking to Maya is easier and more effective than operating separate job boards, resume tools, application trackers, career coaches, networking tools, interview tools, recruiting workflows, and advancement systems.
