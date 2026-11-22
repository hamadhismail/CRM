# Stage 3.3 Integration Test Results

## Local environment

- Java selected for Firebase CLI: Temurin OpenJDK 21.0.13 (process-local `JAVA_HOME`/`PATH`). System Java remains Java 8.
- Firebase CLI: 15.24.0.
- Project: `dolphin-air-local`; Auth Emulator: loopback `127.0.0.1:9099`, started successfully with `--only auth`.
- Firestore Emulator was not started; its official artifact download remains blocked.
- Firebase CLI logged a nonfatal metadata lookup `EACCES` and remote MOTD/config fetch warning. Auth reported ready; no production Firebase was contacted.

## Executed results

| Check | Result | Evidence |
|---|---|---|
| Firebase Auth Emulator | PASS | Synthetic email/password sign-in; Admin SDK verified UID/email claim; forged token rejected. Auth-only run: 1/1 passed. |
| Token revocation/logout | PASS | Authenticated API service invoked Firebase Admin refresh-token revocation; after ensuring the revocation timestamp followed token `auth_time`, `verifyIdToken(token, true)` rejected the prior token. |
| Disabled Firebase account | PASS | A newly issued token was rejected by revocation-aware verification after account disablement. |
| PostgreSQL identity sync | PASS | Real NestJS `PrismaService` with app role resolved exact Firebase UID to pre-provisioned synthetic User; email/displayName sync was idempotent. |
| Unknown/disabled/inactive identity | PASS | Unknown UID, disabled DB user, missing membership, revoked membership and inactive organization were rejected. |
| Durable audit | PASS | Resolution/profile-sync and session-revocation events were inserted; migrator cleanup removed only rows tied to synthetic fixture users. |
| Firestore-backed integration | BLOCKED | Firestore emulator artifact unavailable; the Firestore profile/session test remains skipped. |
| Browser login/session E2E | NOT RUN | No configured Playwright browser suite/runtime was available. |

## Workspace validation

Latest full validation after the authentication and role-scope changes:

- `pnpm.cmd db:health`: PASS.
- `pnpm.cmd prisma:validate` and `prisma:generate`: PASS.
- `pnpm.cmd lint`: PASS, 10/10 tasks.
- `pnpm.cmd typecheck`: PASS, 10/10 tasks.
- `pnpm.cmd build`: PASS, 4/4 apps.
- `pnpm.cmd test`: 33 passed, 0 failed, 2 skipped (Auth-only emulator and Firestore-backed emulator tests are opt-in). An explicit Auth Emulator run passed 1/1. PostgreSQL identity-sync and role-scope tests ran and passed.

The test runner needed the temporary process-only Windows `os.userInfo()` shim. It was removed after testing. Firebase CLI also emitted a nonfatal metadata warning; no secrets or service-account files were used.

## Stage 3.3.2 authenticated Leads HTTP integration (2026-11-22)

- PostgreSQL health check passed for loopback `dolphin_crm_dev`; API runtime role was independently observed as `dolphin_crm_dev_app`. Auth Emulator on `127.0.0.1:9099` accepted synthetic email/password sign-in under `dolphin-air-local`. Java 21 had been selected for emulator tooling in a process-only environment; no production Firebase connection was used. Firestore was not started because the database identity request path does not depend on it.
- The ordinary targeted `tsx` command failed before test discovery in this execution host with Node.js 24.14.1 `uv_os_get_passwd returned ENOMEM`. The test was rerun using a temporary `NODE_OPTIONS --require` shim limited to the test runner process. The compiled Nest API child explicitly removed `NODE_OPTIONS`; the shim did not affect application behavior. The temporary shim was deleted afterward.
- The opt-in `authenticated-leads.integration.test.ts` result was **2 passed, 0 failed, 0 skipped** (one HTTP workflow plus one runtime database-role assertion). It verified emulator-issued Firebase token acceptance; missing token and missing organization context rejection; active pre-provisioned staff resolution; permission derivation from the current `sales` catalog; authorized list/create/detail/edit/status/note/archive/restore; archived/active filtering; cross-organization record non-disclosure and organization-context rejection; logout revocation; rejection of the revoked token; and restricted runtime DB role/audit UPDATE denial. It used synthetic identities and isolated organizations and performed cleanup.
- Full workspace `pnpm.cmd test` passed: API **34 passed, 0 failed, 3 skipped**; CRM component tests **11 passed, 0 failed**. The three API skips are the two opt-in Firebase emulator test files and the opt-in authenticated HTTP integration test (run separately as above). No skip is counted as a pass. Turbo emitted its existing no-output-files warning for the API test task.
- The API output initially required a temporary local pnpm dependency junction for the locked `send@0.19.2` to resolve `mime@1.6.0`; the junction was verified as a Windows mount-point reparse link and removed after validation. No manifest or lockfile dependency change was made for this workaround.
- `prisma:validate`, `prisma:generate`, `db:health`, `lint` (10/10), `typecheck` (10/10), and `build` (4/4) passed.
- CRM browser E2E remains **NOT RUN**. In the existing CRM flow, `/api/auth/me` is requested with a Firebase bearer token before an organization context is established, but database identity mode requires `x-organization-id`; no organization-selection/bootstrap flow is available. Playwright is not installed. This gap is not bypassed by the API test.

## Stage 3.3.3 organization bootstrap and browser readiness (2026-11-22)

