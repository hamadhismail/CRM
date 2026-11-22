# Stage 3 Database Schema

## Current state: Not implemented / runtime blocked

`database/prisma/schema.prisma` contains only a PostgreSQL datasource and Prisma Client generator. There are no identity models or migrations. Prisma CLI/client are not present in the workspace lockfile/dependency tree.

Required models remain unimplemented: `User`, `Organization`, `OrganizationMembership`, `Role`, `Permission`, `UserRole`, `RolePermission`, and `AuditEvent`. Current user and customer session records are read from Firestore, so this is a known architecture gap against the PostgreSQL/Prisma target.

PostgreSQL 17 is running locally and loopback port 5432 responds, but a read-only connection attempt failed because no password was supplied. The repository has no local `.env` or `DATABASE_URL`. No database was inspected beyond the failed connection, and no database was changed. Do not run a migration until an isolated development database URL is configured.

## Required next validation

Install Prisma tooling from the trusted registry, define the identity schema, validate it, generate a migration, apply it only to the isolated dev database, and test uniqueness, relationships, transaction rollback, and audit persistence. None of those steps is currently verified.
