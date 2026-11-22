# Stage 3.3 Authentication Flows

## Current verified-by-inspection surface

### Staff

1. The CRM login page calls the Firebase client SDK for email/password or Google sign-in.
2. The CRM auth provider obtains the signed-in Firebase identity and calls `GET /api/auth/me`.
3. The API verifies a Firebase ID token, checks account state and resolves role and organization data server-side.
4. Protected CRM routes use the current user/permission state.
5. Logout and inactivity/session-warning behavior exist in the CRM foundation, but runtime behavior has not been tested in Stage 3.2 because dependencies were unavailable.

No password recovery screen or secure staff invitation/provisioning flow is currently present. The login screen directs users to an administrator for access or password reset.

### Customer

Customer login is disabled in the portal. The UI states that no one-time code was sent. API customer session read/logout endpoints require an existing server-issued session, but no supported customer sign-in or session issuance flow is present. Email/password or phone OTP must not be presented as complete until account association and emulator tests pass.

## Target flow after environment gate

- Staff: Firebase sign-in → API verifies ID token and active account → API resolves roles, permissions, and memberships → CRM restores the server-authorized profile. Logout clears client credentials and revokes any server-side session metadata supported by the selected design.
- Staff recovery: use Firebase's supported recovery mechanism with generic account-safe responses; do not mint temporary passwords.
- Staff invitation: an authorized administrator provisions the Firebase identity and a pending application profile; invitation delivery remains disabled until an approved provider exists. Activation and role assignment must be separately authorized and audited.
- Customer: choose a supported Firebase provider only after confirming safe account association; validate the authenticated provider identity and account relationship server-side before issuing access. No phone-number-only matching.

These target flows are design direction, not implemented or verified behavior.
