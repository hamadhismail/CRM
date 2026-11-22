# Stage 3 Environment Setup and Current Verification

## Toolchain

| Tool | Current result |
|---|---|
| Node | `v24.14.1` |
| pnpm | `9.15.4` |
| Java selected by normal PATH | `1.8.0_471` |
| Installed JDK 21 | Temurin `21.0.13.1+2`, explicitly selected for Firebase CLI process |
| Firebase CLI | `15.24.0`; process-local temporary XDG config used |
| PostgreSQL | Local Windows service `postgresql-x64-17` running; PostgreSQL `17.11` client installed |
| PostgreSQL listener | Loopback `127.0.0.1:5432` reachable |
| Redis | No service/client found |
| Docker | CLI `29.7.2`; daemon pipe unavailable |

## Firebase emulator outcome

Configuration selects only `dolphin-air-local`; Auth and Firestore bind to `127.0.0.1:9099` and `127.0.0.1:8080`. JDK 21 was explicitly selected in the Firebase CLI process. Auth Emulator started independently, reported ready at `127.0.0.1:9099`, and returned HTTP 200 on its local endpoint. It was stopped after verification.

Firestore Emulator download failed for `cloud-firestore-emulator-v1.21.0.jar`. A single HEAD request to the official configured artifact URL, `https://storage.googleapis.com/firebase-preview-drop/emulator/cloud-firestore-emulator-v1.21.0.jar`, failed with `Unable to connect to the remote server`; no alternate source was used. Thus the skipped API integration test, which requires both Auth and Firestore, remains unrun. Firebase CLI also emitted expected restricted-network metadata/MOTD warnings; these did not prevent Auth-only startup.

The Firebase CLI could not read its default user config path in an earlier attempt. A process-local `XDG_CONFIG_HOME` under temporary storage resolved that without changing user/system configuration.

## PostgreSQL outcome

PostgreSQL service is running and TCP port 5432 is reachable on loopback. A read-only connection attempt to the maintenance database returned `fe_sendauth: no password supplied`. No `DATABASE_URL` or PG credential environment variables are configured. No database was inspected or modified, and `dolphin_crm_dev` was not created. Do not guess credentials or access existing databases. An authorized isolated development credential is required before schema validation, migration, Prisma integration, or database tests.

## Recovery actions

1. Provide trusted network access to the official Firebase emulator artifact source (or pre-provision its official verified artifact) and run Auth + Firestore integration tests.
2. Provide an authorized isolated PostgreSQL development credential for `dolphin_crm_dev` through a local secret mechanism.
3. Install Prisma CLI/client from the trusted workspace registry and validate migrations only against that isolated database.
4. Complete the gated identity runtime work, then run integration and browser authentication flows.
