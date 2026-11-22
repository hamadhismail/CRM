# Stage 3.2 Database Foundation

## Status: ROLE-SCOPE ENFORCEMENT VERIFIED / AUTHORIZATION ACTIVATION BLOCKED

### Existing identity contracts

- Firebase authentication, Firestore profiles/sessions, static permission registry, and NestJS authorization remain authoritative and unchanged.
- Prisma stores application identity and access relationships; no database-backed authorization was activated.
- Identity models: User, Organization, OrganizationMembership, Role, Permission, RolePermission, UserRole, Department, Branch, DepartmentMembership, BranchMembership, CustomerIdentity, AuditEvent.

### Schema and security design

- Composite foreign keys bind role, department, and branch membership relationships to the same organization.
- `0002_role_scope_enforcement` binds each known role to its approved scope and organization type. `UserRole` carries matching organization type and role scope through composite foreign keys.
- A PostgreSQL trigger rejects active assignments for inactive organizations, memberships, or users; mismatched user types; self-assignment; customer roles; and invalid role/organization scope. Lifecycle triggers revoke assignments when the related membership or organization is disabled or the user is disabled/retagged.
- NestJS role-scope policy checks the existing static role delegation rules, organization context, self-assignment and exact permission-catalog parity. The current Firestore role APIs remain the live authorization authority.
- Unique Firebase UID/email, membership, role/permission keys and audit indexes are present.
- Cross-field checks cover normalized email and disabled/revoked/verified lifecycle timestamps.
- Role bindings are deliberately limited to the existing static roles: Super Admin and internal staff roles are internal-only; B2B Agent is agency-only; Customer is not assignable through `UserRole`. No permission keys or role privileges were added.

### Migration and runtime integration (2026-11-22)

- Prisma 7.10.1 schema validation and client generation pass.
- Existing `0001_identity_foundation` migration applied to loopback `dolphin_crm_dev` by `dolphin_crm_dev_migrator`; migration status is up to date.
- Post-migration grants applied: app role receives explicit CRUD on listed identity tables, SELECT/INSERT on audit events only, no access to `_prisma_migrations`, and no schema/database CREATE. Future migrator-created objects have no app/PUBLIC access by default.
- Verified 13 identity tables, 16 foreign keys, 15 unique indexes, 5 check constraints and 49 indexes; no sequences.
- Health check and built NestJS PrismaService verified the runtime app role and local target.
- Synthetic database tests passed for uniqueness, duplicate membership, cross-organization composite FK rejection, audit append-only privileges and rollback.
- Role catalog synchronization completed idempotently: 9 existing static roles and 43 existing permissions were verified in PostgreSQL, with exact role-permission parity and no privilege additions.
- Role-scope unit and PostgreSQL integration tests passed. They cover valid internal and B2B assignments, cross-scope/direct SQL rejection, inactive organization/user/membership rejection, self-assignment denial, lifecycle revocation, catalog parity and an assignment-versus-membership-revocation concurrency race. Fixtures were removed after the test.
- Workspace: lint 10/10, typecheck 10/10, build 4/4. API tests: 19 passed, 0 failed, 1 Firebase emulator test skipped. Successful tests used a temporary process-only shim for the known Windows `os.userInfo()` ENOMEM issue; shim removed afterward.

### Remaining Stage 3 blockers

- Database-backed authorization remains disabled. Existing staff identity and role assignment still come from Firebase/Firestore; database identity synchronization and end-to-end API authorization parity are not implemented or verified. The new database policy and trigger enforce scope at the database mutation boundary but are not a replacement identity source.
- Firestore emulator integration remains skipped; other identity runtime gaps are tracked in the Stage 3 final acceptance report.

No production or other databases were accessed. Synthetic test rows were transaction-scoped and rolled back.
