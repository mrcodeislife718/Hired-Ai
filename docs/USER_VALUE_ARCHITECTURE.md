# User Value Architecture

The user-value layer sits above lifecycle continuity and below Maya's conversational rendering.

It does not replace existing career intelligence, evidence, acquisition, relationship, assessment, outcome, billing or authorization systems. It decides which available intervention deserves priority for the current user outcome.

Inputs include audience, objective, lifecycle stage, available interventions, friction, confidence, urgency, reversibility, authorization requirements and value signals. Output is a ranked `UserValuePlan` with one primary intervention.

Maya receives that plan and expresses the action naturally. Deterministic systems still own facts and consequential execution.

The architecture deliberately separates three questions:

- Can Hired AI technically do something?
- Is Hired AI allowed and sufficiently evidenced to do it?
- Is doing it now the highest-value move for the user?

Only when those align should the product execute or recommend the action.
