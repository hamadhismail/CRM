# Identity API Contracts

Old route contracts were inspected in the legacy `server.ts`; the new routes listed below are equivalents where practical. These contracts have not been provider-integration verified.

| Method/path | Old behavior | New contract | Authorization / consumer |
|---|---|---|---|
| POST `/api/auth/login` | `{username/email, password}`; alias handling; returns bearer/custom token. | `{username?,email?,identifier?,password}`; generic failure; exchanges only in Firebase emulator and returns safe user plus Firebase custom token. | Public with per-process attempt limit; CRM login. |
| POST `/api/auth/google` | Caller email is accepted by old handler. | `{idToken}`; verifies Firebase token, Google provider and verified email; returns custom token and safe user. | Public but identity proof required; CRM login. |
| GET `/api/auth/me` | Returns current staff and refreshed Firebase custom token. | Returns safe `{ user }`; Firebase ID token in Authorization header. | Active staff. |
| GET `/api/users` | Staff list. | Safe staff projection. | Admin only (tightened from legacy authenticated access). |
| PUT `/api/users/:id/role` | Update role. | `{role: admin|agent|accounts}`. | Admin only; cannot change own role. |
| PUT `/api/users/:id/status` | Update active flag. | `{active: boolean}`. | Admin only; protects self and primary admins. |
| PUT `/api/users/:id/username` | Update username. | `{username}` with legacy constraints. | Admin only. |
| GET `/api/roles` | No equivalent verified. | Returns fixed legacy roles; immutable. | Active staff. |
| GET `/api/permissions/me` | Permission values embedded in user data/helpers. | Returns safe permission arrays for current user. | Active staff. |
| POST `/api/customer/auth/logout` | Customer session logout/revocation. | Accepts bearer server-issued `csess_`; deletes hashed session record. | Customer authenticated. |

Not implemented: staff create/invite, password mutation, user deletion, OTP request/verification/session issuance, customer profile endpoints. These require confirmed request/response parity and safe credential lifecycle. Error responses do not disclose account existence. All contracts need emulator-backed end-to-end compatibility verification.
