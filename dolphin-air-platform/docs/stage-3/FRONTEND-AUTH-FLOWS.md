# Frontend Authentication Flows

## CRM

1. Login accepts legacy username/email plus password, or Google popup.
2. API validates against Firebase Auth / legacy staff record through local emulator boundary; Firebase client exchanges custom token and obtains ID token.
3. `AuthProvider` calls `/api/auth/me`; protected route renders loading, login, unauthorized, or CRM shell based on verified response and role.
4. Authenticated API requests attach Firebase ID token. Logout clears Firebase session and cross-tab session markers.
5. Inactivity warning begins at 28 minutes; sign-out occurs at 30 minutes. Cross-tab activity/logout uses localStorage timestamp and BroadcastChannel.

Local emulator config is required; absent config disables sign-in. Remember-me controls Firebase persistence. Forgot-password retains the old guidance to contact an administrator. Session timing parity has code coverage pending manual browser verification.

## Customer portal

OTP sign-in is intentionally unavailable. `CustomerAuthBoundary` reports this state and does not send real or simulated OTP. API customer guard accepts only server-issued hashed `csess_` sessions after a verified phone-to-customer association. Enabling the flow requires provider credentials in a safe environment, verified customer lookup contract, anti-enumeration tests, and durable shared rate limiting.
