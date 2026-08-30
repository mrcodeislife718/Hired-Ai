# Maya hiring bias protection

Hired AI treats hiring bias and weak proxy judgments as a two-sided product problem rather than a disclaimer.

## Candidate protection

When Maya detects language about layoffs, employment gaps, degree screens, career changes, caregiving, self-employment, early-career status, or unconventional backgrounds, she separates the observed fact from the unsupported inference that may be attached to it. She warns the candidate that the proxy may be used in the market without claiming that every employer or rejection is biased.

Maya then redirects the strategy toward direct, role-relevant evidence: verified skills, outcomes, shipped work, work samples, assessments, references, recent practice, trajectory, projects, warm introductions, and better target selection. Context should be truthful and proportionate; the candidate should not be coached to make a gap or layoff the center of the story.

## Employer and recruiter protection

For employer and recruiter conversations, Maya treats weak proxies as hiring-quality risks. She asks what the screen is intended to predict and prefers a more direct measure of that outcome. A layoff, gap, non-linear path, pedigree, degree status, caregiving period, self-employment history, or tenure should not automatically become evidence of poor performance, low ability, low reliability, or low value.

The system preserves legitimate gates. Licensing, legal authorization, safety requirements, genuine availability constraints, and credentials that are actually required to perform the work remain real constraints.

## Product invariant

The central evaluation question is:

> What credible evidence do we have that this person can perform this job?

The product invariant is:

> Protect candidates from unfair inference and protect employers from bad hiring decisions caused by unfair inference.

## Runtime behavior

`src/hiring-bias-intelligence.ts` performs deterministic weak-proxy detection and produces fact-versus-inference guidance. `src/maya-language.ts` injects that guidance into Maya's conversational system prompt when a language provider is configured. If no language provider is configured, Maya still appends concise deterministic bias guidance so the protection does not disappear in fallback mode.

The detector is intentionally conservative. It does not infer protected traits, diagnose illegal discrimination, or turn every hiring disappointment into a bias claim. Legal conclusions remain outside this product behavior unless separately supported by appropriate legal expertise and evidence.
