# Stage 3 API Contracts

Current identity routes observed in source:

| Method | Path | Purpose | Status |
|---|---|---|---|
| GET | `/api/auth/me` | Resolve authenticated staff identity | Implemented in source; not runtime verified |
| GET | `/api/auth/session` | Resolve current customer session | Implemented guard/controller path; no issuance flow; not verified |
| POST | `/api/auth/logout` | Revoke customer session | Implemented source path; not verified |
| GET | `/api/users` | List staff in manageable scope | Implemented in source; not runtime verified |
| PATCH | `/api/users/:uid/role` | Assign permitted internal role | Implemented in source; not runtime verified |
| PATCH | `/api/users/:uid/status` | Activate/deactivate account | Implemented in source; not runtime verified |
| GET | `/api/roles` | Read role catalog/current grants | Implemented in source; not runtime verified |
| GET | `/api/permissions` | Read permission catalog/current grants | Implemented in source; not runtime verified |

Invitation, profile management, membership administration, role/permission mutation, customer login/session issuance, and audit-query endpoints are **Not implemented**. API exceptions are filtered through the shared exception filter; end-to-end error behavior has not been tested.
