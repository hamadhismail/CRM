# Stage 3.3 Identity Synchronization

## Implemented

`DatabaseStaffIdentityService` resolves only a verified Firebase UID already present in `users.firebase_uid`. It never creates a user or assigns a role on login. For a selected organization it validates:

- Active PostgreSQL user with `INTERNAL_STAFF` type.
- Active internal organization and active user membership.
- Exactly one active role assignment, matching its organization type and role scope.
- A system role matching the existing approved internal role catalogue.
- Exact database-to-static permission parity.

Identity/profile fields (verified email, normalized email, and a supplied display name) are synchronized transactionally. Organization, membership, and user rows are locked; the transaction uses Serializable isolation. Safe audit events record resolution/profile synchronization and Firebase session revocation without storing bearer tokens or credentials. Database errors return a sanitized unavailable response; missing, disabled, or inconsistent identity data returns a generic unauthorized response.

## Provisioning contract

An authorized workflow must create/link `User.firebaseUid`, `OrganizationMembership`, and `UserRole` before this path accepts login. No first-login linking by email is performed. Customer and B2B identities are not accepted by this staff resolver.

## Status

- PostgreSQL-backed resolver: implemented and integration-tested using synthetic records.
- Firebase token to resolver: each boundary is tested separately; the current Auth emulator test verifies signed emulator token issuance/revocation/disabled-user behavior, and PostgreSQL tests verify UID resolution and access policy.
- Default API authentication: still Firestore/static. The database path is opt-in, development-only, requires `x-organization-id`, and is not enabled in `.env`.
- Production authorization activation: blocked pending approved provisioning workflow, browser/API end-to-end validation, and identity synchronization operational review.
