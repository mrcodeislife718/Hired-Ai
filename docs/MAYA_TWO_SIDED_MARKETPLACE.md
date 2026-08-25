# Maya Two-Sided Career Marketplace

## Product objective

Hired-AI should not optimize for application volume, job-posting volume, recruiter message volume, or paid ranking. Maya should optimize for durable successful career matches.

For a job seeker, success means finding work they can perform, that pays appropriately, advances their career, fits their constraints, and—when they want this—gives them a realistic chance of enjoying and finding meaning in the work.

For an employer, success means hiring someone who can perform the role, whose claims are evidence-backed, whose working preferences fit the actual job environment, and who has a reasonable chance of becoming a strong, durable member of the organization.

Maya must never promise happiness. Happiness is not directly knowable or controllable. Maya can instead model the conditions associated with job satisfaction and make uncertainty explicit.

## Candidate experience

Conversation remains the primary control surface.

Examples:

- Find jobs I can realistically win that pay at least $170K.
- I hate being micromanaged. Stop recommending roles like that.
- I want work where I build products, not maintain legacy systems all day.
- I am willing to take slightly less money for a role I will enjoy more.
- Show me the tradeoff between these two offers.
- What path gets me to principal engineer without making me miserable?
- I like my current job. Quietly watch for something substantially better.

Maya converts these into typed career preferences and explicit tradeoffs rather than relying only on chat history.

## Candidate Career Twin

Persistent structured state should include:

- demonstrated capabilities and evidence;
- claimed capabilities awaiting proof;
- compensation floor, target, and acceptable tradeoffs;
- preferred and disliked responsibilities;
- work-mode and location preferences;
- autonomy and management preferences;
- desired pace and team environment;
- industries and missions of interest;
- desired impact;
- growth goals;
- career trajectory;
- role and company history;
- application/interview/offer outcomes;
- relationship history;
- learned preferences from explicit feedback;
- confidence and provenance for every material inference.

Explicit user statements override inferred preferences. Maya must not infer sensitive protected characteristics or use them for employment ranking.

## Opportunity model

An opportunity is more than a job listing. It should include:

- canonical cross-source identity;
- source provenance;
- freshness and live-status evidence;
- compensation;
- work mode and location;
- responsibilities;
- capability requirements with criticality;
- company/team evidence;
- growth signals;
- management and autonomy signals when supported;
- values/mission evidence;
- hiring-process evidence;
- candidate-specific fit;
- candidate-specific fulfillment fit;
- confidence and unknowns.

## Two different scores

Do not collapse everything into one opaque number.

### Role success / readiness

Can the candidate likely perform the work?

Signals include evidence-backed capability coverage, requirement criticality, depth, recency, transferability, operational risk, and interview readiness.

### Fulfillment fit

Does the actual experience of this job appear aligned with what the candidate says they want?

Signals include compensation, work content, growth, values, impact, management, pace, autonomy, work mode, location, commute and explicit dislikes.

A candidate may be highly qualified for a role Maya should still discourage because the role experience conflicts with their stated preferences.

## Employer experience

Employers should also interact conversationally with Maya.

Examples:

- Find three candidates who can actually own this backend system.
- We keep losing hires within a year. What are we mismatching?
- Show me candidates with direct evidence, not keyword-heavy resumes.
- This job description is unrealistic. Help me calibrate it.
- Which requirements are true blockers versus trainable preferences?
- Explain why this candidate is ranked above the others.
- Find candidates who would likely enjoy the actual day-to-day work here.

## Employer Hiring Twin

Each role should maintain structured state for:

- real responsibilities;
- must-have capabilities;
- trainable capabilities;
- compensation range;
- work mode;
- team environment;
- manager expectations;
- autonomy;
- pace;
- growth path;
- mission/impact;
- hiring urgency;
- interview stages;
- historical conversion;
- historical retention and quality signals where lawful and available;
- evidence provenance and unknowns.

