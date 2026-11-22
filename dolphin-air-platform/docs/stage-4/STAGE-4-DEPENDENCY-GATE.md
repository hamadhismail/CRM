# Stage 4 Dependency Gate

## Decision: BLOCKED — do not implement database-dependent features

### Stage 3 acceptance

The current Stage 3 acceptance report says **PARTIALLY VERIFIED — NOT ACCEPTED**. Firebase Auth Emulator started locally, but Firestore artifact access failed; the Auth + Firestore integration test remains skipped. PostgreSQL service availability does not establish authorized database access.

### Dependency checks performed

- PostgreSQL 17.11 Windows service: running.
- `127.0.0.1:5432`: reachable.
- Current process environment: no `DATABASE_URL`, `PGHOST`, `PGPORT`, `PGUSER`, or `PGPASSWORD` variable names present.
- Prior read-only local connection attempt: failed with `fe_sendauth: no password supplied`.
- Prisma schema: datasource and generated-client declarations only; no identity models or migrations.
- Firebase Auth: local Auth Emulator startup was verified for `dolphin-air-local`; Firestore Emulator remains blocked by access to the official artifact source.
- API integration: Firebase token verification, `StaffAuthGuard`, `PermissionsGuard`, static role/permission policy, and a profile/claim organization-scope service exist. They do not provide verified database-backed identity, durable organization membership, or Stage 4 record ownership.

No credentials were guessed/reset. No database was queried, created, or modified. No production system was contacted.

### Identity and ownership assessment

The current principal includes a role and `organizationIds`; the organization scope service checks that list. This is a source-level policy boundary, not a verified durable organization-membership model. No approval/runtime evidence establishes how Stage 4 records must be owned (branch vs agency vs customer) or how assignments interact with organization scope. Stage 4 must not assume a tenant model or trust client-supplied organization identifiers.

### Safe work boundary

Until the gate clears, do not add Prisma models/migrations, database repositories, dashboard aggregates, lead/customer CRUD, conversions, record ownership, or UI that implies live data. Do not relax auth guards, create a second identity system, or substitute fixtures for operational data. Source review and this gate documentation are the only changes made for this request.

### Required inputs to resume

1. An authorized secret-delivery method for an isolated development database, with credentials scoped to `dolphin_crm_dev`; do not paste credentials into documentation.
2. Successful connection validation and authorization to create/use that isolated database.
3. Firestore emulator artifact availability to complete Stage 3 integration verification.
4. Approved identity-to-organization and CRM record ownership/assignment rules.
5. Successful Stage 3 runtime authentication/authorization verification before Stage 4 endpoints are considered usable.
