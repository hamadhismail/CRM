# Stage 4.3 — Acceptance

## Decision

**Locally accepted for the internal CRM customer/contact scope; not production accepted.** The required local database migration/privileges, authenticated API flows, organization isolation, component tests, API/PostgreSQL integration tests, and real browser tests completed successfully. Stage 3 still has separate identity work outstanding (customer portal authentication/invitation lifecycle and Firestore-dependent verification); those features are not created by a CRM customer profile and are not claimed complete here.

## Acceptance matrix

| Capability | Implemented | Evidence | Status |
|---|---|---|---|
| Customer/contact schema and migration | Yes | Migration 0005 applied; migrate status up to date | Verified locally |
| Least-privilege runtime access | Yes | Database health plus explicit grant verification | Verified locally |
| Customer API | Yes | Authenticated API/PostgreSQL tests | Verified locally |
| Organization and owner isolation | Yes | Cross-organization read/update/contact/link and duplicate checks | Verified locally |
| Directory and profile | Yes | Edge workflows and component tests | Verified locally |
| Contact management | Yes | Edge/API create and update tests | Verified locally |
| Duplicate warnings | Yes | Phone/email normalization and tenant-isolation tests | Verified locally |
| Archive/restore and activity history | Yes | Admin Edge flow and activity timeline assertions; Sales denied | Verified locally |
| Lead conversion | Yes | Create/link, idempotency, concurrent conversion, browser flow | Verified locally |
| Lint/typecheck/build | Yes | 10/10 lint, 10/10 typecheck, 4/4 build tasks | Passed |

## Boundaries

Database identity remains off by default. Live verification used an isolated local API child process and synthetic fixtures. No production credentials, services, or business records were used. Customer portal authentication, bookings, invoices, opportunities, messaging, and merging remain out of scope. Stage 4.4 is not started.
