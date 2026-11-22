# Stage 4.3 — Contacts and Customer Management

## Status

**Locally verified for the internal CRM customer/contact scope. Not production accepted.** The additive schema migration is applied to the isolated `dolphin_crm_dev` database. Authenticated API/PostgreSQL tests and real Microsoft Edge E2E tests passed. Database identity authentication remains disabled by default and was enabled only in the isolated E2E API process.

## Delivered

- Organization-scoped customer directory, search, filters, pagination, summary metrics, profile editing, active/inactive status, archive, and restore.
- Individual and business customer records. Creating a CRM profile does not create a Firebase or portal account.
- Customer contacts, primary contact selection, contact editing, and a searchable Contacts directory.
- Customer activity timeline with persisted create, update, contact, Lead link/conversion, archive, and restore events.
- Organization-scoped duplicate warnings for normalized phone and email and case-insensitive business name. Duplicates require explicit review; records are never merged automatically.
- Transactional Lead-to-Customer conversion by creating a customer or linking an eligible existing customer.
- Real authorized customer totals in the Stage 4.1 dashboard. Unsupported booking/invoice content remains unavailable.

## Deliberately outside this stage

Customer portal authentication, bookings, invoices, payments, package workflows, opportunity creation, record merging, and communication delivery are not implemented. Customer identity remains separate from CRM customer profile data.

See the database, API, frontend, conversion, security, test, and acceptance documents in this directory.
