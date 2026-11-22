# Stage 3.2 Security Report

## PostgreSQL privilege review (2026-11-22)

- Only loopback `dolphin_crm_dev` was modified. The reviewed identity migration and runtime grant script were applied; synthetic data tests ran in a transaction and were rolled back.
- The migrator has the local database-connect/schema-create privileges needed for migration work and is not superuser, createdb, createrole, replication, or RLS-bypass. The runtime role cannot create schema or inherit the migrator role.
- `identity-runtime-grants.sql` was applied after migration. It grants CRUD only on explicit identity tables, SELECT/INSERT on audit events, keeps `_prisma_migrations` private, and removes broad runtime/PUBLIC table and sequence privileges in the isolated target.
- No sequences exist in the current UUID-based schema. Future sequence-backed IDs require explicit reviewed USAGE/SELECT grants. Future migrator-created objects receive no runtime grants by default.
- Runtime table grants and audit append-only restrictions were verified. Firebase/static authorization remains authoritative; database-backed authorization is not active until identity synchronization and end-to-end authorization are implemented and verified.

## Implemented in the new platform

- Firebase Authentication is the credential provider; CRM email/password and Google sign-in now use the Firebase client SDK. The API no longer accepts browser passwords or mints a second password identity.
- API verifies signed Firebase ID tokens with revocation checking and validates verified email, supported identity provider, and a Firestore user record keyed by Firebase UID.
- User role, active status, and organization memberships are loaded server-side. Missing/disabled/unknown role records fail closed. Browser role/permission values are not authorization inputs.
- Central role permissions are explicit. Super Admin is not a wildcard; its declared identity and organization capabilities are enumerated. Other roles receive least-privilege sets. Business modules not implemented in this stage have no API endpoints to bypass.
- Backend `PermissionsGuard` and `RolesGuard` enforce route metadata. User list and mutations are permission-guarded, organization-scoped, DTO-validated, and role assignment prevents Admin self-promotion and Super Admin assignment by Admin.
- API uses global `ValidationPipe` with whitelist, transform, and rejection of unknown fields; a centralized exception filter returns sanitized errors.
- Organization access requires explicit membership. Customer API session guard requires a hashed `csess_` bearer with active, unexpired Firestore association. Query-string credentials are rejected.
- Emulator seeding requires local project and loopback-only emulators, explicit synthetic user JSON, `.test` emails, and test-only passwords; it refuses conflicting stored records.

## Not verified or incomplete

- Current workspace lint/typecheck/build passed. API tests passed 29 with 1 Firebase emulator integration skipped. Local PostgreSQL persistence and grant tests passed; no production security claim is made.
- Google OAuth provider configuration is not set up for emulator use.
- New account invitations and Firebase user provisioning are unavailable in the admin UI/API. Synthetic development seed is available, not executed.
- Customer sign-in UI is intentionally unavailable. No OTP provider is configured; no customer session issuance or complete customer-portal route protection is enabled.
- Organization membership provisioning/management is absent. Access remains fail-closed when users lack explicit `organizationIds`.
- PostgreSQL identity data and grants are deployed locally. Role-scope validity is now enforced and tested, but database-backed authorization remains disabled until identity synchronization and API authorization are implemented and verified.
- Firebase ID token `auth_time` remains valid according to Firebase token lifetime; the 30-minute client inactivity timeout is not a server-side idle-session timer. Direct API calls with an otherwise valid token may remain possible until token expiry/revocation. A backend idle-session mechanism is required before production.
- Root validation rejects unknown DTO fields, but some identity inputs are validated inside services rather than through a complete documented request schema; add HTTP-level validation tests after package install.
- API throttling is delegated to Firebase Auth for credential attempts; custom backend per-IP rate limits were removed with the password proxy. Configure edge/API rate limiting before public deployment.

No production credentials or hard-coded administrator accounts were created. The old CRM was not inspected or used for this Stage 3.2 work.
## Role-scope security update (2026-11-22)

## Status

Role-scope enforcement is implemented and verified against the isolated local `dolphin_crm_dev` database. Database-backed authorization remains **disabled**.

## Enforcement

- The existing static permission registry remains authoritative; exact database role-permission parity was verified for 9 roles and 43 permissions.
- Approved bindings are unchanged: internal roles can only be bound to internal organizations; `b2b_agent` can only be bound to B2B agencies; `customer` is not a `UserRole` assignment.
- Prisma schema and migration `0002_role_scope_enforcement` bind assignments to the organization type and role scope through composite foreign keys. Database checks reject inconsistent role definitions.
- A PostgreSQL mutation trigger rejects active assignments with inactive organization/membership/user, wrong user type, self-assignment, customer role, or wrong organization/role scope. Lifecycle triggers revoke assignments on membership/org revocation or user disable/type change.
- The NestJS policy additionally checks the current static delegation authority, actor organization context, self-assignment and permission parity. Existing Firebase/Firestore role assignment APIs were left intact; the database policy is not wired as a replacement authority.
- Tests cover valid assignments, direct SQL violations, inactive/revoked state, role delegation, account/tenant boundaries, lifecycle revocation and an actual two-connection revocation race.

## Verification outcome

- Migration status: both migrations applied to the isolated localhost development database and up to date.
- Health check: passed with the restricted application role.
- Role catalog sync: passed; 9 roles and 43 permissions matched the approved static registry.
- Role-scope unit and database tests: passed; synthetic rows cleaned up.
- Workspace lint, typecheck and build: passed. API test suite: 29 passed, 0 failed, 1 Firebase emulator test skipped (full test run used the temporary process-only Windows `os.userInfo()` shim; it was removed afterward).

## Remaining findings

- Do not activate database-backed authorization until identity/profile/membership synchronization and the database authorization API are implemented and end-to-end verified against Firebase identities.
- Firestore emulator integration remains skipped because the emulator dependency is unavailable in the local environment.
- PostgreSQL trigger enforcement constrains assignment scope and lifecycle but cannot independently authenticate a caller. API callers must continue to be authenticated and authorized by NestJS.

