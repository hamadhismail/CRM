# Stage 3.2 Test Results

The API suite contains 10 policy/guard unit tests plus one opt-in Firebase emulator integration test. The only test command attempted in this Stage 3.2 run was `pnpm.cmd test` (root Turbo task); it stalled before test discovery. The filtered API command was not run. All tests below are therefore **Blocked / Not Run**; no pass is claimed.

| Test | Expected result | Actual result | Status | Root cause / next action |
|---|---|---|---|---|
| Platform role catalogue contains approved roles | Exact nine new platform roles; unknown/external/disabled records denied as staff | Not executed | Blocked | Install pinned pnpm/dependencies; run API test command. |
| Each role receives explicit central permissions | Only mapped grants pass; no wildcard business access | Not executed | Blocked | Same. |
| Nest permission and role guards | Assigned permission passes; denied role/permission produces 403 | Not executed | Blocked | Same. |
| Organization and user-management scope | Assigned organization allowed; cross-organization target denied; Super Admin scope is explicit | Not executed | Blocked | Same. |
| Role assignment prevents privilege escalation | Admin cannot assign Admin/Super Admin; unprivileged user cannot assign roles | Not executed | Blocked | Same. |
| Customer record ownership | Own ID/full canonical phone can match; unrelated customer denied | Not executed | Blocked | Same. |
| Missing staff bearer rejected | 401 before identity lookup | Not executed | Blocked | Same. |
| Customer token query string rejected | Only bearer header token is extracted | Not executed | Blocked | Same. |
| Valid server-issued customer session | Hash-resolved, unexpired associated session establishes principal | Not executed | Blocked | Same; unit fixture mocks Firestore. |
| Forged/missing/expired/revoked/unassociated customer sessions | Each invalid session is rejected | Not executed | Blocked | Same; emulator session integration not run. |
| Invalid staff token rejected | Firebase verification failure is unauthorized | Not executed | Blocked | Same. |
| Firebase emulator accepts active verified staff | Synthetic `.test` email/password token maps to its active Firestore role and org scope; disabled record and forged token are rejected | Opt-in test present but not run | Blocked | Java 21+ needed to start emulator; dependencies unavailable. |

The emulator integration test is enabled only by `RUN_FIREBASE_EMULATOR_TESTS=1` and asserts the local project and loopback endpoints before seeding. Test coverage does not yet include every UI state, inactivity timeout, cross-tab signal, token expiry, logout revocation, or a full HTTP end-to-end API app.

No OTP, email, WhatsApp, payment, or production service was invoked.
