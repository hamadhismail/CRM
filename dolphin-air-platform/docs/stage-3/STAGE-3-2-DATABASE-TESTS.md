# Stage 3.2 Database Tests

## Results (2026-11-22): local PostgreSQL role-scope integration passed

| Test / validation | Result | Evidence |
|---|---|---|
| Prisma schema validation / client generation | PASS | Prisma 7.10.1 commands succeeded |
| Migration deployment | PASS | `0001_identity_foundation` and `0002_role_scope_enforcement` applied; migrate status up to date |
| PostgreSQL structure | PASS | 13 identity tables, 16 FKs, 15 unique indexes, 5 checks, 49 indexes |
| Runtime target and grants | PASS | Expected local app role; no schema/database CREATE or migrator membership; explicit table grants verified |
| Migration history access | PASS | Runtime app role cannot SELECT or INSERT `_prisma_migrations` |
| Unique UID / membership | PASS | Synthetic duplicate UID and membership rejected by PostgreSQL |
| Cross-organization assignment | PASS | Composite membership FK rejected cross-organization role assignment |
| Audit append-only | PASS | SELECT/INSERT allowed; UPDATE/DELETE/TRUNCATE rejected |
| Transaction rollback | PASS | Synthetic users, organizations, memberships, role and audit row fully rolled back |
| Prisma/NestJS runtime | PASS | Built PrismaService initialized and queried `dolphin_crm_dev` using app role |
| Committed persistence | PASS | Synthetic user and audit record remained visible from a new connection after commit, then migrator cleanup was verified |
| Future object grants | PASS | No app/PUBLIC default table or sequence privileges for migrator-created objects |
| Static role and permission synchronization | PASS | 9 system roles and 43 static permissions synchronized and then exactly compared; no extra permissions allowed |
| Role scope: valid internal/B2B assignments | PASS | Internal `sales` and agency `b2b_agent` rows accepted under their respective organizations |
| Role scope: direct SQL violations | PASS | Cross-organization/type mismatches, internal `admin` on an agency, `b2b_agent` internally, Customer `UserRole`, inactive organization, disabled user, revoked membership and self-assignment were rejected |
| Assignment revocation lifecycle | PASS | Existing assignments became REVOKED when organization, membership or user was deactivated |
| Concurrent assignment and membership revocation | PASS | Second connection waited on the membership lock; after assignment commit the revocation completed and the assignment ended REVOKED |
| Role-scope policy unit tests | PASS | Existing static delegation and organization context, self-assignment, user type and catalog parity are checked fail-closed |
| Firebase emulator integration | SKIPPED | Existing Firestore emulator limitation |

Workspace validation: Prisma validate/generate PASS; lint 10/10; typecheck 10/10; build 4/4. Tests: 19 passed, 0 failed, 1 skipped. Plain `pnpm.cmd test` hits Windows `uv_os_get_passwd returned ENOMEM` before test startup; rerun passed with a temporary process-only shim, which was removed.

Database-backed authorization remains disabled. Scope enforcement and static catalog parity now pass locally, but the platform still uses Firebase/Firestore staff profiles and role assignments. No approved identity synchronization or end-to-end database-backed authorization API has been activated and verified. Firestore emulator integration also remains skipped.
