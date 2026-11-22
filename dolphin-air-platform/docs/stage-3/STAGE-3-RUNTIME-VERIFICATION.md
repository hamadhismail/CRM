# Stage 3 Runtime Verification

## Result: Partially verified; required local integrations remain blocked

### Firebase Auth and Firestore

The Firebase CLI process used Temurin JDK 21.0.13 explicitly (`JAVA_HOME` and process `PATH`), project `dolphin-air-local`, and checked-in loopback configuration. Auth Emulator was verified independently in a prior check, but in the current combined official-tooling startup attempt Firestore failed to download and shut down the emulator process before readiness. Current ports 9099 and 8080 are closed.

Firebase CLI 15.24.0 declares the official artifact URL `https://storage.googleapis.com/firebase-preview-drop/emulator/cloud-firestore-emulator-v1.21.0.jar`. DNS resolves the host, but direct TCP/HTTPS on port 443 fails. WinHTTP reports direct access/no proxy and there are no process HTTP proxy variables. The artifact is absent from the official local emulator cache (only the Firebase UI ZIP is present). The observed blocker is outbound HTTPS connectivity; no TLS verification was disabled and no alternate mirror was used.

The API emulator integration test requires both Auth and Firestore. It was not run because Firestore was unavailable. No emulator test data was created.

### PostgreSQL / Prisma

PostgreSQL 17 service is running (NetworkService account) and loopback port 5432 is reachable. The service data directory is access-restricted to this process. Passwordless connection using the current Windows account fails with `fe_sendauth: no password supplied`. No database credential environment variables are configured. The Prisma schema remains a placeholder and Prisma tooling is absent. No credentials were guessed/reset, and no database or role was created or modified.

Owner setup instructions are in `STAGE-3-LOCAL-SERVICE-RECOVERY.md`. The isolated DB and credentials must be provisioned before Prisma schema/migration validation.

### Workspace verification

On 2026-11-21, forced lint passed 10/10 tasks; forced TypeScript checks passed 10/10; forced build passed CRM, Portal, API, Worker (4/4). Direct API tests passed 11, failed 0, skipped 1. The skipped test is the Firestore-dependent Firebase emulator integration test.

### Status

| Capability | Status |
|---|---|
| JDK 21 selected | Verified |
| Firebase Auth Emulator | Previously started and endpoint returned HTTP 200; not running after current combined attempt |
| Firestore Emulator | Blocked by outbound HTTPS connectivity to official artifact host |
| Firebase integration | Not run; required emulator unavailable |
| PostgreSQL service/listener | Verified locally |
| Authorized isolated database access | Unavailable to this process |
| Prisma identity schema/migrations | Not started; authorized DB prerequisite unmet |
| Runtime identity and authorization | Not verified end-to-end |
| Stage 3 acceptance | Partially verified; not accepted |
