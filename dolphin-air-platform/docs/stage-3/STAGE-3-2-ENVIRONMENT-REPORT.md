# Stage 3.2 Environment Report

## Database health recovery (2026-11-22)

- Project-root `.env` is present and loaded by the API health script from the `apps/api` package working directory. Secret values are not reported.
- Both configured connection targets were validated as loopback `dolphin_crm_dev:5432` with their expected dedicated roles; both connections succeeded.
- The false refusal came from comparing `inet_server_addr()::text` as a bare IP when PostgreSQL returns an `inet` value such as `127.0.0.1/32`. A shared parser now accepts only valid host-form CIDRs for IPv4/IPv6 loopback and rejects remote, malformed and non-host-prefix values. Both health script and Prisma service use it.
- `pnpm.cmd db:health`: **PASS** — local database and runtime role verified; schema reports `identity-schema-not-applied`.
- Runtime checks also reject schema creation, elevated role attributes, and membership in the migration role. The migrator has local database connect/schema create access and no superuser, createdb, createrole, replication or RLS-bypass attributes.
- The development `public` schema has zero objects. No migration or grant script was applied.

## Environment checks

| Check | Command | Actual result |
|---|---|---|
| Node | `node --version` | `v24.14.1` |
| npm | `npm.cmd --version` | `11.11.0` |
| Corepack | `corepack --version` | `0.34.6` |
| pnpm | `pnpm.cmd --version` | Command stalled without output; package metadata at the exposed global install reports `11.15.0`. Project pin is `9.15.4`. |
| Java | `java -version` | `1.8.0_471` |
| Java executable | `where.exe java` | Only `C:\Program Files (x86)\Common Files\Oracle\Java\java8path\java.exe` found. No JDK 21+ in searched installation directories. |
| npm registry | `npm.cmd config get registry` | `https://registry.npmjs.org/` |

## Findings

- Workspace `packageManager` pins `pnpm@9.15.4`; no `pnpm-lock.yaml` exists and no workspace `node_modules` exists.
- Corepack cache was directed to a task-specific temporary path. It attempted the pinned pnpm tarball and failed with network `EACCES` connecting to the npm registry.
- `npm.cmd cache ls pnpm@9.15.4` returned no cached entry. `npm.cmd cache verify` failed with `EPERM` while attempting cache cleanup; it did not provide an offline package solution.
- A pnpm store directory exists for store version `v11`; it does not provide the pinned pnpm 9 runtime. No cache was used to bypass integrity or version checks.
- The global `pnpm.cmd` startup stall has no diagnostic output, so its precise cause remains unconfirmed. It was not used to create a lockfile or install with a different package-manager version.

## JDK 21 installation instructions

The current shell has Java 8 only. In a PowerShell terminal with approved package-manager access, install a supported JDK 21 distribution, then open a new terminal and verify it:

```powershell
winget install EclipseAdoptium.Temurin.21.JDK
java -version
javac -version
where.exe java
```

If the new JDK is not first on `PATH`, set `JAVA_HOME` to its installation directory and add `%JAVA_HOME%\bin` to `PATH`. Microsoft’s [Windows Java setup guide](https://learn.microsoft.com/en-us/windows/dev-environment/java) lists this WinGet package and verification steps.

No JDK or global package was installed during this run. The JDK instruction is included because the configured Firestore Emulator runtime cannot start with the current Java version.
