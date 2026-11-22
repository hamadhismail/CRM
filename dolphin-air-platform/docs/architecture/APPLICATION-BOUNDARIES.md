# Application Boundaries

- `apps/crm`: internal staff CRM interface.
- `apps/portal`: public website, agent portal, and customer portal.
- `apps/api`: central REST API and future business logic owner.
- `apps/worker`: asynchronous tasks; currently idle.
- `packages/*`: shared application-independent UI, types, contracts, utilities, configuration, and templates.
- `database/*`: future persistence schema and migration assets.

Shared packages must not import from applications; avoid dependency cycles. No business ownership is implemented in Stage 1.
