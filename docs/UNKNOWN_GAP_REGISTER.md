# Hired AI / Maya Unknown-Gap Closure Register

## Purpose

Commercial completion means more than implementing known features. Hired AI must repeatedly search for requirements, failure modes, user harms, operational weaknesses, competitive gaps, and revenue leaks that were not explicitly requested in advance.

A gap is not closed until the applicable implementation, test, observability, recovery, and outcome gates are complete.

## Product experience

- [ ] First-run onboarding explains Maya without requiring users to learn a dashboard.
- [ ] Candidate can reach meaningful free value before payment.
- [ ] Employer onboarding reaches a useful role definition before payment pressure.
- [ ] Empty, loading, partial, offline, expired-session, permission-denied, payment-failed, and provider-outage states have intentional UX.
- [ ] Mobile, tablet, laptop, wide desktop and keyboard-only usage are qualified.
- [ ] Major browsers are qualified.
- [ ] Accessibility audit covers keyboard navigation, focus, labels, semantic structure, contrast, reduced motion, screen readers and WCAG-oriented checks.
- [ ] Copy is complete for landing, signup, login, onboarding, errors, billing, privacy, consent, employer workflows, notifications and account deletion.
- [ ] User can always understand what Maya knows, what Maya inferred, what is unknown, and how to correct it.

## Candidate lifecycle

- [ ] Career Twin onboarding and correction flow.
- [ ] Free Resume Studio is usable end-to-end without a subscription.
- [ ] Resume export formats are production-grade and ATS-safe.
- [ ] Saved jobs and comparison workflow.
- [ ] Watch rules with delivery cadence, pause and opt-out.
- [ ] Application tracking and externally confirmed delivery states.
- [ ] Interview practice with scoring and longitudinal improvement.
- [ ] Offer comparison and negotiation workflow.
- [ ] Post-hire 30/90/365-day check-ins.
- [ ] Promotion, internal-mobility, reskilling and next-move workflows.
- [ ] Account export, correction, deletion and retention controls cover all career data.

## Employer lifecycle

- [ ] Organization persistence and RBAC.
- [ ] Employer verification and organization ownership controls.
- [ ] Role intake distinguishes responsibilities, outcomes, blockers, trainable skills and preferences.
- [ ] Job publishing, pause, close, repost and expiration lifecycle.
- [ ] Candidate sourcing is deny-by-default and consent-aware.
- [ ] Candidate search/matching explains evidence, gaps, confidence and unknowns.
- [ ] Screening does not use protected/sensitive traits or unsupported proxies.
- [ ] Hiring team collaboration, notes, stages and audit history.
- [ ] Messaging and interview scheduling use confirmed delivery/status semantics.
- [ ] Employer analytics include funnel quality, quality of hire and regret, not only application volume.
- [ ] ATS/HRIS import/export and integration contracts.
- [ ] Employer billing, seats, sourcing usage, promotion, success-fee attribution and invoicing.

## Marketplace integrity and hiring fairness

- [ ] Paid promotion never modifies organic candidate/job fit ranking.
- [ ] Sponsored inventory is clearly labeled.
- [ ] Consequential candidate recommendations are based on job-relevant evidence.
- [ ] No automated adverse employment decision is made from protected traits or sensitive personal characteristics.
- [ ] Candidate has a correction/appeal path for materially wrong career or evidence state.
- [ ] Employer requirements are checked for likely irrelevant wishlist inflation.
- [ ] Matching is audited for systematic unexplained disparities and proxy leakage.
- [ ] Sensitive data is minimized and excluded from ranking where not legally/job-relevantly justified.
- [ ] Human review boundaries are explicit for consequential hiring decisions.

## Job-market data quality

- [ ] Cross-source canonical job identity.
- [ ] Duplicate/repost detection.
- [ ] Freshness, last-verified-live and application-endpoint validation.
- [ ] Salary provenance, currency, cadence and location normalization.
- [ ] Employer-quality evidence provenance and freshness.
- [ ] Scam, impersonation, fraudulent recruiter and suspicious-job detection.
- [ ] Data-source rate limits, failures, schema drift and terms/compliance are monitored.

## Maya reliability

- [ ] Deterministic/evidence-backed state owns consequential truth.
- [ ] LLM rendering failure always has a safe fallback.
- [ ] Multi-intent planning does not silently drop user goals.
- [ ] FACT / INFERENCE / ESTIMATE / RECOMMENDATION / UNKNOWN semantics are preserved internally.
- [ ] Confidence is calibrated against observed outcomes.
- [ ] Hallucinated material career claims have zero tolerated production target.
- [ ] Tool actions require policy authorization and auditable state transitions.
- [ ] External action success is never claimed before provider confirmation.
- [ ] Prompt injection and untrusted job/resume content are isolated from authority/tool policy.
- [ ] Model/provider outage, timeout and malformed-output behavior is qualified.

## Identity, authentication and account security

