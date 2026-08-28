# Hired AI

**Hired AI is a conversational Career Operating System built to help people start, transition, win, and advance in their careers.**

Getting hired is one important transaction. Building a durable, better-paid, more fulfilling career is the longer relationship.

## Meet Maya

**Maya is the AI career agent inside Hired AI.** The customer should not have to operate recruiting software, navigate feature dashboards, or coordinate separate career tools. They talk or type to Maya, and Maya coordinates the system on their behalf.

> **Product principle:** manage the career by talking to Maya, not by operating recruiting software.

The customer-facing identity is simply:

> **Maya — Your AI Career Agent**

Maya is designed to support the full career lifecycle across professions and industries. She can help someone enter the workforce, reenter after a break, change fields, find and evaluate opportunities, prove capability, improve professional positioning, prepare applications, build useful professional relationships, practice for interviews and assessments, negotiate offers, pursue promotions or internal mobility, improve compensation, and preserve long-term career options.

The intended experience is natural:

```text
Maya, help me start my career.
Maya, I want to change industries. What actually transfers?
Maya, find roles I can realistically win.
Maya, why am I getting rejected?
Maya, what proof am I missing?
Maya, fix my resume from my current career evidence.
Maya, prepare me for this interview.
Maya, help me negotiate this offer.
Maya, help me get promoted and earn more.
Maya, what should I do next?
```

## Universal career intelligence

Hired AI does **not** assume software, engineering, technology, office work, or any other single profession is the default. Healthcare, skilled trades, education, retail, hospitality, finance, public service, logistics, manufacturing, creative work, sales, legal, scientific, technical, and other careers are first-class contexts.

Maya uses the proof appropriate to the profession, including employment history, licenses, certifications, education, references, assessments, work samples, operational records, publications, awards, portfolios, customer outcomes, volunteer work, projects, or other legitimate evidence. GitHub can be useful when it is relevant; it is not a universal requirement.

Legally or professionally required credentials remain hard gates. Strong positioning cannot substitute for a required license, clearance, certification, registration, authorization, or other mandatory qualification.

## Conversation-first product surface

The primary product surface is one persistent Maya conversation. Career capabilities appear inside that conversation as context, evidence, choices, follow-up actions, and generated artifacts rather than separate dashboard workflows.

The web experience provides:

- a ChatGPT-style conversation thread
- persistent conversation history
- conversational resume intake and review
- inline opportunity comparisons and explanations
- conversational career-health, transition, reentry, and advancement planning
- conversational interview, application, employer, networking, and negotiation support
- explicit authorization before identity-bearing external actions

The architecture may contain many specialized engines. The user should experience one coordinated career agent.

## Career Advantage

Maya optimizes for **durable career mobility**, not application volume.

The Career Advantage layer helps answer five larger questions:

1. **How do I get started?** Identify realistic entry paths, mandatory gates, transferable proof, and the smallest evidence actions that expand access.
2. **How do I transition?** Separate transferable capabilities from true gaps, translate prior work into the target profession's language, and preserve existing career capital.
3. **How do I win the next opportunity?** Rank opportunities by realistic readiness, expected career value, evidence strength, timing, competition, compensation, and conversion probability.
4. **How do I advance?** Build next-level evidence, promotion cases, internal-mobility options, leadership proof, compensation leverage, and external alternatives.
5. **How do I stay resilient?** Keep evidence current, relationships healthy, bargaining power visible, and more than one credible career path available.

Maya can also diagnose which stage of a job-search funnel is failing before changing strategy. Weak application-to-screen conversion should not trigger the same intervention as strong screening conversion followed by weak interview performance.

## Strongest-defensible candidate advocacy

Maya's job is to present the user as the strongest credible candidate the evidence supports.

She may improve ordering, emphasis, clarity, professional language, qualitative impact, transferable framing, adjacent-capability framing, and the strength of rhetoric when the underlying evidence supports it. Evidence-limited claims remain labeled and defensible.

She may not invent employers, titles, dates, credentials, tools, licenses, ownership, scope, production status, metrics, revenue, user counts, completed outcomes, or experience that did not occur.

The optimization target is:

> **maximize the probability that the right employer correctly recognizes the candidate's maximum defensible value.**

## Connected intelligence

Maya coordinates several connected systems invisibly:

### Opportunity Intelligence
Normalizes and evaluates authorized job sources, removes duplicates, enforces constraints, verifies freshness, and ranks opportunities by career value rather than volume.

### Career Intelligence
Maintains a living model of goals, constraints, capabilities, evidence, preferences, compensation, trajectory, readiness, and uncertainty.

### Evidence & Positioning Intelligence
Decomposes role requirements, distinguishes hard gates from preferences, synthesizes multiple proof signals, predicts objections, models likely competitors, and compiles strongest-defensible positioning from attributable evidence.

### Relationship Intelligence
Builds durable professional relationship paths across recruiters, hiring managers, peers, mentors, former colleagues, associations, communities, customers, alumni, referrals, and other profession-appropriate networks.

### Acquisition Intelligence
Compiles consistent resumes, application answers, outreach, proof indexes, follow-ups, and interview narratives from one evidence package so material facts do not drift between surfaces.

### Career Development
Identifies the smallest high-value intervention that expands access: evidence, experience, credential, work sample, assessment, relationship, interview capability, or other profession-appropriate proof.

