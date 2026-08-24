# Hired AI HTTP API

The HTTP API supports the conversational **AI Career Agent** and its governed career systems. It is an implementation surface, not the customer's primary interface.

## Conversation

- `POST /api/chat` — conversational orchestration for opportunity, qualification, evidence, relationships, applications, interviews, follow-up, and career-status requests

## Opportunity Intelligence

- `GET /api/opportunities`
- `POST /api/discover` — run configured authorized source adapters
- `POST /api/opportunities` — ingest a normalized opportunity
- `GET /api/opportunities/:id/package`

## Acquisition and governed actions

- `POST /api/opportunities/:id/outreach-request`
- `POST /api/opportunities/:id/application-request`
- `POST /api/opportunities/:id/transition`
- `POST /api/opportunities/:id/feedback`
- `POST /api/approvals/:id/approve`
- `POST /api/approvals/:id/execute`

Approval execution currently returns the authorized payload to an integration boundary. External communication/application connectors should consume only executed approvals; preparation and authorization remain separate capabilities.

## Evidence and career context

- `POST /api/portfolio/index`
- `GET /api/followups`
- `GET /api/audit`
- `GET /api/traces`
- `GET /health`

Additional APIs for Career Intelligence, Relationship Intelligence, Career Development, and Outcome Learning should evolve behind stable domain contracts rather than becoming separate products.

## Discovery configuration

```text
GREENHOUSE_BOARDS=company1,company2
LEVER_COMPANIES=company3,company4
JOB_JSON_FEEDS=https://authorized.example/jobs.json
```

The runtime deliberately avoids undocumented browser automation against job boards. Sources are explicit adapters with provenance and failure isolation.

## API doctrine

The customer should not need to understand or manually operate these endpoints. The conversational career agent coordinates them in response to natural-language goals while the deterministic system preserves authorization, evidence, state, and audit boundaries.
