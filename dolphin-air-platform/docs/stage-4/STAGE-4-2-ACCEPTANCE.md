# Stage 4.2 acceptance

Decision: **PARTIALLY VERIFIED / BLOCKED**. Migration 0003 and least-privilege grants are applied; synthetic persistence and tenant-constraint checks passed. Guarded list/create/detail/edit/status/note/archive/restore routes exist, and the CRM Leads screen connects to the existing API contracts with active/archived filtering.

Stage 4.2.12 added Vitest 5.1.1 and React Testing Library component coverage to the CRM workspace. The CRM Leads component suite passed **11/11** mocked tests. The API suite passed **34**, failed **0**, and skipped **2** Firebase emulator tests when run with a temporary, process-only `os.userInfo()` shim. The unmodified API test command was attempted first and failed before discovery in this execution host with Node.js 24.14.1 `uv_os_get_passwd ENOMEM`; the temporary shim was removed after the run. Full workspace test tasks passed with this disclosed process shim. Prisma validation/generation, local database health, lint (10/10 tasks), typecheck (10/10 tasks), and build (4/4 applications) passed.

No real browser or authenticated API E2E test was run. Stage 3 database identity authentication remains disabled; Firebase emulator integration tests remain skipped. Component tests use mocked API responses and do not establish live API authorization or browser authentication. A frozen/offline lockfile-only check raised a pnpm modules-directory purge confirmation and was not counted as a clean frozen installation; the installed test dependency versions and lockfile importer entries were inspected and present.

Stage 4.2 is **not fully accepted** until authenticated runtime API and browser verification are completed under the Stage 3 identity gate. Do not start Stage 4.3 based solely on these component and unit results.

## Stage 3.3.2 API integration evidence (2026-11-22)

The guarded Leads API has now been exercised in an isolated local authenticated HTTP integration: **2 passed, 0 failed, 0 skipped** in the opt-in test. A local Auth Emulator-issued signed staff token resolved through PostgreSQL identity, active organization membership and the approved `sales` permission set. List, create, detail, edit, status, note, archive, archived list, restore and active list succeeded. Missing credentials/context, wrong organization, cross-organization lead lookup and a revoked token were rejected. The Nest API used only the restricted database app role. Identity-auth enablement was confined to the spawned local development API process; the default remains disabled. Synthetic test data was removed.

Workspace test results: API **34 passed, 0 failed, 3 skipped** and CRM **11 passed, 0 failed**. The opt-in test passed separately. The two emulator-specific suite files and opt-in test are skipped by default. The full test command required a temporary process-only shim due to this host's Node `os.userInfo()` ENOMEM; ordinary invocation fails before discovery. Prisma validation/generation, database health, lint, typecheck and build passed.

CRM browser authentication is **NOT VERIFIED**. The current client requests `/api/auth/me` without an organization header before it can establish organization context, while database identity mode requires that context. No browser E2E ran; Playwright is not configured. Stage 4.2 therefore remains **PARTIALLY VERIFIED**, despite the new authenticated API evidence. Stage 3 browser/auth acceptance remains a prerequisite; do not start Stage 4.3.

## Stage 3.3.3 update (2026-11-22)

The former organization-bootstrap blocker is resolved in source: API has a signed-token-only, development-gated membership bootstrap endpoint; CRM waits for the bootstrap and selects an eligible organization before protected database-mode `/api/auth/me`. Active context is sent on protected requests and rechecked server-side. Multiple memberships, empty access, switching, and access-denied UI are implemented. API security and full Leads HTTP integration passed **2/2**; CRM component tests passed **14/14**; API default suite passed **34** with **3 opt-in skips**. Workspace Prisma/database checks, lint/typecheck, and builds passed.

Real CRM browser tests remain **NOT RUN**. Playwright installation was blocked by registry `EACCES`, and browser automation host access was unavailable. The database identity flag remains disabled in defaults and production; only the local API test process enabled it. Stage 4.2 remains **PARTIALLY VERIFIED**, pending real browser login, organization selection/switch, session restoration, logout, and browser-level denial tests. Do not start Stage 4.3.

## Stage 3.3.4 update (2026-11-22)

The authenticated browser/API gate is now **verified locally for the implemented Leads workflows**: five real Microsoft Edge Playwright tests passed against Auth Emulator, NestJS, and isolated PostgreSQL. See `STAGE-4-2-TEST-RESULTS.md` for workflow and security evidence. This supersedes the browser-not-run statement above for those workflows. Database identity remains disabled by default.

Stage 4.2 remains **PARTIALLY IMPLEMENTED / PARTIALLY VERIFIED**, not accepted as a complete stage. Assignment workflow, duplicate handling, conversion and other deferred Stage 4.2 capabilities remain incomplete; broader acceptance criteria have not been met. Do not proceed to Stage 4.3 based on this partial scope.
