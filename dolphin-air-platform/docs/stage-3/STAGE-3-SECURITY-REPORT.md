# Stage 3 Security Report

## Verified source controls

- Firebase Admin is restricted to project `dolphin-air-local` and loopback Auth/Firestore emulator hosts.
- Staff auth verifies Firebase ID tokens with revocation checking, requires verified email/approved provider, and requires an active application profile.
- Nest guards resolve permissions from server-side static role policy; no frontend role claim is trusted.
- User role/status services validate identifiers and delegate role assignment by actor role and organization IDs; they protect self-role changes and the last active Super Admin.
- The customer guard hashes `csess_` values before Firestore lookup and rejects missing, expired, revoked, or unassociated sessions.
- Global request validation and CORS configuration exist in Nest bootstrap.

## Unit evidence and limits

The API suite has 11 passing policy/guard tests and 1 skipped Firebase emulator test. Unit tests prove selected static policy behavior only; they do not establish runtime identity, database persistence, Firebase revocation, endpoint integration, or browser isolation.

## Findings

1. **High — PostgreSQL/Prisma authorization store absent.** Roles, user records and sessions are currently sourced from Firestore/static policy; no identity schema/migration exists.
2. **High — customer sign-in/session issuance absent.** The portal login explicitly says customer sign-in is not configured. An API validator for `csess_` sessions exists without a supported issuance flow.
3. **High — organization/agency membership lifecycle absent.** Scope checks use organization ID arrays in Firestore profiles; there are no membership models or management endpoints, and runtime isolation is unverified.
4. **High — staff invitations and credential lifecycle absent.** No authorized invitation/activation delivery lifecycle or recovery workflow is implemented.
5. **Medium — durable administrative audit trail absent.** Auth events are pseudonymous stdout records; administrative mutations are not durably audited.
6. **Medium — rate limiting absent/unverified.** No shared Redis service or rate limiter is configured.
7. **Unverified — emulator-backed token revocation, CORS/error behavior, browser session controls and runtime endpoint isolation.** Emulator JAR download is blocked; PostgreSQL credentials are absent.

No critical-free or production-ready security claim is made. Stage 3 acceptance remains blocked.
