# Hired AI

An autonomous job acquisition agent that turns verified engineering evidence into targeted opportunities, human introductions, interviews, and offers.

Hired AI is designed as a governed, evidence-grounded job-search operating system. It discovers opportunities, filters and scores them, matches requirements to verified portfolio evidence, prepares truthful application/outreach packages, tracks the hiring funnel, learns from outcomes, and requires explicit approval before any external submission or identity-bearing communication.

## Core workflow

`DISCOVERED -> QUALIFIED -> CONTACTED -> APPLIED -> RECRUITER_SCREEN -> TECHNICAL -> ONSITE -> OFFER | REJECTED`

## Architecture

- Scout Agent: opportunity discovery and normalization
- Qualification Agent: hard constraints, fit analysis, and opportunity scoring
- Evidence Agent: verified skill/project evidence graph
- Company Intelligence Agent: company/team/context research
- Recruiter Agent: legitimate human-path discovery
- Resume Agent: truthful job-specific resume tailoring
- Outreach Agent: personalized outreach drafts
- Application Agent: application package assembly
- Follow-Up Agent: deterministic follow-up scheduling
- Interview Agent: role-specific preparation plans
- Career Strategist: funnel analytics and learning
- Governor: approval, authority, safety, deduplication, and audit enforcement

## 8-node operating model

Input -> Process -> Output -> Feedback -> Incentives -> Bottlenecks -> Dependencies -> Failure Points

## Safety model

Hired AI optimizes for quality interviews and offers, not application volume. It does not fabricate qualifications, auto-submit applications, or send messages under the candidate's identity without explicit approval.

## Status

Initial production-oriented implementation in progress.
