# Stage 4.3 — Database

## Models

- `Customer`: organization-owned individual/business profile, number, normalized contact fields, status, relationship owner, authorship, timestamps, and soft archive.
- `CustomerContact`: organization/customer-scoped contact, optional normalized phone/email, designation, preferred channel, primary flag, authorship, timestamps, and soft archive.
- `CustomerActivity`: append-only customer activity with actor, event type, timestamp, and safe structured metadata.
- `CustomerLeadLink`: organization-scoped Lead/customer relationship, actor, link outcome, timestamp, and idempotency key.

`CustomerAddress` and separate customer relationship-history tables were not added: the current profile needs one optional city/country, and activity/link history covers the requested record trail.

## Migration

- Added `database/prisma/migrations/0005_customer_contact_foundation/migration.sql` after migration 0004.
- Applied only to local PostgreSQL `dolphin_crm_dev` at loopback using the dedicated migrator account.
- Migration status: **5 migrations found; database schema up to date**.
- Migration is additive. Existing identity and Lead tables were retained. No database reset or `db push` was used.

## Integrity controls

- Customer number unique within organization; no global uniqueness for phone or email.
- Composite organization foreign keys constrain customer owner/creator/updater, customer contacts, activities, and Lead links to the same organization.
- Check constraints validate business legal name, phone/country pairing, normalized phone/email consistency, and contact channel presence.
- Partial unique index permits at most one non-archived primary contact per customer.
- A Lead can be linked once per organization; idempotency keys are unique within organization.
- Foreign keys use `RESTRICT`; history is preserved through archive rather than cascade deletion.

## Runtime privileges

`database/prisma/hardening/customers-runtime-grants.sql` was applied using the authorized migrator. The application role has only explicit SELECT/INSERT/UPDATE privileges on customer/contact tables and SELECT/INSERT on customer activity and Lead links. Activity/link history cannot be updated, deleted, or truncated by the application role. The role cannot create schemas, inherit migrator privileges, or access Prisma migration history. Future objects receive no broad default grants.

`pnpm.cmd prisma:validate`, `pnpm.cmd prisma:generate`, `pnpm.cmd db:health`, and `pnpm.cmd exec prisma migrate status` passed. Database health identified the loopback development database and least-privilege application role.