Maya should challenge unrealistic job definitions before searching for candidates.

## Employer success model

Employer recommendation must consider at least:

1. role capability / probability of successful execution;
2. strength and provenance of candidate evidence;
3. mutual fulfillment fit;
4. retention-compatible signals;
5. compensation alignment;
6. availability and constraints;
7. candidate consent/interest.

The system must not promise that an employer or employee will be happy. It should optimize measurable conditions that make successful durable matches more likely.

## Monetization architecture

### Job seeker revenue

- Career subscription;
- Pro career-acquisition subscription;
- Concierge/human-review service;
- optional paid verification services;
- future premium career simulations and long-horizon planning where value is demonstrated.

Never hide the best organic opportunity behind a paywall solely to force an upgrade.

### Employer revenue

- employer Talent subscription;
- recruiter/hiring-team seats;
- evidence-backed sourcing;
- attributable success fees where legally and contractually appropriate;
- clearly labeled promoted opportunities;
- verified employer presence / talent brand;
- interview/scheduling/assessment workflow services;
- private talent pools;
- enterprise hiring operations;
- ATS/HRIS integrations;
- premium support and implementation.

### Enterprise / infrastructure revenue

- internal talent mobility;
- workforce skills intelligence;
- career/talent intelligence API;
- evidence and credential verification;
- aggregated labor-market intelligence;
- enterprise integrations and migration;
- audit/governance features;
- private deployments where appropriate.

## Ranking firewall

Money may purchase:

- reach;
- workflow automation;
- seats;
- analytics;
- support;
- integrations;
- verification attempts;
- clearly labeled promotion.

Money may NOT purchase:

- false evidence;
- higher organic readiness;
- higher organic fulfillment fit;
- a fabricated employer-quality score;
- suppression of a better candidate or job without transparent user-controlled criteria.

Organic ranking and paid placement must remain separable and auditable.

## Marketplace flywheel

More candidate outcomes
-> better calibration of fit and career progression
-> better candidate value
-> more candidate trust
-> stronger employer access to qualified interested talent
-> more employer outcomes
-> better role and hiring calibration
-> more employer value
-> more opportunities and hiring participation
-> stronger marketplace.

The flywheel only works if outcome data remains trustworthy. Application spam, stale jobs, bought rankings, fabricated qualifications and opaque decisions poison the system.

## Economic north stars

Candidate-side:

- qualified interviews per active seeker;
- offer rate;
- compensation improvement where desired;
- career progression;
- fulfillment/fit feedback after placement;
- retention where voluntarily observable;
- percentage of recommendations explicitly rated useful;

Employer-side:

- qualified candidates per opening;
- interview-to-hire conversion;
- time to qualified shortlist;
- hiring-manager satisfaction;
- offer acceptance;
- new-hire performance/retention signals where lawful and consented;
- repeat employer hiring through Hired-AI.

Marketplace:

- successful durable matches;
- repeat usage on both sides;
- organic match quality;
- trust incidents;
- stale/duplicate inventory rate;
- revenue per successful outcome without degradation of match quality.

## Required product gates

Before employer launch:

- organization/role accounts and RBAC;
- employer onboarding and verification;
- job/role canonicalization and quality checks;
- candidate consent and visibility controls;
- structured hiring-role model;
- two-sided matching explanations;
- anti-discrimination review and prohibited-feature controls;
- auditability;
- employer billing/entitlements;
- promoted-job labeling and ranking firewall tests;
- communication consent and rate limits;
- ATS/HRIS connector boundary with confirmed delivery semantics;
- reporting, export and deletion;
- abuse/fraud/reporting workflows;
- end-to-end tests from role creation to accepted hire outcome.

## Permanent Maya law

Maya's job is not to maximize clicks, applications or recruiter activity.

Maya's job is to help each side make a better career or hiring decision from evidence, preferences, outcomes and explicit uncertainty—then learn from what actually happened.
