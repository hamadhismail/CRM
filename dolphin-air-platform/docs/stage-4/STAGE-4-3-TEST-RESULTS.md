# Stage 4.3 — Test Results

## Local integration environment

- PostgreSQL target: local `dolphin_crm_dev`; migration status 5/5 up to date; runtime health passed.
- Firebase: existing Auth Emulator on `127.0.0.1:9099`, project `dolphin-air-local`; no production Firebase. Firestore was not required for the database identity test path.
- API: NestJS child process used the runtime database role and had database identity enabled only for the E2E process.
- Browser: Microsoft Edge through Playwright; Firebase authentication and Customer/Lead APIs were real, not mocked.

## Results

- CRM component tests: **23 passed, 0 failed** (3 test files; synthetic/mock API fixtures).
- Opt-in API/Auth Emulator/PostgreSQL suite: **38 passed, 0 failed, 1 skipped**. The skipped case requires the unavailable Firestore Emulator. The Auth-only Emulator test executed and passed.
- Playwright Edge: **6 passed, 0 failed, 0 skipped**. Covered multi-org sign-in/selection/switching/refresh, Lead-to-Customer conversion, customer create/edit/contact/directory, Admin archive/restore with persisted activity, no-membership/unknown/disabled identities, missing/forged authentication, and role-denied access.
- Database fixture cleanup: **0** synthetic Stage 3.3.4 identities, organizations, Leads, customers, or contacts remained. Auth Emulator synthetic users remaining: **0**. API/CRM E2E listeners on ports 3001/5174: **0** after execution.
- Prisma validation, client generation, database health, and migration status passed.
- Workspace lint: 10/10 tasks passed. Typecheck: 10/10 tasks passed. Build: 4/4 applications passed.
- The ordinary API test invocation fails before discovery in this environment with Node 24 `uv_os_get_passwd ENOMEM` inside `tsx`. A temporary process-only `NODE_OPTIONS --require` shim allowed the tests to execute; the shim was deleted after each run and no application code was patched for it.
- Root `pnpm test` was also run with that temporary shim. API default tests: 35 passed, 0 failed, 3 skipped; CRM: 23 passed. The three API skips are Firestore/Auth-emulator opt-in and authenticated database integration cases when opt-in environment variables are absent; the Auth-only/PostgreSQL opt-in run above provides separate live evidence.

No production service, production database, or production identity provider was contacted.
