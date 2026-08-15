# HTTP API

The server exposes a small governed control API.

- `GET /health`
- `GET /api/dashboard`
- `GET /api/opportunities`
- `GET /api/opportunities/:id/package`
- `GET /api/audit`
- `POST /api/discover` — run configured ATS/feed adapters
- `POST /api/opportunities` — ingest a normalized job
- `POST /api/opportunities/:id/outreach-request`
- `POST /api/opportunities/:id/application-request`
- `POST /api/opportunities/:id/transition` with `{ "state": "RECRUITER_SCREEN" }`
- `POST /api/opportunities/:id/feedback`
- `POST /api/approvals/:id/approve`
- `POST /api/approvals/:id/execute`

Approval execution currently returns the authorized payload to an integration boundary. External email/application connectors should consume only executed approvals; preparation and approval remain separate capabilities.

## Discovery configuration

`GREENHOUSE_BOARDS=company1,company2`

`LEVER_COMPANIES=company3,company4`

`JOB_JSON_FEEDS=https://authorized.example/jobs.json`

The runtime deliberately avoids undocumented browser automation against job boards. Sources are explicit adapters with provenance and failure isolation.
