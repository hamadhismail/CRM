# Stage 3 Summary

**Stage status: BLOCKED / NOT VERIFIED.** Stage 3.1 checks could not execute because the pinned package manager and emulator runtime are unavailable in this environment.

Stage 3 establishes a Firebase-backed identity boundary, preserves the confirmed staff role names, adds server-side guards and safe staff administration operations, builds CRM login/protected navigation, and explicitly blocks customer OTP delivery pending its provider boundary. The legacy CRM remains read-only and unchanged.

## Implemented

- API auth, staff/customer guards, role and permission policy, user management, fixed role listing, current-user permission endpoint, and fail-closed organization scope.
- CRM Firebase login, Google sign-in, current-user context, protected routes, unauthorized and session-expired states, staff listing/edit controls, and Dolphin Air login styling.
- Emulator-only environment placeholders and policy tests.
- Local Auth/Firestore emulator config and deny-by-default development Firestore rules added in Stage 3.1; emulator startup remains blocked.
- Required Stage 3 audit, architecture, API, data, frontend, test, and compatibility documents.

## Incomplete / blocked

- No dependencies installed; there is no lockfile, pinned pnpm 9.15.4 could not be fetched due network restrictions, and the available pnpm 11 shim stalled. No build, typecheck, lint, or test result is claimed.
- Firebase Auth/Firestore emulator was not started or seeded; the installed Firebase CLI requires Java 21+ while only Java 8 is available. Tokens and endpoint contracts are not end-to-end verified.
- Customer OTP/AiSensy flow is not enabled. Staff invite/password reset/deletion are blocked pending safe credential lifecycle decision.
- Ten API policy/guard tests are authored but unexecuted; emulator integration and frontend browser tests are not present.
- Per-process auth limiter is unsuitable for multi-instance production; shared Redis-backed limiter required.
- No verified organization membership model exists; tenant-scoped operations deny by default.
- Frontend browser, API integration, lint and test commands remain to be run with dependencies installed. See [Stage 3.1 acceptance report](STAGE-3-1-ACCEPTANCE-REPORT.md).

Recommended next batch: establish an isolated Firebase Auth + Firestore emulator fixture and run contract tests for staff login, Google token verification, active-account denial, role/permission checks and customer session revocation. Then approve credential lifecycle and distributed rate limiting before expanding user administration or enabling OTP.
