# Stage 3 Authentication Architecture

## Current source implementation (not runtime verified)

- CRM uses Firebase Authentication client SDK (password and Google provider paths are present).
- NestJS `AuthService` calls Firebase Admin `verifyIdToken(token, true)`, checks verified email and provider, then resolves an active staff profile from Firestore. Roles and permissions are derived server-side.
- Staff and customer guards are separate. The customer guard accepts a bearer `csess_` token only when its SHA-256 hash resolves to an unexpired, non-revoked Firestore session with a customer association.
- Firebase Admin initialization is configured to allow local emulators only during this stage.

## Gaps / status

Token verification and staff profile resolution: **Implemented, not tested**. Durable user and membership storage in PostgreSQL/Prisma: **Not implemented**. Customer session issuance and approved Firebase customer login: **Not implemented**. Revocation, disabled-user behavior, and emulator end-to-end operation: **Not verified**. Avoid mixing Firebase ID tokens with application sessions; the existing `csess_` guard remains a legacy-shaped isolated mechanism pending an explicit customer flow decision.
