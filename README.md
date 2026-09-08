# Hired AI

**Hired AI is a conversational Career Operating System. Maya is the interface.**

People should be able to manage their career by talking to Maya instead of learning a collection of recruiting tools, resume editors, application trackers, networking dashboards, interview systems, and career-planning workflows.

Maya helps users start, transition, find work, prove capability, prepare applications, build professional relationships, interview, negotiate, advance, improve compensation, and learn from outcomes over time.

> **Maya — Your Conversational Career OS**

## Conversation is the operating surface

Hired AI is not a conventional recruiting product with a chatbot added on top. The architecture can contain many specialized engines, but the customer should experience one continuous relationship.

Users can naturally say:

```text
Maya, help me figure out my best next career move.
Maya, I want to change careers. What actually transfers?
Maya, find roles I can realistically win.
Maya, why am I not getting interviews?
Maya, audit my resume against what I can actually prove.
Maya, update my resume from everything you now know about my career.
Maya, what evidence am I missing?
Maya, prepare me for this interview.
Maya, help me negotiate this offer.
Maya, help me get promoted and earn more.
Maya, what should I do next?
```

Maya uses durable career state, verified evidence, opportunity state, workflow state, outcome history, living career documents, and relevant long-term context under the conversation. She should continue the journey rather than repeatedly restarting it.

## Friendly Maya voice

Maya has both a **friendly conversational voice standard** and an **optional spoken interaction surface**.

Her communication style is warm, plainspoken, observant, practical, candid, encouraging when earned, and profession-aware. She should sound like a capable career friend who understands the system without pretending to be human, manufacturing intimacy, or turning every interaction into motivational language.

The browser interface supports explicit-tap speech input when the browser exposes speech recognition, optional spoken Maya replies through device/browser speech synthesis, independent spoken-reply control, interruption-safe behavior, graceful text-only fallback, and the same career state and truth rules whether the user types or speaks.

The microphone is never activated silently. Voice is optional and is not required to receive the product's core value.

## Conversational onboarding

Onboarding is the first useful Maya conversation, not a long profile form.

A new user can begin with the outcome they want. Maya progressively gathers only information that changes a decision or unlocks useful work: current situation, desired direction, constraints, career history, evidence, preferences, compensation context, and target opportunities.

```text
outcome first
    ↓
use what Maya already knows
    ↓
ask only the next high-value question
    ↓
update understanding + useful career assets
    ↓
build durable career state
    ↓
keep the journey moving
```

Every meaningful onboarding answer should improve Maya's understanding, improve a durable career document, or preferably do both. The user should not have to finish a setup ceremony before receiving value.

## Living career documentation portfolio

Maya does not only learn about the user. She turns that understanding into a **canonical, versioned career documentation portfolio**.

The portfolio can contain:

- **Career Brief** — current direction, goals, constraints, strengths, compensation context, target opportunities, and known unknowns
- **Master Resume** — the canonical resume representation from which targeted variants can be regenerated
- **Target Resumes** — role-specific versions built against real opportunity requirements and evidence
- **Professional Profile** — reusable positioning for professional surfaces
- **Evidence Index** — attributable proof behind material capability claims
- **Accomplishment Bank** — reusable verified achievements plus questions that can uncover missing scope or results
- **Interview Story Bank** — evidence anchors and prompts for building truthful behavioral/technical stories
- **Career Gap Plan** — true hard gates, missing evidence, adjacent capability, and high-value development priorities

Each career document records provenance including candidate identity, Career Twin version, evidence IDs, target opportunity IDs, whether a source resume was supplied, and a source fingerprint. When the underlying career state changes, the document can be regenerated and versioned rather than silently drifting.

The governing rule is:

> **One factual career record, many audience-specific documents. Facts do not fork just because the wording changes.**

If Maya has evidence but has not been given actual employment history, she may create an explicitly incomplete evidence-backed draft. She may not reconstruct plausible employers, titles, dates, scope, credentials, metrics, or outcomes to make the document look finished.

A correction should be made at the underlying fact/evidence layer and then propagated into dependent documents. Conversational memory alone never becomes verified professional evidence.

## Universal career intelligence

Hired AI does **not** assume software or office work is the default. Healthcare, skilled trades, education, retail, hospitality, finance, public service, logistics, manufacturing, creative work, sales, legal, science, technology, independent work, and other careers are first-class contexts.

Maya uses evidence appropriate to the profession, including employment history, licenses, certifications, education, references, assessments, work samples, operational records, publications, awards, portfolios, customer outcomes, volunteer work, projects, completed gigs, or other legitimate proof.

GitHub is useful when relevant; it is not a universal requirement. Mandatory legal or professional requirements remain hard gates. Positioning cannot substitute for a required license, clearance, registration, certification, authorization, or safety qualification.

## Dynamic competitive candidate selection intelligence

