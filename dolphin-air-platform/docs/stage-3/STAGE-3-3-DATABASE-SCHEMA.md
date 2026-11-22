# Stage 3.3 Identity Database Schema

## Current state

`database/prisma/schema.prisma` contains only the PostgreSQL datasource and Prisma client generator. There are no identity models, indexes, foreign keys, or migrations. No database migration has been run.

## Proposed minimum model

| Model | Purpose | Required constraints |
|---|---|---|
| `User` | Application profile linked to a Firebase identity | Unique nullable Firebase UID; unique normalized email when present; status and timestamps |
| `Organization` | Internal branch/department or B2B agency boundary | Stable UUID; organization type; status |
| `OrganizationMembership` | User-to-organization membership | Unique `(userId, organizationId)`; status; scoped role assignments; foreign keys |
| `Role` | Centrally defined role | Unique role key; no client-created privileged definitions |
| `Permission` | Centrally defined permission | Unique permission key |
| `RolePermission` | Role-to-permission grants | Unique `(roleId, permissionId)`; foreign keys |
| `UserRole` | User role assignment, with optional organization scope | Foreign keys; explicit scope; actor and timestamps for audit |
| `UserSessionMetadata` | Revocation/administrative session metadata only | No raw tokens; expiry and revocation timestamps |
| `AuditEvent` | Append-only identity/security audit record | Actor, action, target, timestamp, outcome, correlation ID; no secrets |

Customer profile association must be modeled separately from agency membership. Firebase UID is an external identity reference, not a replacement for stable application IDs. Exact schema and role cardinality remain design decisions and must be finalized before migration authoring.

## Migration gate

Do not author or run a migration until a local isolated PostgreSQL service is available, Prisma dependencies are installed, and the schema is reviewed. Apply only to a disposable/development database, then validate unique constraints, foreign keys, seed isolation, and migration rollback strategy. Production is out of scope.
