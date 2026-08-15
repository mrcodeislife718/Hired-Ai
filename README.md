# Hired AI

Hired AI is a governed, evidence-grounded autonomous job acquisition system designed to turn verified engineering evidence into targeted opportunities, human introductions, interviews, and offers.

## Current capabilities

- multi-agent opportunity discovery, qualification, evidence matching, scoring, outreach preparation, application preparation, interview preparation, follow-up, and funnel learning
- explicit Governor approval boundary for identity-bearing actions
- durable state with PostgreSQL when `DATABASE_URL` is configured, otherwise atomic local JSON checkpoints
- GitHub portfolio indexing for repository-backed evidence
- Greenhouse, Lever, and authorized JSON discovery adapters
- salary parsing and annual normalization utilities
- API-key protection for `/api/*`
- bounded retries, circuit breakers, and trace recording
- conservative resume-text ingestion
- due-follow-up calculation
- NYC-oriented command-center dashboard
- deterministic tests and Node 22/24 CI configuration

## Run

```bash
npm install
npm run check
npm run serve
```

Optional environment:

```bash
HIRED_API_KEY=...
DATABASE_URL=postgres://...
GITHUB_OWNER=...
GITHUB_TOKEN=...
GREENHOUSE_BOARDS=...
LEVER_COMPANIES=...
JOB_JSON_FEEDS=...
```

The system intentionally separates preparation, approval, and execution. It is built to maximize quality interviews and offers rather than application volume.

See `docs/ARCHITECTURE.md`, `docs/API.md`, and `docs/OPERATIONS.md`.
