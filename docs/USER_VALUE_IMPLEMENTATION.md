# User Value Implementation Map

This implementation connects product intent to runtime behavior.

- `src/user-value-orchestrator.ts` ranks candidate, employer and institution interventions by expected user value while accounting for friction, confidence, urgency, reversibility and authorization.
- `src/gig-user-value.ts` supplies gig-worker interventions for income, paid utilization, repeat work, portable proof, platform concentration and career/business transitions.
- `src/career-success-continuity.ts` embeds a `UserValuePlan` into every continuity plan and promotes the highest-value intervention into the next-action sequence.
- `src/maya-language.ts` receives the user-value plan at runtime and tells Maya to act on it without exposing internal scoring machinery.
- `src/commercial-outcome-proof.ts` retains verified outcome learning and removes comparator/public-superiority qualification machinery.
- `test/user-value-orchestrator.test.ts`, `test/career-user-value-continuity.test.ts` and the updated outcome tests qualify the behavior.

The system still preserves bounded authority, verified evidence, hard professional gates, user consent, deterministic truth and durable career continuity.