Maya treats a serious application as a **role-specific evidence-selection problem**, not merely a resume-writing exercise.

The competitive-selection system is driven dynamically from the current candidate, current evidence, current resume/document state, and actual selected opportunity. It does not contain a production candidate fixture, fixed company, fixed role, or fixed skill list.

For each target opportunity Maya evaluates the candidate from three perspectives:

1. **Hiring manager** — can this person credibly perform the work, own meaningful scope, and deliver useful outcomes?
2. **Senior recruiter** — are the strongest relevant qualifications obvious during a fast human screen?
3. **ATS / candidate-job matching** — are supported role concepts textually discoverable without injecting unsupported keywords?

Each important role requirement is mapped to attributable evidence and classified **Strong, Moderate, Weak, or Missing**.

Maya distinguishes **missing from the resume** from **missing from the candidate**. Authorized proof can come from employment evidence, credentials, assessments, GitHub, portfolios, projects, work samples, references, publications, awards, operational records, or other legitimate sources.

For a target role Maya can produce requirement-to-evidence coverage, hiring-manager/recruiter/ATS assessments, supported keyword omissions, current story versus target story, proof-backed bullet guidance, emphasis and ordering recommendations, five highest-impact changes, role-specific resume guidance, likely selection/rejection reasons, and a competitive shortlist simulation whose interview probability is explicitly an estimate rather than employer truth.

When a job source provides a real applicant count, Maya uses that opportunity-specific signal. Otherwise the simulation uses bounded assumptions and labels them as assumptions.

> **Do not optimize the candidate to look qualified. Discover what the candidate can actually prove, then make the relevant evidence impossible to overlook.**

## Wired through the conversational lifecycle

The competitive-selection and career-documentation systems are not detached report generators.

During resume review, `CareerOperatingSystem.buildPlan()` returns the resume audit, living career documentation portfolio, competitive selection analyses for the strongest live target opportunities, and the highest-value next actions.

The shared Maya role-plan adapter also carries both `competitiveSelection` and `careerDocumentation` into role-specific application-question and interview workflows. The same opportunity, Career Twin, and evidence state therefore feeds positioning, application reasoning, and interview preparation instead of producing separate contradictory stories.

```text
conversation
    ↓
Career Twin + current career record + evidence
    ↓
living career documentation
    ↓
real target opportunity
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
    ↓
updated career state + updated documents
```

## Strongest-defensible candidate advocacy

Maya's job is to present the user as the strongest credible candidate the evidence supports.

She may improve ordering, emphasis, clarity, professional language, transferable framing, adjacent-capability framing, and rhetoric when the underlying evidence supports it.

She may **not** invent employers, titles, dates, credentials, tools, licenses, ownership, scope, production status, metrics, revenue, user counts, outcomes, or experience that did not occur.

The optimization target is:

> **maximize the probability that the right employer correctly recognizes the candidate's maximum defensible value.**

## Career Advantage

Maya optimizes for durable career mobility, not application volume. She can help users enter the workforce, transition careers, diagnose weak funnel stages, decide whether to pursue/develop-first/skip opportunities, close high-value proof gaps, improve interview conversion, negotiate total offers, build promotion cases, improve compensation, and increase long-term career options.

A weak application-to-screen rate should not trigger the same intervention as strong screening conversion followed by weak interviews. Maya diagnoses the failing stage before changing strategy.

## Connected intelligence

Under one conversational surface, Hired AI coordinates:

- **Opportunity Intelligence** — authorized job sources, duplicate prevention, constraints, freshness, ranking, and watches
- **Career Intelligence** — Career Twin, goals, constraints, preferences, compensation, trajectory, capabilities, evidence, uncertainty, and corrections
- **Career Documentation Intelligence** — versioned resume/profile/evidence/accomplishment/story/gap documents built from one factual source
- **Evidence & Positioning Intelligence** — requirement decomposition, proof mapping, hard gates, hidden evidence, objections, strongest-defensible positioning
- **Acquisition Intelligence** — consistent resumes, answers, outreach, proof, follow-up, and interview narratives
- **Relationship Intelligence** — profession-appropriate recruiters, hiring managers, peers, mentors, communities, referrals, founders, customers, and other useful paths
- **Career Development** — smallest high-value proof, credential, assessment, work-sample, relationship, or practice intervention
- **Advancement & Negotiation** — promotion cases, internal mobility, next-level scope, compensation analysis, negotiation, and external leverage
- **User Value Orchestration** — highest-value next move based on outcome progress, effort reduction, trust, time saved, income upside, and strategic compounding
- **Outcome Learning** — applications, screens, interviews, assessments, rejections, offers, compensation, relationships, post-hire satisfaction, advancement, and retention

## Additional product requirements now factored in

The living career system is designed around several failure modes that are easy to miss when building a conversational product:

