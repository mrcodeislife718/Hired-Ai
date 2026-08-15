# Hired AI operations

## Persistence
If `DATABASE_URL` is present, Hired AI uses PostgreSQL and creates a durable `hired_state` JSONB row. Without it, state is atomically checkpointed to `.data/hired-state.json` (override with `HIRED_STATE_FILE`).

## Portfolio indexing
`GitHubPortfolioIndexer` uses the documented GitHub REST API, repository READMEs, descriptions, and primary languages to create repository-backed evidence. Set `GITHUB_TOKEN` for private repository access. Evidence retains provenance and never turns an adjacent capability into direct experience.

## Reliability and observability
External calls can use bounded exponential retry and circuit breakers. `TraceRecorder` creates trace/span identifiers with durations and error outcomes. Runtime checkpoints are configurable with `HIRED_CHECKPOINT_MS`.

## Model boundary
Model providers implement `ModelProvider.completeJson`. Structured responses must pass explicit validation before affecting decisions. Deterministic qualification, scoring, governance, and state transitions remain model-independent.

## Authentication
Set `HIRED_API_KEY` to require `Authorization: Bearer ...` for `/api/*` endpoints.

## Resume ingestion
The first ingestion layer handles UTF-8 text exports and extracts a conservative known-skill surface, emails, and URLs. PDF/DOCX extraction should feed trusted extracted text into the same parser.
