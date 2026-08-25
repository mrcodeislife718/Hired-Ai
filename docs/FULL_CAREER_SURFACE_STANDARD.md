# Maya Full Career Surface Standard

## Objective

Hired-AI must be a well-rounded career and hiring operating system rather than a job board with a conversational wrapper.

The baseline competitive set includes the surfaces users expect from major employment platforms: profile/preferences, job discovery, saved jobs, alerts, resumes, applications, company/pay research, messaging, interview preparation, negotiation support, employer job posting, screening, sourcing, candidate matching, hiring dashboards, interview coordination, employer branding and integrations.

Maya must preserve useful incumbent strengths while exceeding them through evidence, reliability, mutual fit, professional-presence intelligence, career continuity and outcome learning.

## Candidate surfaces

1. Career profile and preferences
2. Conversational and filtered job search
3. Job alerts/watch conditions
4. Saved jobs and comparison set
5. Application tracking
6. Free and paid Resume Studio
7. Cover letters and application communication
8. Company research
9. Salary and total-compensation intelligence
10. Career exploration and transition planning
11. Candidate/employer messaging
12. Interview preparation and iterative practice
13. Offer comparison and negotiation
14. GitHub/technical-portfolio audit and organization
15. LinkedIn/professional-social positioning
16. Professional networking and relationship graph
17. Career-development/readiness plans
18. Post-hire check-ins, promotion and next-move planning
19. Longitudinal career outcomes and Regret Rate

## Employer surfaces

1. Job/role intake and description calibration
2. Free/paid job publishing policy where commercially appropriate
3. Clearly labeled promotion/sponsored reach
4. Candidate matching
5. Resume/evidence search
6. Proactive sourcing and invitations
7. Screener questions and qualification
8. Employer dashboard
9. Candidate stages/statuses
10. Messaging
11. Interview scheduling/coordination
12. Shared hiring-team collaboration
13. Employer profile/brand/culture/compensation evidence
14. Hiring analytics and funnel learning
15. ATS/HRIS/API integrations
16. Internal mobility and reskilling
17. 30/90/365-day hiring outcome follow-up
18. Employer Regret Rate and quality-of-hire learning

## Maya-only superiority surfaces

### Career Twin
Persistent structured career state with provenance and confidence rather than chat history as the source of truth.

### Evidence Graph
Requirements map to demonstrated capability, adjacent capability, work samples, repositories, credentials and outcomes. Keyword similarity is not sufficient.

### GitHub Career Intelligence
Maya should inspect organization, pinned work, descriptions, README quality, demos, tests, CI, evidence strength and recruiter readability, then help the user make the strongest proof easy to understand.

### Social Career Intelligence
Maya should align professional identity, proof, featured work and content with the people and roles the user actually wants. No fake engagement or artificial authority.

### Relationship Intelligence
Track recruiters, hiring managers, future peers, technical leaders, founders, mentors, communities and warm paths. Optimize for useful professional relationships, not connection count.

### Mutual Fit
The candidate evaluates the employer as seriously as the employer evaluates the candidate. Compensation, work content, growth, values, impact, management, pace, autonomy, location and risk remain visible.

### Reliability Layer
Canonicalize syndicated postings, reject stale inventory, preserve source freshness/confidence, expose unknowns and never claim external execution without confirmation.

### Interview Simulator
Support recruiter, behavioral, technical, role-simulation, system-design and candidate-question rounds. Score answer accuracy, evidence, clarity, depth, judgment, tradeoffs, relevance and truthful handling of unknowns.

### Offer Intelligence
Compare base, bonus, equity, sign-on, benefits, flexibility, title/scope, growth and fulfillment. Build BATNA and negotiation strategy without fabricated competing offers or market claims.

### Outcome Learning
Track application -> interview -> offer -> acceptance -> 30 days -> 90 days -> one year -> promotion/departure. Learn from satisfaction, compensation delta, growth alignment and whether both sides would choose the match again.

## Implemented durable-state and employer-foundation tranche

- Career Twin can now be restored from durable account state while preserving provenance constraints.
- Career Outcome Ledger can now be restored from persisted longitudinal events.
- Saved opportunities and job-watch rules are included in the runtime persistence snapshot.
- Watch rules deterministically evaluate title, location, work mode, salary and fit thresholds and do not match rejected opportunities.
- Employer organizations now have role-based access controls for owners, admins, recruiters, hiring managers and viewers.
- Employer role intake separates real responsibilities, must-haves, trainable requirements, preferred requirements, team context and measurable success outcomes.
- Candidate sourcing is deny-by-default and requires explicit visibility/organization consent.
- External delivery now has an explicit state machine: prepared -> approved -> dispatched -> provider-acknowledged -> verified-received. Dispatch alone is never treated as successful receipt.

## Permanent ranking law

Employer payment may purchase labeled reach, workflow, analytics, service, seats or integrations. It may never purchase a better organic candidate/opportunity fit score.

## Free-user law

Free users receive the same baseline truthfulness, respect, privacy and quality standard. Paid access buys additional capability, depth, convenience, automation, premium presentation and service.

## Completion gates

A surface is not complete because a type or helper exists. Each surface progresses through:

1. Domain contract
2. Deterministic engine
3. Persistence
4. API
5. Maya conversational routing
6. UI
7. Authorization/privacy
8. Tests
9. Observability
10. Production verification
11. Outcome measurement

No surface should be labeled production-complete until all applicable gates pass.

## Remaining production closure

- expose saved jobs, watches, Career Twin edits and outcome check-ins through authenticated production API/UI
- add real notification delivery for watch matches with user-controlled cadence and opt-out
- wire free Resume Studio as a true no-subscription acquisition entry flow
- connect salary and employer-quality data sources with provenance and freshness
- persist employer organizations, jobs, members and consent in production storage
- expose employer organizations, role intake, posting, screening, sourcing and hiring dashboards through authenticated workflows
- integrate the delivery ledger with real messaging providers and independently confirmed delivery states
- add interview scheduling/calendar connectors and ATS/HRIS integrations
- finish distributed observability, backup/restore drills and provider-failure qualification
