# Authentication Architecture

Firebase Authentication remains the selected identity provider because the source CRM already uses Firebase custom tokens, Google sign-in and phone identity. The new API accepts no browser-supplied role, permission, or user identity as authority. Staff tokens are signature, issuer, audience, expiry, and revocation checked through Firebase Admin; the active staff record is reloaded from Firestore on every request. Firestore emulator is the only enabled identity store in this stage.

The API uses bearer ID tokens. Password login preserves the legacy identifier and comparison behavior only in the local emulator boundary, then exchanges the verified account for Firebase Auth. Google login takes an ID token (not an email claim) and requires Google provider and verified email. The old forged `bearer_*` compatibility tokens are rejected.

Customer guard accepts only hashed, server-issued `csess_` records. A Firebase phone token alone is not sufficient: the legacy flow first matches the verified phone to a customer/traveler record and then issues `csess_`. No endpoint issues OTP/session credentials yet: provider contract and safe isolated configuration are missing. The portal renders an explicit unavailable state rather than a fake success.

Roles are the legacy `admin`, `agent`, and `accounts`. Permissions combine verified legacy per-user arrays with source-confirmed account-role capabilities. Organization membership is empty and fails closed. No Prisma identity schema or migration was created because the source of truth is Firebase and introducing parallel user identities would be unsafe.

Rate limiting is process-local (5 failures per IP and normalized identifier for password login; 5 failures per IP for Google exchange per 15 minutes); deployable multi-instance enforcement requires shared storage such as Redis and is a release blocker. Audit events log pseudonymous identifiers and outcomes only. Auth endpoints are under `/api/auth`; CORS is limited to configured CRM origin.
