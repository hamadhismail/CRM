# Stage 4.1 Acceptance

## Decision: PARTIALLY VERIFIED

The authenticated CRM shell and dashboard UI foundation are implemented. Existing authentication and staff route protections are preserved. Dashboard integrations remain unavailable by design until Stage 3 runtime authentication is accepted and Stage 4 business data APIs exist.

| Capability | Status | Evidence |
|---|---|---|
| Protected CRM shell | Implemented; lint/typecheck/build passed | Existing protected route with `profile.read` |
| Permission-filtered navigation | Implemented in UI | Authenticated profile permission list |
| Logout | Preserved | Uses existing AuthProvider logout |
| KPI values and analytics | Unavailable | No dashboard data API; no fabricated metrics |
| Recent records/activity | Unavailable | No Stage 4 domain data sources |
| Responsive layouts | Implemented in CSS; browser not verified | Breakpoint and mobile drawer styles |
| Browser authentication flow | Not verified | Stage 3 acceptance pending; Playwright unavailable |
| Backend dashboard APIs | Deferred | Must have organization-scoped authorized sources |

Workspace checks: lint 10/10 passed; typecheck 10/10 passed; build passed for CRM, Portal, API and Worker. API tests: 33 passed, 0 failed, 2 skipped (Firestore-backed staff profile and Firebase Auth Emulator tests). The Windows test runner required a temporary external shim for `os.userInfo()`; it was not retained in project code.

No production-readiness claim is made. Stage 4.2 has not started.
