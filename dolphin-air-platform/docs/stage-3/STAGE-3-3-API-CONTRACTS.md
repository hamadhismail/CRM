# Stage 3.3 Identity API Contracts

Routes below are the current new-platform routes found by source inspection. Runtime behavior and OpenAPI output are unverified because dependencies are not installed.

| Method | Path | Current purpose | Stage 3.3 gap |
|---|---|---|---|
| `GET` | `/api/auth/me` | Return authenticated staff profile | No build/runtime verification; align response with Prisma profile later |
| `GET` | `/api/users` | List authorized staff | Search/filter/pagination contract and persistent source not verified |
| `PATCH` | `/api/users/:uid/role` | Change role subject to API guards | No invitation, membership assignment, or audit persistence |
| `PATCH` | `/api/users/:uid/status` | Activate/deactivate account subject to API guards | No session-wide revocation verification |
| `GET` | `/api/roles` | Read fixed role/permission definitions | Proposed enum key alignment pending |
| `GET` | `/api/roles/me` | Read current role and permissions | Runtime authorization unverified |
| `GET` | `/api/permissions/me` | Read current permissions | Runtime authorization unverified |
| `GET` | `/api/permissions` | Read permission catalogue | Runtime authorization unverified |
| `GET` | `/api/customer/auth/session` | Validate an already-issued customer session | No customer authentication/session issuance flow |
| `POST` | `/api/customer/auth/logout` | Delete a validated customer session record | No session issuance/revocation integration tests |

No staff invitation, recovery proxy, session management, organization membership management, or audit-log API is present in the current identity routes. Add request/response DTOs, status codes, OpenAPI documentation, throttling policy, and error contract tests when implementation resumes. Never accept role, permission, organization, or customer ownership claims from the browser as authoritative.