- Added authenticated `GET /api/auth/organizations`. It verifies the signed Firebase token and staff provider before accessing PostgreSQL; it is enabled only in the isolated development API process, returns minimal `{id,name}` choices, validates active identity, membership, organization, role scope, and exact permission-catalog parity, and never provisions an identity. It applies a 30-per-minute in-process limit by verified UID; this is not a distributed production limiter.
- CRM now bootstraps authorized organization choices before database-mode `/api/auth/me`. A sole organization is selected automatically; multiple organizations require selection unless a stored ID is still present in the fresh response; zero choices display access denied. Selected organization context is sent on protected requests and validated again by the API. Workspace content is remounted on organization change. The API logout route can revoke the caller's own session before organization selection.
- Authenticated API integration: **2 passed, 0 failed, 0 skipped**. It exercised absent/forged token rejection, two eligible memberships with minimal response data, no eligible memberships, disabled and unknown identities, invalid organization ID, membership revocation, cross-organization lead denial, the full lead API workflow, logout revocation, and restricted runtime-role verification. Synthetic identities and DB fixtures were cleaned up.
- CRM component tests: **14 passed, 0 failed** (11 Leads and 3 organization-selection/access-denied cases). Default API suite: **34 passed, 0 failed, 3 skipped**; the opt-in HTTP test passed separately. The three default skips are the two Firebase emulator test files and the opt-in authenticated HTTP test.
- Prisma validation/generation, `db:health`, lint (10/10), typecheck (10/10), build (4/4 applications), and workspace tests passed. The full test run needed a temporary process-only `os.userInfo()` shim because ordinary `tsx` fails before discovery with `uv_os_get_passwd ENOMEM`; it was removed afterward. Turbo emitted its existing test-task no-output-files warning.
- Browser E2E: **NOT RUN**. The CRM workspace does not have Playwright installed. Installing `@playwright/test` from the configured official npm registry failed with sandbox `EACCES` after the existing pnpm store path was specified; no package manifest or lockfile changes were made. The desktop browser-access host also reported unavailable. This was not counted as browser verification.
- The feature flag remained absent from the local project `.env`; only the child API process used it. Firestore was not needed for this PostgreSQL-backed staff bootstrap. No production services were contacted.

## Stage 3.3.4 browser authentication and Leads E2E (2026-11-22)

### Local services

- Playwright `@playwright/test` 1.65.1 ran with the installed Microsoft Edge channel. A dedicated CRM E2E build and loopback static server served the actual React bundle; Firebase and Leads API calls were not mocked.
- The Firebase Auth Emulator was already running and reported ready at `127.0.0.1:9099`; actual browser sign-in used project ID `dolphin-air-local`. Synthetic Firebase accounts were created and removed. No production Firebase was contacted.
- `pnpm.cmd db:health` passed for `dolphin_crm_dev`. Fixture setup/cleanup used `dolphin_crm_dev_migrator`; the API child used `dolphin_crm_dev_app`. The API listened on loopback port 3001 and the CRM E2E frontend on loopback port 5174.
- Auth Emulator is a Node-based service; Java was not used by this Auth-only run. The current shell resolves Java 8 while a JDK 21 installation exists. Firestore was not started, so its Java/emulator path remains unverified and its integration test remains skipped.

### Browser tests

Playwright with Edge: **5 passed, 0 failed, 0 skipped**.

1. Multi-organization Firebase login, no protected profile request before selection, dashboard and Leads access, create/details/edit/status/notes/archive/archived filter/restore, page refresh/session restoration, organization switch, tenant record filtering, membership revocation, logout and revoked-token denial.
2. Single eligible organization auto-selection.
3. No-membership access-denied flow.
4. Unknown and disabled PostgreSQL identities fail closed after Firebase sign-in.
5. Staff role without lead permissions has no Leads navigation and receives API 403.

Direct negative API assertions rejected missing credentials, forged tokens, absent/arbitrary organization context, and a foreign-organization lead. No browser auth or Leads API response was stubbed.

### Cleanup and validation

- E2E fixture cleanup verification: **0** synthetic organizations, PostgreSQL users, or Firebase users remained. API/CRM test ports were free after teardown. The pre-existing Auth Emulator was left running.
- Fresh authenticated API suite with local integration opt-in: **36 passed, 0 failed, 2 skipped**. The ordinary direct `tsx` command failed before discovery with Node 24 `uv_os_get_passwd ENOMEM`; a temporary `os.userInfo()` shim was applied only to the test-runner process and removed afterward. The two skips were opt-in Auth and Firestore suites; the Auth suite was then explicitly run: **1 passed, 0 failed, 0 skipped**. Firestore remains unavailable/not run.
- Full workspace `pnpm.cmd test` completed; CRM component tests executed freshly: **14 passed, 0 failed**. Turbo replayed the API task from cache (**34 passed, 3 default opt-in skips**); the API suite was executed fresh separately as above.
- `prisma:validate`, `prisma:generate`, `db:health`, `lint` (10/10), `typecheck` (10/10), and `build` (4/4) passed. CRM lint and all five browser tests were rerun after the final E2E assertion change.

The Codex workspace had an incomplete pnpm dependency link for locked `send@0.19.2` to `mime@1.6.0`; the local ignored node_modules link was repaired to the locked version. No package manifest or lockfile was changed. A clean owner-terminal package install remains the durable environment check.

Stage 3.3 staff browser authentication and organization-scoped Leads access are **RUNTIME VERIFIED LOCALLY**. Stage 3 overall remains **PARTIALLY VERIFIED / NOT ACCEPTED** because Firestore-backed integration and other identity requirements, including customer sessions and invitation lifecycle, remain incomplete or unverified. Database identity auth remains disabled by default.