- **Versioning:** document updates preserve version history instead of silently overwriting meaning.
- **Provenance:** material claims remain traceable to evidence and career-state versions.
- **Corrections:** a corrected fact should flow to dependent documents rather than requiring manual edits everywhere.
- **Staleness:** target-role, evidence, Career Twin, or source-resume changes can make downstream documents stale.
- **Unknowns:** missing information remains visibly unknown instead of being filled with plausible fiction.
- **Target switching:** changing career direction should regenerate relevant positioning rather than corrupt the master record.
- **Cross-surface consistency:** resume, profile, application answers, outreach, and interview stories compile from the same facts.
- **Privacy:** voice and memory do not weaken consent, sourcing, or evidence boundaries.
- **Accessibility:** voice is optional; text remains a first-class complete path.
- **Onboarding interruption:** users can create value progressively rather than losing progress because they did not finish a monolithic setup flow.
- **Evidence discovery before gap declaration:** Maya checks authorized proof sources before concluding that an important capability is absent.
- **Outcome feedback:** later interviews, offers, job performance, satisfaction, compensation, and advancement should improve future career decisions and documentation.

## Governed autonomy

Conversation is the customer interface, not the authority boundary. Deterministic systems retain ownership of durable state, evidence truth, readiness, authorization, billing truth, external-action confirmation, and audit events.

Identity-bearing actions follow:

```text
prepare → request authorization → user approval → execute → verify → audit
```

Maya does not claim that an application, message, calendar action, or other external operation succeeded until the system has the required execution evidence.

## Long-horizon continuity

```text
dream → readiness → proof → access → interview → offer → employment → advancement
```

Long-term conversational memory is selective and source-bound. It can improve continuity, but remembered conversation is not automatically verified professional evidence and cannot satisfy a credential gate by itself.

## Employer and institution value

Hired AI includes employer-side foundations for organizations, role management, candidate-consent controls, sourcing, structured evaluation, hiring collaboration, and post-hire outcomes.

The central employer question remains:

> **What credible evidence do we have that this person can perform this job?**

Training organizations and workforce programs can connect training to proof, readiness, employer access, applications, interviews, placement, retention, and advancement while preserving participant consent.

## Current implementation foundation

The repository includes TypeScript career/acquisition engines, Maya's conversational service and deterministic fallback, friendly Maya voice/support policy, optional browser speech input and spoken replies, guided conversational onboarding, Career Twin and durable outcomes, source-bound long-term memory, universal cross-profession career intelligence, dynamic candidate-selection analysis, canonical career-document generation, requirement-to-evidence mapping, opportunity discovery/scoring/reliability/readiness/watches, evidence-backed application compilation, profession-neutral interview/application-question intelligence, user-value orchestration, proactive next-action logic, employer/mutual-fit foundations, governed external actions, PostgreSQL persistence when configured, Stripe billing/webhook verification, tenant isolation, Node 22/24 CI, and production-integrity/branch-hygiene/portfolio-proof gates.

## Run locally

Requires Node.js 22 or newer.

```bash
npm install
npm run check
npm run serve
```

Open `http://localhost:3000`.

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
4. Every meaningful onboarding answer should improve understanding, a durable career asset, or both.
5. Maintain one canonical factual career record and regenerate audience-specific documents from it.
6. Voice is optional, explicit, and governed by the same truth and authority boundaries as text.
7. Treat every profession and industry as first-class.
8. Optimize for durable career outcomes, not application volume or message volume.
9. Proactively identify the highest-value next move instead of requiring the user to ask the perfect question.
10. Use existing authorized state before asking the user to repeat information.
11. Advocate for the candidate as strongly as the evidence defensibly allows.
12. Never replace a mandatory credential with positioning.
13. Search authorized evidence before declaring a capability missing merely because it is absent from the resume.
14. Compile material claims from attributable evidence and preserve consistency across artifacts.
15. Never fabricate missing career facts merely to complete a document.
16. Diagnose the failing career or hiring stage before changing strategy.
17. Prefer the smallest high-value proof action over generic skill accumulation.
18. Professional relationships are durable career assets, not spam channels.
19. External identity-bearing actions require authorization and verified execution.
20. Important recommendations must be explainable and uncertainty must remain visible.
21. Estimated interview probabilities are estimates, not employer facts.
22. Learn from real outcomes without overfitting sparse samples.
23. Payment may buy capability and service, never better ethics, fabricated fit, or distorted organic ranking.

## Canonical direction

**Hired AI helps people build stronger careers. Maya is the conversational Career Operating System through which they do it.**

The product should keep absorbing useful career functionality into one coherent, evidence-backed relationship until asking or talking to Maya is easier and more effective than operating separate job boards, resume tools, application trackers, career coaches, networking tools, interview tools, recruiting workflows, and advancement systems.
