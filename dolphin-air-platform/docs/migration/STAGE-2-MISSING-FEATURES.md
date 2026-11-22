# Stage 2 Missing Features and Structure Reconciliation

## Structure already represented

All requested high-level CRM feature directories and CRM communication subdirectories were present in Stage 1. The portal already has website, agent, customer, and auth route-group directories and feature roots. The API already had most domain modules, including auth, staff, agents, customers, leads, quotations, bookings, passengers, visas, visa orders, passport processing, payments, suppliers, notifications, integrations, settings, and audit. Existing worker queue/job roots cover the requested email, WhatsApp, notification, document, report, reminder and campaign categories.

## Directories added for discovered API ownership gaps

Added under the existing API boundary only:

- `apps/api/src/modules/dashboard/` — legacy dashboard aggregations currently combine direct Firestore subscriptions and endpoint data.
- `apps/api/src/modules/finance-calendar/` — finance calendar domain has a CRM view but no dedicated API module.
- `apps/api/src/modules/finance-reports/` — finance report views need an explicit server owner.
- `apps/api/src/modules/payment-followups/` — distinct route family `/api/payment-followups` is separate from payment CRUD.
- `apps/api/src/modules/global-search/` — global search currently spans client-side data and requires a server-side boundary.

These are empty structure placeholders only. No module source files or behavior were added.

## Stage 1 structure conflict to resolve

The existing portal has empty duplicate directories directly beneath `apps/portal/src/app/` named `components`, `features`, `hooks`, `lib`, `styles`, and `assets`, alongside the intended `apps/portal/src/components`, `src/features`, `src/hooks`, `src/lib`, `src/styles`, and `src/assets` roots. They were not populated or used by this audit. Keep implementation work in the intended `src/` sibling roots; remove the empty duplicate paths only as a separately reviewed cleanup, so no implementation is accidentally placed in the wrong location.

## Confirmed gaps / decisions needed

- **Standalone B2B agent portal:** no independently implemented portal was found in the source; classify as `NEW FEATURE — IMPLEMENTATION PENDING`.
- **Email delivery system:** no email dispatch/template subsystem found in the inspected application code. Treat as new; keep distinct from WhatsApp parity.
- **Invoice feature:** no dedicated invoice screen/route evidence was found in the inspected inventory. Determine whether invoices are represented by receipts/quotes or are a new feature before implementation.
- **Approvals:** source evidence exists for payment deletion requests/reject actions; no general approval center was confirmed. Scope separately.
- **Campaigns:** WhatsApp bulk messaging and templates are present; a distinct campaign lifecycle/scheduler needs handler-level confirmation.
- **API compatibility:** 260 route declarations are inventoried, but detailed request/response contracts, authorization per handler, validation, and side effects still require route-by-route review before implementation.
- **Deployment parity:** the archive's bundled Firebase Functions artifact statically matches `server.ts` route method/path pairs; the live deployed function was not inspected. Confirm deployment source/version and configuration separately before any cutover plan.
- **Database semantics:** Firestore collections and typed references are observable, but there is no normalized relational schema. Confirm identity, ownership, embedded-vs-collection choices, and historical records before Prisma modeling.
- **Data quality/security:** source includes Firebase rules/config, local seed-like JSON, and sensitive-document workflows. Production credentials and real data must not be used during the migration.

No changes were made to the old source ZIP.
