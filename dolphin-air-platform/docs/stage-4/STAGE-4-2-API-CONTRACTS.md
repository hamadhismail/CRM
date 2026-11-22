# Stage 4.2 API contracts

`packages/contracts/src/leads.ts` defines typed lead status, priority, service, list summary and cursor page shapes. `GET /api/leads` and `POST /api/leads` are implemented with staff authentication and `leads.read`/`leads.create` permission guards. They additionally require the development-only database identity flag and exactly one verified internal organization context; otherwise they fail closed. List queries require the organization and either creator or assignee membership, with server pagination. Create validates input and writes the lead and event transactionally after locking active membership rows. These endpoints have not passed browser/API runtime acceptance and remain unavailable under default configuration. Edit, archive, restore, notes, assignment and status routes remain unimplemented.

## Assignment, duplicate and conversion contracts — 2026-11-22

- `GET /api/leads/assignees` requires `leads.update`; returns minimal, eligible active internal staff memberships for the trusted active organization only.
- `POST /api/leads/:id/assign` requires `leads.update`; accepts `{ membershipId }`, validates actor and target memberships, account and organization status, role permission, tenant ownership, then transactionally writes the assignment and history.
- `GET /api/leads/:id/assignment-history` requires `leads.read`; exposes bounded assignment history only for a lead visible in the active organization.
- `POST /api/leads/duplicates` requires `leads.read`; checks normalized phone and/or email and returns at most five minimal same-organization leads readable by the actor. `excludeLeadId` is validated against that same scope. Repeat creation remains a separate authorized action; duplicate results are advisory.
- Existing permission catalog is unchanged. There is no `leads.assign` permission; assignment deliberately uses the currently approved `leads.update` guard.
- `LeadConversionRequest` and `isLeadConversionRequest` define CUSTOMER/OPPORTUNITY targets, UUID lead IDs, and bounded idempotency keys. This is a contract only: no conversion endpoint or target tables are implemented in Stage 4.2.13.
