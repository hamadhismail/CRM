# Stage 4.3 — Frontend

## Screens and interactions

- Customer directory: actual API KPIs, search, customer type/status filters, active/archived filter, pagination, add, and profile navigation.
- Customer profile: editable CRM fields and status, owner, contacts, linked Leads, activity timeline, and archive/restore controls.
- Contacts directory: authenticated search and organization-scoped contact records.
- Contact forms: add/edit contact and choose primary contact.
- Lead detail: authorized conversion preview, duplicate review, explicit create/link choice, and navigation to the resulting customer profile.
- Duplicate warning: shows only server-returned organization-authorized matches and requires explicit confirmation to keep a legitimate duplicate.
- Future bookings and invoices show unavailable states; there are no fake records.

All API calls use the existing authenticated CRM client, preserving Firebase bearer tokens and the selected organization header. Actions are permission-aware. Server errors do not produce success UI. Customer records are not persisted in browser storage.

The directory/profile use the existing WorkspaceShell and Dolphin Air light theme. Vitest/Testing Library covers customer rendering, create, duplicate confirmation, edit/status, failure handling, and permission visibility.
