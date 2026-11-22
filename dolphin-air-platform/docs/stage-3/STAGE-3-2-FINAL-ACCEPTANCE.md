# Stage 3.2 Final Acceptance

## Decision (2026-11-22): ROLE-SCOPE INVARIANT VERIFIED; AUTHORIZATION ACTIVATION BLOCKED

| Gate | Status | Evidence |
|---|---|---|
| Prisma schema/client | PASS | Prisma 7.10.1 schema validation and client generation passed. |
| Local database target | PASS | `db:health` accepted localhost `dolphin_crm_dev` using `dolphin_crm_dev_app`; no secrets displayed. |
| Identity migrations | PASS | `0001_identity_foundation` and `0002_role_scope_enforcement` are applied; `migrate status` reports up to date. |
| Runtime grants | PASS | Application role remains least-privileged; audit SELECT/INSERT only, migration history private, no schema modifications. |
| Static catalog sync | PASS | Idempotently synchronized and verified 9 roles and 43 permissions, with exact role-permission parity. |
| Role-scope persistence | PASS | Composite role/org FKs and database trigger enforce approved organization type and scope on active assignments. |
| Direct write and lifecycle tests | PASS | Invalid scope, role, organization, membership, user, type and self-assignment writes rejected; status changes revoke active assignments. |
| Concurrency | PASS | Two-connection assignment/revocation race completed with the new assignment revoked after membership revocation. |
| Unit and workspace tests | PASS | API: 29 passed, 0 failed, 1 Firebase emulator test skipped. Lint/typecheck/build passed (10/10, 10/10, 4/4). |
| Database-backed authorization activation | BLOCKED | Existing Firebase/Firestore identity and role APIs remain authoritative; no identity synchronization or end-to-end database authorization service is deployed. |
| Firebase emulator integration | BLOCKED | Firestore emulator artifact is unavailable, so the integration test remains skipped. |

Scope enforcement does not authenticate a caller. The PostgreSQL trigger protects persistence invariants; the NestJS policy checks the existing role delegation and actor organization scope. The current Firestore role assignment API remains unchanged. No production or unrelated database was accessed. Integration fixtures were synthetic and removed after testing.

**Stage 3.2 role-scope security verification is complete for the local database. Stage 3.2 overall remains partially verified because database-backed authorization activation and Firebase emulator integration are not verified.**
