# Hired-AI API

## Existing production routes

### Account and billing
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/password`
- `GET /api/me`
- `PATCH /api/me/profile`
- `GET /api/me/export`
- `DELETE /api/me`
- `GET /api/plans`
- `POST /api/billing/checkout`
- `POST /api/billing/portal`
- `POST /api/stripe/webhook`

### Maya and career
- `POST /api/maya/chat`
- `GET /api/maya/history`
- `DELETE /api/maya/history`
- `GET /api/career/status`
- `GET /api/opportunities`
- `POST /api/discover`
- `POST /api/github/index`
- `POST /api/opportunities`
- `GET /api/opportunities/:id/package`
- `POST /api/opportunities/:id/application-request`
- `POST /api/opportunities/:id/outreach-request`
- `POST /api/opportunities/:id/transition`
- `POST /api/opportunities/:id/feedback`
- `POST /api/approvals/:id/approve`
- `POST /api/approvals/:id/execute`

The execute endpoint releases an authorized payload to the connector boundary. It does not claim that an external send occurred.

## Next authenticated API tranche

The durable engines now exist for the following surfaces. These routes remain implementation gates before the surfaces are called production-complete:

### Career Twin
- `GET /api/career/twin`
- `PATCH /api/career/twin/:field`
- `POST /api/career/twin/facts`

### Longitudinal outcomes
- `GET /api/career/outcomes`
- `POST /api/career/outcomes`
- `GET /api/career/outcomes/summary`

### Saved opportunities and watches
- `GET /api/saved-opportunities`
- `POST /api/opportunities/:id/save`
- `DELETE /api/opportunities/:id/save`
- `GET /api/opportunity-watches`
- `POST /api/opportunity-watches`
- `DELETE /api/opportunity-watches/:id`
- `GET /api/opportunity-watches/matches`

### Employer organizations and sourcing
- `POST /api/employer/organizations`
- `GET /api/employer/organizations/:id`
- `POST /api/employer/organizations/:id/members`
- `GET /api/employer/organizations/:id/jobs`
- `POST /api/employer/organizations/:id/jobs`
- `PATCH /api/candidate/sourcing-consent`
- `GET /api/candidate/sourcing-consent`

### Delivery verification
- `GET /api/deliveries/:actionId`
- provider callback/webhook routes must transition delivery state from dispatched to provider-acknowledged or verified-received only when provider evidence exists

## API laws

- account data is tenant-isolated
- consequential writes require authentication and authorization
- application/outreach execution remains explicit-approval gated
- external dispatch is not equivalent to confirmed receipt
- employer sourcing is deny-by-default until candidate consent permits visibility
- paid promotion cannot alter organic fit scores
- unknowns and source freshness remain visible in consequential recommendations
