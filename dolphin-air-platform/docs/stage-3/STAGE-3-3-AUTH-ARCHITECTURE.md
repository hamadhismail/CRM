# Stage 3.3 Authentication Architecture

## Current path

Firebase Authentication is the credential provider. NestJS verifies Firebase ID tokens with revocation checking, then the default staff-auth path loads the trusted Firestore staff profile and builds the existing `StaffPrincipal`. The central static permission registry and existing guards remain authoritative by default.

## Database identity path

An opt-in development-only path now exists behind `DATABASE_IDENTITY_AUTH_ENABLED=true`. It is off in the project environment and rejected in production. When explicitly enabled, the request must include `x-organization-id`; Firebase verification still occurs first. The API resolves the exact Firebase UID to a pre-provisioned active PostgreSQL user, validates active organization and membership, requires exactly one active internal system role, validates role scope/user type and exact permission parity, then returns the existing principal contract. Failure does not fall back to Firestore.

This boundary is implemented and locally integration-tested, but remains unapproved for general use. No account is created on first sign-in. An operator must provision and link the UID through an authorized process. There is no CRM organization selector or browser E2E proving the header flow yet.

## Emulator isolation

`FirebaseAdminService` now validates Auth and Firestore emulator endpoints independently. Both remain loopback-only and restricted to `dolphin-air-local`; production mode or another project is refused. Auth-only token tests no longer require Firestore to start. Firestore-backed staff profile tests still require the Firestore emulator.

## Security boundaries

- Token signature, issuer/audience, expiry and revocation validation remain in Firebase Admin SDK.
- Authenticated staff logout invokes Firebase refresh-token revocation; the CRM then clears provider/local session state.
- Email verification and supported sign-in provider checks precede identity resolution.
- PostgreSQL identity resolution is fail-closed, transactionally locks organization, membership and user state, and does not auto-provision identities or privileges.
- Existing static permission guards remain safe only while the database permission set equals the static permission set; the resolver checks this for every resolved role.
- Customer session validation is unchanged and still Firestore-backed.

## Stage 3.3.2 authenticated API verification (2026-11-22)

An opt-in local integration test now starts the compiled NestJS API as a separate child process with `DATABASE_IDENTITY_AUTH_ENABLED=true` scoped only to that child. The test confirms the configured database is `dolphin_crm_dev` on loopback, the migration account is used only for synthetic fixture setup/cleanup, and the API itself connects as `dolphin_crm_dev_app`. It provisions temporary synthetic Firebase and PostgreSQL staff identities against the existing `sales` role and permission catalog; it does not add permissions or enable the flag in project defaults.

The request path was exercised over HTTP: emulator-issued signed Firebase token, NestJS token verification, PostgreSQL identity/membership and permission resolution, required organization header, and guarded Leads routes. No-token and missing-organization requests were rejected; a foreign-organization lead was not disclosed; a mismatched organization context was rejected. Authorized list, create, detail, edit, status, note, archive, archived-list, restore, active-list and logout/revocation requests succeeded. A follow-up request with the revoked token was rejected. Runtime database identity was verified as the restricted app role, including denial of audit-event UPDATE. Test fixtures and emulator user accounts were removed in test cleanup.

This is local authenticated API integration evidence, not CRM browser verification. The CRM currently loads `/api/auth/me` before its organization context is established, while database identity mode requires `x-organization-id` on that request. The CRM has no organization-selection bootstrap in this flow. Browser E2E therefore remains not run, and database identity mode remains disabled by default. Firestore is not needed for this database-backed staff path; Firestore-backed staff/customer paths remain separate and unverified here.

## Stage 3.3.3 secure organization bootstrap

`GET /api/auth/organizations` uses a dedicated Firebase token guard. It verifies a Firebase-signed, non-revoked ID token, verified email, and allowed staff sign-in provider before database lookup. The endpoint is available only to a development API process with `DATABASE_IDENTITY_AUTH_ENABLED=true`; it has no Firestore fallback. PostgreSQL resolves the caller by Firebase UID and returns only `{ id, name }` for active internal organizations where the account, membership, system role, role scope, organization type, and exact static permission catalog pass the existing identity policy. Unknown or disabled accounts are denied; an active user with no eligible memberships receives an empty list. Bootstrap creates no user, membership, or privilege.

The route has a 30-per-minute in-process limit per verified Firebase UID. This is restricted to the development-only emulator path and is not distributed production rate limiting. Every selected organization is revalidated by `/api/auth/me` and each protected API request continues to require and validate its organization context. Frontend selection is never authorization evidence.

CRM now supports single-organization auto-selection, a multi-organization chooser, an organization switcher, an access-denied state for zero eligible memberships, and session storage of only the selected organization ID. Database-mode `/api/auth/me` runs only after organization selection. Changing organizations remounts the workspace to reset scoped UI state. The `VITE_DATABASE_IDENTITY_AUTH=true` setting is honored only in development builds; the API flag remains separately required in the local development process.

Logout uses the narrow signed-token guard so a user can revoke its own Firebase session before selecting an organization. All other protected endpoints retain the existing staff guard and mandatory organization context.

## Stage 3.3.4 real browser verification (2026-11-22)

The CRM organization bootstrap and protected profile flow have now been exercised in Microsoft Edge against the local Auth Emulator, an isolated NestJS process, and PostgreSQL `dolphin_crm_dev`. The E2E build uses the existing Firebase client and real emulator-issued tokens. It sets the development-only frontend switch only in the dedicated E2E build; the API identity flag is present only in the spawned test API process. Project `.env` and default authentication settings remain unchanged.

The test confirmed that `/api/auth/me` is not called before organization selection and protected CRM navigation is absent while the selector is shown. A sole eligible organization auto-selects; multiple eligible organizations require selection; zero memberships show access denied. Switching revalidates membership server-side and resets the workspace. Browser refresh restores the valid session and organization. Logout revokes the Firebase session; a request using the previously captured ID token is denied afterward.

This verifies the staff identity path for the tested roles and Leads workflows locally. It does not enable database-backed authorization by default, verify customer authentication, or complete the remaining Stage 3 requirements.
