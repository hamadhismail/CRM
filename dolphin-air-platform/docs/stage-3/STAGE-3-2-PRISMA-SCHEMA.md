# Stage 3.2 Prisma Schema and Constraints

## Validation

`database/prisma/schema.prisma` uses the Prisma ORM 7 `prisma-client` generator, CommonJS output at `apps/api/src/generated/prisma`, and a PostgreSQL datasource. Root `prisma.config.ts` selects this existing schema location. `pnpm prisma:validate` passed with no database credentials configured. `pnpm prisma:generate` generated Prisma Client 7.10.1 successfully.

The root `.gitignore` excludes generated client output. Generated code is a build artifact and should be regenerated using `pnpm prisma:generate`.

## Models

| Model | Purpose / invariant |
|---|---|
| `User` | Unique Firebase UID and optional normalized email; no credentials/passwords; type and account status are separate from roles. |
| `Organization` | Internal or B2B agency tenant. |
| `OrganizationMembership` | One stable row per user/organization; active/invited/suspended/revoked lifecycle. |
| `Role`, `Permission` | Store existing code strings; unique role/permission codes and resource/action pairs. |
| `RolePermission` | Composite key prevents duplicate grants. |
| `UserRole` | Assignment tied to `(membershipId, organizationId)`; role cannot escape its membership tenant. Revoke/reactivate in place and audit changes. |
| `Department`, `Branch` | Org-owned structures with per-org code/name uniqueness. |
| `DepartmentMembership`, `BranchMembership` | Composite FKs require structure and membership to share the same organization. |
| `CustomerIdentity` | One-to-one verified authentication identity state; distinct from future CRM sales profile. |
| `AuditEvent` | Safe metadata, actor/organization references, request ID, indexed target/time history. |

## Generated migration additions

`database/prisma/migrations/0001_identity_foundation/migration.sql` is generated using Prisma 7 `migrate diff --from-empty --to-schema ... --script`. The repeatable migration script appends `database/prisma/hardening/identity-foundation.sql` through `database/prisma/scripts/append-hardening.mjs`.

The hardening SQL adds constraints Prisma Schema Language does not represent:

- normalized email must be lowercase;
- disabled users and revoked memberships/roles have matching lifecycle timestamps;
- verified customer identities require a verification timestamp;
- runtime `dolphin_crm_dev_app` cannot update, delete, or truncate audit events.

Apply requires the project-owner-provisioned `dolphin_crm_dev_app` role to exist first. The SQL was reviewed locally but has **not** been executed against PostgreSQL.

## Authorization boundary

Role and permission codes preserve the existing API registry, including `finance_accounts` and `visa_processing`. Future sync must be idempotent and must not silently add/remove active privileges. Do not switch guards to database-backed authorization until the sync and runtime behavior are tested.

Future tenant-owned records need a required organization foreign key and organization-scoped repository queries. The schema does not provide row-level security; NestJS remains the sole private data access layer. Role/org-type compatibility still requires transactional policy validation.

No password, OTP, Firebase token, or secret is stored. Phone is non-unique and cannot prove identity. Deactivate/revoke rather than delete identity/history records.
