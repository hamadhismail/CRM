# Stage 4.2 test results

- `pnpm.cmd db:health`: passed for isolated loopback `dolphin_crm_dev`, identity schema present, runtime role verified.
- `pnpm.cmd prisma:validate`: passed.
- `pnpm.cmd prisma:generate`: passed with Prisma Client 7.10.1.
- `pnpm.cmd lint`: passed, 10/10 tasks.
- `pnpm.cmd typecheck`: passed, 10/10 tasks.
- `pnpm.cmd build`: passed, 4/4 application tasks (cached).
- Migration: `0003_leads_foundation` applied to isolated `dolphin_crm_dev`; Prisma status up to date.
- Runtime grants: verified with the dedicated application role. Synthetic lead/note/event inserts succeeded inside a transaction; cross-organization mutation failed on the membership foreign key; transaction rolled back.
- Lead API: default-disabled gate unit test passed. CRM Leads screen lint, typecheck and production build passed. Positive live API and browser tests: NOT RUN; development database identity path has not passed browser/API acceptance.

API suite after adding the lead gate test: 36 tests discovered, 34 passed, 0 failed, 2 skipped (Firestore profile and Auth Emulator). The temporary process-only Windows `os.userInfo()` test-runner shim was removed after the run. Lead database persistence was checked with synthetic rollback fixtures; no positive lead HTTP or browser tests ran.

## Stage 4.2.12 frontend testing and validation (2026-11-22)

- Confirmed `@dolphin/crm` declares Vitest 5.1.1, React Testing Library 16.3.3, user-event 14.6.13, jest-dom 8.0.0 and jsdom 31.0.1 as development dependencies. Corresponding versions and importer entries exist in `pnpm-lock.yaml`. The API package manifest and its lockfile importer continue to declare the same dependency ranges. A frozen/offline lockfile-only invocation surfaced pnpm's modules-directory purge confirmation; it was not treated as proof of a clean frozen install. No packages were reinstalled or upgraded in this validation pass.
- Added a CRM Vitest config, jest-dom setup, and `test` script. `--configLoader runner` is required because default esbuild config bundling encounters Windows access denied while scanning parent directories. It is a test-runner config option; the existing production Vite build option remains unchanged.
- Added 11 mocked Leads component tests covering active and archived lists, archive-state switching, create, details/history, edit, status, notes, archive confirmation, restore confirmation/refresh, loading, error/unavailable states, and permission-gated actions. CRM test result: **11 passed, 0 failed, 0 skipped**. These are component tests with mocked API responses, not live API tests.
- The ordinary API test command was attempted first and failed before discovery in this execution host: Node.js 24.14.1 `tsx` called `os.userInfo()`, which raised `ERR_SYSTEM_ERROR: uv_os_get_passwd returned ENOMEM`. The user reports `os.userInfo()` works in their normal Windows PowerShell. No application code was changed for this environment issue.
- With a temporary process-only `NODE_OPTIONS --require` shim overriding only `os.userInfo()` for the test process, the API suite completed: **36 tests, 34 passed, 0 failed, 2 skipped**. Both skips are Firebase emulator integration tests. The temporary shim was restored/removed after execution and is not committed or retained.
- Full workspace `pnpm.cmd test` with that same temporary test-process shim completed: API 34 passed / 2 skipped and CRM 11 passed. Turbo warned that test tasks do not emit output files; this is expected for the configured non-coverage test commands and did not fail the run.
- `pnpm.cmd prisma:validate`, `prisma:generate` (Prisma 7.10.1), `db:health`, `lint`, `typecheck`, and `build` all passed. Lint and typecheck each completed 10/10 workspace tasks; build completed 4/4 application tasks. Database health identified the local loopback `dolphin_crm_dev` and verified the restricted runtime role.
- Browser/API E2E: **NOT RUN**. Stage 3 database identity authentication remains disabled, and no authenticated live browser flow was verified. Firestore/Auth emulator tests remain skipped; no production identity provider was used.

## Stage 3.3.2 authenticated API integration update (2026-11-22)

