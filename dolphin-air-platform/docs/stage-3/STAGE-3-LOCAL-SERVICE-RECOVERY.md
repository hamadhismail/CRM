# Stage 3.1 Local Service Recovery

## Status (2026-11-21)

### PostgreSQL 17

- Windows service `postgresql-x64-17`: running, automatic start, service account `NT AUTHORITY\NetworkService`.
- PostgreSQL client: 17.11; `127.0.0.1:5432` accepts TCP connections.
- The service executable reports data directory `C:\Program Files\PostgreSQL\17\data`; this execution account is denied access to that directory and `pg_hba.conf`.
- A passwordless local connection as the current Windows account fails with `fe_sendauth: no password supplied`. No `DATABASE_URL`/PG credential variables are configured.
- No administrator connection path is available to this process. No password was guessed/reset; no database/role was created and no database was queried beyond connection-authentication failure.
- Root `.gitignore` ignores `.env` and `.env.*`, except `.env.example`; the project API loads the root `.env` when run from its workspace. No `.env` was created.

### Owner SQL Shell instructions

A project owner with an authorized PostgreSQL administrator credential can create isolated credentials without putting passwords in SQL history:

1. Open **SQL Shell (psql)** from the Windows Start menu.
2. Connect to server `localhost`, database `postgres`, port `5432`, using the administrator username and password already authorized by the owner. Do not guess or reset the password.
3. Enter the following commands. `\password` prompts securely and does not echo the new secret:

```sql
CREATE ROLE dolphin_crm_dev_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
\password dolphin_crm_dev_migrator
CREATE ROLE dolphin_crm_dev_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
\password dolphin_crm_dev_app
CREATE DATABASE dolphin_crm_dev OWNER dolphin_crm_dev_migrator ENCODING 'UTF8';
\connect dolphin_crm_dev
GRANT CONNECT ON DATABASE dolphin_crm_dev TO dolphin_crm_dev_app;
GRANT USAGE ON SCHEMA public TO dolphin_crm_dev_app;
ALTER DEFAULT PRIVILEGES FOR ROLE dolphin_crm_dev_migrator IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO dolphin_crm_dev_app;
ALTER DEFAULT PRIVILEGES FOR ROLE dolphin_crm_dev_migrator IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO dolphin_crm_dev_app;
```

The migrator is scoped to ownership of this development database and is not a cluster administrator. The app role has runtime DML only; it cannot create databases, roles, or schema objects. Use the migrator secret only for local migrations and the app secret for runtime. Store local connection strings in the ignored root `.env`, never in Git/docs/chat. URL-encode reserved characters in URI passwords. Do not configure production endpoints. Verify locally with `psql -X -w -h 127.0.0.1 -p 5432 -U dolphin_crm_dev_app -d dolphin_crm_dev -c 'SELECT current_database(), 1'` after configuring a local password source; do not enable password echo.

## Firebase Emulators

- JDK 21.0.13 selected through process-scoped `JAVA_HOME` and `PATH`.
- Installed Firebase CLI 15.24.0 declares the official Firestore URL as `https://storage.googleapis.com/firebase-preview-drop/emulator/cloud-firestore-emulator-v1.21.0.jar`.
- DNS resolution for `storage.googleapis.com` succeeds. Direct TCP to port 443 fails. WinHTTP reports direct access/no proxy, and there are no HTTP(S)_PROXY/ALL_PROXY variables. The HTTPS HEAD request and Firebase CLI download both fail to connect. This indicates outbound HTTPS egress/firewall/network policy as the observed blocker; no certificate/TLS bypass was attempted.
- Default local Firebase emulator cache contains `ui-v1.15.0.zip` only; the Firestore JAR is absent.
- A single official tooling attempt (`firebase emulators:start --project dolphin-air-local --only auth,firestore --config firebase.json`) failed on the Firestore download and shut down before either emulator became ready. Ports 9099/8080 were closed afterward.
- The integration test was not run because it requires both emulators. Do not run it against Auth-only or production.

## Manual actions required

- Project owner: establish authorized isolated PostgreSQL roles/database with the SQL Shell steps above, then provision local secrets through the approved local mechanism.
- Environment/network administrator: allow outbound HTTPS to the official Firebase artifact host or provision the official artifact through an approved authenticated channel.
- Afterward: verify both emulators, run the API Firebase integration test, verify database connectivity, and update Stage 3 acceptance only from actual results.
