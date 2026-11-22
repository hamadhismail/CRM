# Stage 3 Complete Overview

## Current acceptance: PARTIALLY VERIFIED — NOT ACCEPTED

Checked 2026-11-21 in the new platform. Source implementation, local static checks, unit tests, emulator startup, database access, and runtime verification are tracked separately below.

| Capability | Source implemented | Automated tests | Runtime verified | Remaining work |
|---|---|---|---|---|
| Staff Firebase token verification | Yes: Firebase Admin validates ID token with revocation check and loads Firestore profile | Guard/policy tests; emulator test skipped | No | Start emulator and exercise staff login/API end-to-end |
| CRM staff login/session UI | Yes: Firebase login, restore, logout, route guards, 28/30-minute UI timer | No browser tests | No | Browser integration with local API and Auth emulator |
| Staff administration | Partial: list, role update, active status APIs/UI | Policy tests only | No | Invitation lifecycle, profile edit/details, membership management, audited revocation |
| Roles and permissions | Static registry and guards | Role/permission policy tests passed | No | Persisted role/permission model and management UI; align `finance_accounts`/`visa_processing` labels with requested `ACCOUNTS`/`VISA_OFFICER` names |
| Organization/agency access | Principal organization ID checks and scope helper | Unit policy tests passed | No | Organization/membership models, management endpoints, runtime tenant isolation |
| Customer authentication | Validator for hashed `csess_` Firestore sessions | Synthetic valid/expired/revoked session guard tests passed | No | Customer login/session issuance is disabled; do not mix this validator with Firebase customer identity |
| PostgreSQL/Prisma identity foundation | No: Prisma schema is a placeholder | None | No | Add Prisma models/migrations after isolated DB credentials and CLI are available |
| Durable audit trail | Partial: pseudonymous auth events to stdout | None for admin events | No | Persist invitations, role/status, membership and denied-operation audit events |
| Rate limiting | Not implemented | None | No | Configure and test shared backing store; Redis is not available |
| Firebase emulators | Configured for local project and loopback | One integration test exists | Blocked | Firestore emulator JAR download failed with network access error; no emulator ports listening |
| Workspace checks | Build/lint/typecheck source configured | 11 passed, 0 failed, 1 skipped | Build/static checks only | Firebase and PostgreSQL integration tests and browser tests |

## Environment snapshot

- Node `v24.14.1`; pnpm `9.15.4`; dependencies present and lockfile previously verified frozen/offline.
- JDK 21 is installed at `C:\Program Files\Eclipse Adoptium\jdk-21.0.13.10002-hotspot`; ordinary PATH still resolves Java 8. JDK 21 was selected only for the emulator CLI process.
- Firebase CLI `15.24.0` ran with a temporary local config path. Emulator startup failed while downloading `cloud-firestore-emulator-v1.21.0.jar`; Auth/Firestore ports 9099/8080 are not listening.
- PostgreSQL 17 service is running and localhost:5432 is reachable. Read-only `psql` connection failed because no password was supplied. No `.env`, `DATABASE_URL`, or PG credential variable is configured. The isolated development database was not verified or modified.
- Docker CLI is installed but its daemon is unavailable. Redis is not installed/running.

## Decision

Stage 3 is **PARTIALLY VERIFIED — NOT ACCEPTED**. Do not start Stage 4. The blockers are local emulator artifact download access and isolated PostgreSQL credentials, plus unfinished source capabilities listed above. Historical Stage 3.1–3.3 reports are retained for traceability; this overview supersedes stale environment summaries.
