# Stage 3.1 Test Results

## Automated API tests

The existing `apps/api/test/identity-policy.test.ts` contains these tests. The documented package command is `pnpm.cmd --filter @dolphin/api test` (`tsx --test test/identity-policy.test.ts`). It could not reach test discovery because package-manager resolution stalled and dependencies are absent.

| Test name | Command executed | Expected result | Actual result | Pass/fail | Root cause / corrective action |
|---|---|---|---|---|---|
| `legacy roles are preserved and unknown or disabled accounts fail closed` | `pnpm.cmd --filter @dolphin/api test` (attempted) | Exact legacy role allowlist; inactive/unknown principal rejected | Test runner did not start | Blocked | pnpm 9.15.4 unavailable; no lockfile or dependencies. |
| `permissions preserve administrator and scoped legacy capabilities` | Same API test command | Admin, Accounts visa/supplier/notification, and assigned agent grants pass; unassigned action denied | Test runner did not start | Blocked | Same; rerun after pinned package manager and dependencies are available. |
| `Nest permission and role guards allow assigned access and reject denied access` | Same API test command | Assigned action passes; missing permission/role throws 403 | Test runner did not start | Blocked | Same. |
| `organization scope fails closed without trusted membership` | Same API test command | Organization access denied absent server-loaded membership | Test runner did not start | Blocked | Same. |
| `customer record access rejects other customer identifiers and phones` | Same API test command | Own ID/canonical phone accepted; unrelated customer denied | Test runner did not start | Blocked | Same. |
| `staff guard rejects a missing bearer token before identity lookup` | Same API test command | Missing token rejected without identity lookup | Test runner did not start | Blocked | Same. |
| `customer session tokens in query strings are not extracted as credentials` | Same API test command | Query token is not treated as a bearer credential | Test runner did not start | Blocked | Same. |
| `customer guard accepts a valid server-issued session and resolves its owner` | Same API test command | Unexpired session found by token hash resolves owner | Test runner did not start | Blocked | Same; fixture mocks Firestore and is not an emulator integration test. |
| `customer guard rejects forged, missing, expired and unassociated sessions` | Same API test command | Forged/unknown, missing, revoked, expired, unassociated and legacy forged bearer sessions rejected | Test runner did not start | Blocked | Same; fixture mocks Firestore and is not an emulator integration test. |
| `staff guard rejects an invalid signed-token verification result` | Same API test command | Invalid Firebase verification rejected | Test runner did not start | Blocked | Same; signed-token expiry/signature verification still needs emulator integration coverage. |

## Requested coverage not present or not executable

No emulator integration suite currently exercises valid/invalid password login, token expiry/signature, revoked tokens, disabled-user API requests, logout revocation, user-management mutation denials, or stored customer-session expiry/forgery against Firestore. No frontend test runner or Playwright dependency is installed. Session timeout and cross-tab behavior have code only, not browser test coverage.

Expected emulator command: `firebase.cmd emulators:start --only auth,firestore --project dolphin-air-local --non-interactive`. Actual: failed before emulator startup because Java 8 is installed while the Firebase CLI requires Java 21+; network access for CLI remote configuration is also denied. No test sent OTPs, emails, or messages.

No test is marked Passed.