- [ ] Email verification.
- [ ] Password reset/account recovery.
- [ ] Session listing and revocation.
- [ ] Credential-stuffing/brute-force protection.
- [ ] MFA/passkey path for high-value employer/admin accounts.
- [ ] CSRF/origin/session-cookie controls are qualified.
- [ ] Secrets are never returned to clients or logs.
- [ ] Security event logging and suspicious-login detection.
- [ ] Employer organization privilege escalation tests.
- [ ] Tenant isolation and cross-account leakage tests have zero tolerance.

## Privacy, legal and data governance

- [ ] Privacy policy and terms match actual data flows.
- [ ] Candidate visibility and employer sourcing consent are understandable and reversible.
- [ ] Data minimization and purpose limitation.
- [ ] Retention schedule per data class.
- [ ] Export/correction/deletion covers primary, derived and cached state.
- [ ] Audit data retention has a documented lawful/business purpose.
- [ ] Third-party subprocessors/data providers are inventoried.
- [ ] Employment/recruiting legal review is required before scaled employer decision automation.
- [ ] Geographic policy gates exist where employment/privacy rules differ.

## Billing and monetization

- [ ] Candidate Free / Career / Pro / Concierge entitlements are server-enforced.
- [ ] Employer subscription, seats, sourcing, workflow, promotion, API/integration and success-fee surfaces are modeled.
- [ ] Organic ranking remains independent of payment.
- [ ] Checkout, webhook, renewal, cancellation, refund, dispute, failed-payment and grace-period flows are tested.
- [ ] Billing idempotency and reconciliation.
- [ ] Usage limits cannot be bypassed by client manipulation.
- [ ] Upgrade/downgrade preserves user data and explains entitlement changes.
- [ ] Revenue analytics separate gross revenue, refunds, payment fees and attributable acquisition channel.

## Notifications and communications

- [ ] Email provider integration.
- [ ] Optional SMS/push architecture where justified.
- [ ] Watch alerts, interview reminders, employer messages and outcome check-ins have preference controls.
- [ ] Unsubscribe/opt-out works immediately where required.
- [ ] Bounce, complaint, spam and delivery failure handling.
- [ ] Notification deduplication, quiet hours and rate controls.
- [ ] No manipulative engagement notifications.

## Observability and operations

- [ ] Request/trace/correlation IDs.
- [ ] Structured logs with PII-safe redaction.
- [ ] Liveness, readiness, dependency health and synthetic user-journey checks.
- [ ] Metrics for latency, error rate, provider failures, job freshness, match confidence, billing and delivery.
- [ ] Alerting with actionable thresholds.
- [ ] Database backup and tested restore.
- [ ] Migration rollback strategy.
- [ ] Disaster recovery runbook and recovery objectives.
- [ ] Provider circuit breakers, bounded retries and dead-letter handling.
- [ ] Load, concurrency, soak and failure-injection qualification.
- [ ] Cost ceilings and runaway-provider-spend protection.

## Growth and acquisition

- [ ] SEO/indexable public surfaces where appropriate.
- [ ] Referral mechanics only after meaningful value events.
- [ ] Resume-to-account, account-to-opportunity, opportunity-to-paid and paid-to-outcome funnels are measured.
- [ ] Employer repeat-hire rate and expansion are measured.
- [ ] Referral-adjusted CAC, payback, retention, LTV and gross margin are measured.
- [ ] Acquisition does not optimize vanity signups at the expense of career outcomes.
- [ ] Marketplace cold-start strategy for both candidate and employer liquidity.

## Support and trust

- [ ] In-product support/contact path.
- [ ] User-visible incident/status communication.
- [ ] Wrong-data correction workflow.
- [ ] Billing support/refund workflow.
- [ ] Abuse/reporting flow for jobs, employers, candidates and messages.
- [ ] Trust-and-safety escalation for scams/impersonation/harassment.
- [ ] Operational admin tools are least-privilege and audited.

## Competitive superiority proof

For each major competitor surface, record:

1. incumbent strength;
2. incumbent weakness;
3. Hired AI implementation;
4. measurable superiority hypothesis;
5. benchmark or user-study method;
6. observed result;
7. regression threshold.

Hired AI does not claim technical superiority until the relevant result is measured.

## Recurring unknown-unknown audit

Before every commercial release ask:

- What could fail at 1 user, 1,000 users and 1,000,000 users?
- What if a provider disappears today?
- What if the model is wrong but sounds certain?
- What if a bad actor deliberately exploits the workflow?
- What if an employer tries to buy or manipulate ranking?
- What if a candidate's data is wrong, stale or maliciously supplied?
- What if Hired AI succeeds too well and a workflow creates unacceptable volume/cost/risk?
- What assumptions have never been independently tested?
- Which user journey still requires tribal knowledge or developer intervention?
- Which metric could look healthy while users are actually receiving worse career outcomes?

Any newly discovered gap enters this register and must be assigned an owner, evidence target and release gate.
