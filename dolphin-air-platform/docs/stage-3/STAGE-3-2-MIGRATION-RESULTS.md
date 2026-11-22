# Stage 3.2 Migration Results

## Status: APPLIED AND VERIFIED on isolated development database (2026-11-22)

- Prisma CLI, client and PostgreSQL adapter: `7.10.1`; `pg`: `8.23.1`.
- Pre-migration target checks passed for both configured URLs: loopback `dolphin_crm_dev:5432`, expected dedicated roles, successful authentication, and empty `public` schema.
- Migration account had database CONNECT and public schema CREATE; it was not superuser, createdb, createrole, replication, or RLS-bypass. Runtime account was not elevated, could not create schemas, and was not a member of the migrator role.
- Prisma schema validation and client generation passed.
- Existing `0001_identity_foundation` was applied using configured `MIGRATION_DATABASE_URL`; `prisma migrate status` reports the schema is up to date.
- Identity SQL and lifecycle/audit hardening were reviewed before migration. No reset, drop, `db push`, production connection, or other database access occurred.
- Post-migration `identity-runtime-grants.sql` was applied as the migrator; its DB, host, role, role-separation, and required-table guards passed.
- Verified 13 identity tables, 16 foreign keys, 15 unique indexes, 5 check constraints, and 49 indexes. No sequences are used by this UUID-based schema.
- Runtime grants: explicit CRUD on identity tables; audit event SELECT/INSERT only; `_prisma_migrations` inaccessible to the app role; no schema/database CREATE for the app role; no app/PUBLIC default grants on future objects.
- PrismaService initialized from the built API and queried the expected database using the runtime app role.
- Synthetic integration checks passed for unique Firebase UID, duplicate membership, cross-organization membership FK rejection, audit insert/read, audit UPDATE/DELETE/TRUNCATE denial, and transaction rollback. No test fixture remained.
- Committed synthetic user and audit rows were verified from a new connection, then removed by the migrator; cleanup was verified.

## Remaining security condition

Database-backed authorization remains disabled. The schema constrains a role assignment to a membership in the same organization, but does not enforce whether `Role.scope` is valid for that organization. Add and test an approved role-scope invariant before activating database-backed authorization.
