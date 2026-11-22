# Migration Compatibility

| Old feature | New implementation | Source evidence | Test result | Status |
|---|---|---|---|---|
| Staff roles (`admin`, `agent`, `accounts`) | `authentication.policy.ts`, roles API | Source role constants and Firestore rules | Unit test authored, not run | Implemented |
| Staff password identifier and alias | Emulator-only `AuthService.login` | Legacy login route and LoginView | Emulator unavailable | Implemented |
| Google staff login | Verified Firebase ID token/provider | Legacy popup and API route | Provider test pending | Implemented |
| Active staff checks | API reloads Firestore record | Legacy middleware and rules | Emulator test pending | Implemented |
| Legacy bearer forms | Rejected | Legacy auth middleware | Not applicable | Verified by code inspection only; operational test pending |
| Staff list/role/status/username | Admin-only user endpoints | Legacy `/api/users*` | API tests pending | Implemented |
| Create/password change/delete staff | Not ported | Legacy management routes | Credential migration approval needed | Blocked |
| Visa/supplier/account permissions | Source-backed policy arrays / exact Accounts grant list | Legacy permission helpers | Selected policy tests authored, not run | Implemented |
| Customer OTP request/verification | Boundary only; no delivery | Customer OTP/AiSensy helpers | Provider absent | Blocked |
| Hashed customer session verification/logout | Customer guard and logout endpoint | Legacy customer session code | Emulator test pending | Implemented |
| Customer/agency ownership | Customer helper; org fails closed | Legacy customer checks; no membership model | Unit test authored, not run | Implemented |
| 28m warning / 30m timeout and cross-tab | CRM AuthProvider | Legacy session hook | Browser test pending | Implemented |

No row is marked Verified based on files alone. Stage 3 feature parity remains incomplete until tests and source-vs-new behavior review run against an isolated emulator.