- A separate opt-in test started the compiled NestJS API locally with the identity-auth feature flag enabled only in that child process. It used a signed identity from the local Auth Emulator and the isolated PostgreSQL database. Result: **2 passed, 0 failed, 0 skipped** (HTTP workflow and runtime-role assertion).
- The authenticated HTTP workflow successfully exercised Leads list/create/detail/edit/status/notes/archive/restore and active/archived filtering. Missing bearer token, missing organization context, wrong organization context, foreign-organization lead access, and post-logout revoked-token access were rejected. Runtime DB role was `dolphin_crm_dev_app`, with audit UPDATE denied. Temporary identities and organization-scoped fixtures were cleaned up.
- This is API integration verification, not CRM browser E2E. The CRM `/api/auth/me` request has no organization header before user/org context loads. No organization bootstrap flow is implemented, so live browser login remains blocked. Playwright E2E: **NOT RUN**.
- Full workspace tests completed with a temporary test-runner-only `os.userInfo()` shim: API **34 passed, 0 failed, 3 skipped** and CRM **11 passed, 0 failed**. The opt-in API test was run separately. Ordinary `tsx` execution still fails in this host before discovery with `uv_os_get_passwd ENOMEM`. The shim was removed afterward. A temporary dependency junction needed by the integration run was also removed; no manifest/lockfile modification was made for it.
- Prisma validation/generation, `db:health`, lint (10/10), typecheck (10/10), and build (4/4) passed. Turbo reported its existing API test no-output-files warning.

## Stage 3.3.3 organization bootstrap update (2026-11-22)

- CRM now performs organization bootstrap before database-mode profile resolution, presents a membership-only selector when necessary, automatically chooses a sole membership, denies access for zero eligible organizations, sends the selected organization ID on protected API calls, and supports switching with scoped UI remount/reset. The API independently verifies membership on every request.
- Bootstrap and authenticated Leads HTTP integration passed **2/2** on the local Auth Emulator/PostgreSQL/NestJS path. It tested missing/forged tokens, unknown and disabled database identities, no eligible membership, multiple eligible memberships, arbitrary organization IDs, membership revocation, cross-organization denial, lead CRUD/status/notes/archive/restore, and logout revocation. Synthetic fixtures were cleaned up.
- CRM component tests pass **14/14**, including organization selection/access-denied UI. Workspace API tests pass **34**, fail **0**, skip **3**; the opt-in authenticated HTTP test passed separately. Prisma/database checks, lint (10/10), typecheck (10/10), and build (4/4) passed.
- Browser E2E: **NOT RUN**. Playwright installation from `registry.npmjs.org` failed with sandbox `EACCES`; the computer-use browser host was also unavailable. No dependencies were added and no lockfile change was made for the failed install.
- Full test suite used a temporary process-only `os.userInfo()` shim because ordinary `tsx` fails before test discovery in this execution environment with `uv_os_get_passwd ENOMEM`. The shim was removed after the run. Turbo emitted the existing no-output-files warning for test tasks.

## Stage 3.3.4 real browser update (2026-11-22)

The preceding NOT RUN statement is historical and is superseded for the implemented Leads workflow. Five real Microsoft Edge Playwright tests passed (0 failed, 0 skipped), using the local Firebase Auth Emulator (`dolphin-air-local`), isolated PostgreSQL `dolphin_crm_dev`, and a NestJS API child process. No Firebase authentication or Leads API responses were mocked. Browser coverage included login, organization bootstrap/selection, dashboard, lead list/create/details/edit/status/notes/archive/restore, refresh/session restoration, organization switching and revocation. Security negatives covered missing/forged tokens, missing/arbitrary organization context, unknown/disabled identity, revoked membership, restricted-role denial, and cross-organization record access.

Fresh API integration suite: **36 passed, 0 failed, 2 skipped**; Auth Emulator-only integration: **1 passed, 0 failed, 0 skipped**. Direct API `tsx` initially failed before discovery with `uv_os_get_passwd ENOMEM`; the passing API run used a temporary test-runner-only `os.userInfo()` shim, removed after execution. Full workspace tests: CRM **14 passed** freshly; the API task was a Turbo cache hit (**34 passed, 3 default opt-in skips**), so the fresh direct API run is reported separately. Prisma validation/generation and database health passed; lint and typecheck passed 10/10 tasks each; build passed 4/4 applications. Browser E2E itself passed in the normal Playwright process without the Node shim.

Fixture cleanup was verified: zero synthetic E2E organizations, database users or Firebase users remained; test API/frontend ports were free. Database identity auth remains disabled in project defaults. Browser verification covers the implemented staff and Leads flows only; Firestore, customer sessions and the broader unfinished Stage 4.2 scope remain outside this evidence.
