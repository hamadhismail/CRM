# Stage 3.1 Security Validation

| Control | Evidence reviewed | Result |
|---|---|---|
| Firebase token signature, issuer, audience, expiry, revocation | `FirebaseAdminService.verifyIdToken(token, true)` uses Firebase Admin; local-only project and loopback emulator checks | Code review only; no running emulator or integration test. |
| Production Firebase isolation | API refuses `NODE_ENV=production`, non-local project ID, or non-loopback emulator hosts. CRM requires dev mode, local project ID, and loopback Auth emulator URL. | Guard present; runtime proof unavailable. |
| Account status | Staff document is loaded per request; `active: false` rejects principal. Missing field keeps legacy active default. | Code review only. |
| Role / permission enforcement | Nest guards read the API principal; browser-supplied claims are not policy input. | Unit tests authored but not executed. |
| Customer session | Only `csess_` bearer accepted; hash lookup, revoked flag, required parseable expiry and customer ID/phone checked. Query string tokens are not extracted. | Code review only; no emulator validation. |
| Phone matching | New `canCustomerAccessRecord` uses full canonical digits or exact customer ID; no last-10-only comparison introduced. Legacy matching by last 10 digits remains blocked pending explicit resolution. | Static review only. |
| Organization scope | No verified memberships exist; access denies by default. | Code review and unit test authored; not run. |
| User management | Admin-only routes; self role change/disable and protected primary-admin disable are denied; user creation, password mutation and deletion are not exposed. | Code review only; mutation tests absent. |
| Credentials in frontend | Firebase public client settings are demo/local placeholders; no service account or provider secret is in CRM code/config. `.env.example` uses blank/local placeholders. | Static review only; bundle scan unavailable because build did not run. |
| Secrets in logs | Auth event actor references are SHA-256 pseudonyms; OTP/provider services are not enabled. | Static review only; no live log exercise. |
| Request validation | Login input type/length and user role/status/username checks exist; no global Nest validation pipe is configured for DTOs because identity endpoints do not use DTO classes. | Partial; API validation behavior needs implementation and test review. |
| Rate limiting | Process-local 5-failure/15-minute limits for password login and Google exchange. | Not suitable for multiple API instances; shared store remains a release blocker. |

## External access during this check

No Firebase project, production database, email, WhatsApp, or customer account was accessed. Firebase CLI attempted a blocked CLI remote-config fetch and a blocked cloud metadata lookup, then stopped before emulator startup due Java 8 incompatibility. Neither request succeeded. Use local-only project `dolphin-air-local` after installing a supported JDK and restoring package-manager access.

## Security review conclusion

No new critical bypass was demonstrated, but the controls are not runtime-verified. The emulator and test blockers mean this review is insufficient for acceptance or production deployment. In particular, customer OTP, credential lifecycle, shared rate limiting, runtime DTO validation, and browser behavior remain unresolved or unverified.
