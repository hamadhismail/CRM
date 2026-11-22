# Stage 3.3 Session Security

## CRM staff session

- CRM uses Firebase client SDK sign-in and provider session persistence (`browserLocalPersistence` for remembered sessions and `browserSessionPersistence` otherwise). Firebase credentials are not written by application code to localStorage.
- `onAuthStateChanged` restores the provider session and calls `GET /api/auth/me`; failed API verification clears the local session.
- API requests obtain the current Firebase ID token from the SDK. Firebase SDK refresh behavior is used; the API validates token revocation on protected staff authentication.
- Authenticated `POST /api/auth/logout` calls Firebase Admin `revokeRefreshTokens` before the client clears local state. It attempts a durable `auth.session.revoked` audit event when PostgreSQL is available. This invalidates refresh sessions for the account; local sign-out still completes if remote revocation/audit is unavailable.
- Logout clears the activity marker and broadcasts a cross-tab logout. The stored `crm_last_activity` value is activity metadata only.
- The CRM warns after 28 minutes idle and signs out locally after 30 minutes. This browser timer is not a server-side idle-session guarantee.

## Emulator evidence

The local Auth Emulator test passed for synthetic account creation/sign-in, Admin SDK token verification, forged-token rejection, the API service's refresh-token revocation (`checkRevoked=true`) and disabled-user rejection. The test used only project `dolphin-air-local` and loopback `127.0.0.1:9099`.

## Limitations

- Firebase Auth Emulator does not establish production session-cookie behavior; no server-issued Firebase session cookies or custom session store were added.
- Cross-tab/browser and inactivity timer behavior have not been exercised in a browser E2E run.
- Customer `csess_` sessions remain Firestore-backed; their issuance and lifecycle are not being changed here.
- Staff access is checked on each API request, while a client-side idle timer is supplementary. A production server-side idle policy remains a separate control.
