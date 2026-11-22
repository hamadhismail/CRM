# Stage 3.2 Firebase Emulator Report

## Local configuration

- Project ID: `dolphin-air-local`.
- Auth Emulator: `127.0.0.1:9099`.
- Firestore Emulator: `127.0.0.1:8080`.
- Client Firestore rules deny all access by default. API Admin SDK access is accepted only when the configured project ID is local and both emulator hosts are loopback.
- CRM Firebase initialization requires development mode, the local project ID, and a loopback Auth Emulator URL.
- `apps/api/scripts/seed-identity-emulator.ts` can create explicit synthetic `.test` identities only when both emulator hosts and the local project ID are configured. It requires `DOLPHIN_DEV_USERS_JSON`, validates internal roles, does not log passwords, and refuses to overwrite conflicting user records. No seed command was run.

## Startup attempt

Command attempted:

```powershell
$env:XDG_CONFIG_HOME = Join-Path $env:TEMP 'dolphin-air-xdg'
$env:CI = '1'
$env:FIREBASE_CLI_DISABLE_UPDATE_CHECK = '1'
firebase.cmd emulators:start --only auth,firestore --project dolphin-air-local --non-interactive
```

Actual result: Firebase CLI `15.24.0` exited before starting either emulator. It reported that Java before 21 is unsupported; this machine provides Java 8. The CLI’s remote configuration and cloud metadata attempts were blocked by network restrictions. No emulator endpoint became operational, no synthetic user was created, and no production Firebase project or credential was used.

## Next local commands

After installing a JDK 21+ and restoring the package-manager environment:

```powershell
$env:XDG_CONFIG_HOME = Join-Path $env:TEMP 'dolphin-air-xdg'
$env:CI = '1'
$env:FIREBASE_CLI_DISABLE_UPDATE_CHECK = '1'
$env:FIREBASE_PROJECT_ID = 'dolphin-air-local'
$env:FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'
$env:FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
firebase.cmd emulators:start --only auth,firestore --project dolphin-air-local --non-interactive
```

In another PowerShell window, supply test-only credentials outside tracked files and seed:

```powershell
$env:NODE_ENV = 'development'
$env:FIREBASE_PROJECT_ID = 'dolphin-air-local'
$env:FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'
$env:FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
$env:DOLPHIN_DEV_USERS_JSON = '[{"email":"synthetic-superadmin@dolphin-air.test","password":"<unique-test-only-secret-12-plus-chars>","displayName":"Synthetic Super Admin","role":"super_admin","organizationIds":["test-org"]}]'
pnpm.cmd --filter @dolphin/api seed:identity
```

Replace the placeholder with a one-off synthetic password in the current shell only. Never store it in tracked files. The test user is for local emulators only.