### Advancement & Negotiation
Supports promotion evidence, internal mobility, next-level scope, leadership progression, total-compensation analysis, negotiation, and external leverage.

### Outcome Learning
Learns from applications, screens, interviews, assessments, work trials, rejections, offers, compensation, relationships, time-to-response, post-hire satisfaction, advancement, and retention without overfitting sparse data.

## Application intelligence stack

For a specific opportunity Maya can coordinate:

```text
role description
      ↓
requirement decomposition
      ↓
core hiring problem + hard gates
      ↓
evidence synthesis graph
      ↓
immutable application evidence package
      ↓
strongest-defensible positioning
      ↓
employer decision model + likely objections
      ↓
role-specific proof portfolio
      ↓
resume / answers / outreach / interview narrative
      ↓
application + follow-up
      ↓
outcome measurement
      ↓
calibrated strategy learning
```

The same material facts compile into every artifact. Wording can adapt to the audience; evidence cannot contradict itself.

## Selective pursuit and readiness

Hired AI does not optimize for sending the largest number of applications. Opportunities can be treated as:

- **pursue** — sufficiently ready and strategically worthwhile
- **develop-first** — promising, but a material readiness or evidence gap should be closed or validated first
- **skip** — incompatible, weak-value, stale, or outside constraints

Maya explains the decision, preserves uncertainty, and distinguishes true requirements from employer wish lists.

## Governed autonomy

Conversation is the customer interface, not the authority boundary.

Models may interpret language and support reasoning. Deterministic systems retain ownership of authorization, durable state, evidence truth, consequential execution, billing truth, audit events, and external-action confirmation.

Identity-bearing actions follow:

```text
prepare → request authorization → user approval → execute → verify → audit
```

The system does not claim an external action succeeded until it has evidence of receipt or completion.

## Reliability and learning

Maya is designed to fail closed around consequential actions and to avoid learning the wrong lesson from small samples. The product uses bounded retries, reliability tracking, source freshness, duplicate prevention, evidence provenance, confidence, explicit unknowns, and calibration controls.

A more aggressive application variant does not become preferred merely because it produced a response. Materially false claims remain prohibited regardless of conversion.

## Commercial and employer capabilities

Hired AI includes candidate and employer-side foundations for accounts, subscriptions, organization permissions, candidate-consent controls, employer role management, sourcing, screening, hiring collaboration, and post-hire outcomes. Candidate visibility and identity-bearing actions remain permissioned.

## Current implementation foundation

The repository includes:

- TypeScript career and acquisition engines
- Maya conversational service with deterministic fallback
- cross-industry universal career intelligence
- Career Twin and durable career outcomes
- opportunity discovery, reliability, scoring, readiness, and saved watches
- evidence-backed positioning and application compilation
- profession-neutral interview and application-question intelligence
- employer-quality and mutual-fit logic
- governed external actions
- PostgreSQL persistence when configured, with local durable storage where supported
- Stripe subscription and webhook verification
- tenant-isolated accounts, sessions, and conversation history
- Node 22/24 CI
- a production-integrity gate that rejects production fixture files, unfinished implementation markers, hard-coded candidate fixtures, and regression to dashboard-style primary UI

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

No production demo candidate or demo opportunity dataset is loaded. Real account state and explicitly configured opportunity/evidence sources drive the product.

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

GitHub configuration is optional and should be used only when GitHub is relevant evidence for the user's career context.

## Verification

```bash
npm run check
```

The check path builds TypeScript, runs the test suite, and executes the production-integrity gate. CI runs supported Node versions and the repository also maintains a portfolio-proof gate.

## Product doctrine

1. Maya is the primary customer interface.
2. Every customer-facing career capability should be usable conversationally.
3. Treat every profession and industry as first-class.
4. Optimize for durable career outcomes, not engagement or application volume.
5. Advocate for the candidate as strongly as the evidence defensibly allows.
6. Never replace a mandatory credential with positioning.
7. Compile material claims from attributable evidence and preserve consistency across artifacts.
8. Diagnose the failing career or hiring stage before changing strategy.
9. Prefer the smallest high-value proof action over generic skill accumulation.
10. Professional relationships are durable career assets, not spam channels.
11. External identity-bearing actions require authorization and verified execution.
12. Important recommendations must be explainable and uncertainty must remain visible.
13. Learn from real outcomes without overfitting sparse samples.
14. Payment may buy service, never distort organic fit ranking or truth.
15. Success means better access, interviews, offers, compensation, fulfillment, advancement, retention, and long-term optionality.

## Commercial proof standard

Hired AI should not claim technical superiority from architecture alone. It should earn that claim through measured results: opportunity precision, useful relationship creation, application-to-screen conversion, interview conversion, offer conversion, time-to-interview, time-to-offer, compensation improvement, career-transition success, promotion outcomes, user time saved, post-hire satisfaction, retention, and long-term career mobility.

## Canonical direction

**Hired AI helps people build stronger careers. Maya is the conversational AI career agent through which they do it.**

The product should keep absorbing useful career functionality into one coherent, evidence-backed relationship until asking Maya is easier and more effective than operating separate job boards, resume tools, application trackers, career coaches, networking tools, and advancement workflows.
