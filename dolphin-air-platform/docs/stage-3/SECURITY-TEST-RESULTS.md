# Security Test Results

Automated policy tests cover role preservation, disabled/unknown-user rejection, selected legacy permission grants/denials, organization fail-closed behavior, cross-customer record access, missing bearer rejection, and invalid token rejection. They have not been executed. There is no lockfile or installed workspace dependency tree; pnpm 9.15.4 could not be downloaded in the restricted network, and the available pnpm 11 shim stalled. Firebase emulator startup is also blocked by Java 8; see [Stage 3.1 test results](STAGE-3-1-TEST-RESULTS.md). No dependencies were installed.

| Control | Evidence | Result |
|---|---|---|
| Signed staff ID token, issuer/audience/expiry/revocation | Firebase Admin `verifyIdToken(token, true)` | Implemented; emulator execution pending. |
| Disabled staff denial | Active user record resolved for each request | Implemented; test pending execution. |
| Browser role/permission claims ignored | API reloads Firestore user record | Implemented; integration test pending. |
| Customer session hash and expiry | Only `csess_` bearer tokens accepted; hash lookup in `customer_sessions`; revoked, missing-expiry, and expired records denied | Implemented; emulator test pending. |
| Cross-customer check | Exact ID / canonical phone helper | Unit test authored; execution pending. |
| Organization/agency scope | Empty trusted membership list | Fail-closed, unit test authored; execution pending. |
| Rate limiting | 5 failures per IP and identifier for password login; 5 per IP for Google exchange, 15 min | Process-local only; shared production limiter blocked. |
| OTP enumeration / delivery | Not implemented | Blocked pending provider and isolated tests. |
| Cross-agency access tests | No existing membership model / business endpoints | Blocked; no tenant feature is enabled. |
| Frontend protected route and login UI | React route/provider implementation | Browser tests and build pending. |

No live provider, customer, production database, or messaging endpoint was contacted. Firebase CLI attempted blocked metadata/remote-config requests but did not start an emulator. No test is marked passed until the command is actually run.
