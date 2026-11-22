# Stage 3.2 Dependency Report

## Install result

Command attempted: `pnpm.cmd install`.

Result: it stalled without output and was stopped. Corepack could not download the exact configured `pnpm@9.15.4` because registry connections were denied (`EACCES`). The repository has no lockfile to install from and no local workspace dependency tree. No lockfile was generated; no force, insecure TLS, or alternate package-manager flags were used.

The existing npm registry is `https://registry.npmjs.org/`. Offline checks found no cached pnpm 9.15.4 package. `npm.cmd cache verify` was also blocked by `EPERM`; it did not resolve the install blocker. The exposed pnpm install reports 11.15.0, which does not match the project pin and was not used to resolve dependencies.

## Declared workspace dependency versions

These are manifest ranges, not installed/resolved versions:

| Workspace | Declared dependencies |
|---|---|
| Root | Turborepo `^2.3.3`, TypeScript `^5.7.2`, ESLint `^9.16.0`; pnpm pinned at `9.15.4` |
| CRM | React `^18.3.1`, Firebase `^12.16.0`, Vite `^6.0.1`, React Router `^7.0.2`, Tailwind `^4.0.0`, TanStack Query `^5.62.8`, Zustand `^5.0.2` |
| Portal | Next.js `^15.1.0`, React `^18.3.1`, Tailwind `^4.0.0` |
| API | NestJS `^10.4.15`, `@nestjs/config ^3.3.0`, Firebase Admin `^14.2.0`, class-transformer `^0.5.1`, class-validator `^0.14.1`, TypeScript `^5.7.2` |
| Worker | TypeScript `^5.7.2`, tsx `^4.19.2` |
| Shared packages | Workspace UI/types/contracts/utils/template package manifests remain referenced through `workspace:*` where used |

The API added class-validator and class-transformer to support validated request DTOs and global validation. A root `test` script now dispatches through Turbo to package test scripts; the API test script includes policy and opt-in emulator tests. These changes are not lockfile-resolved or install-verified.

## Resolution required

Restore registry access or provide a trusted offline package containing pnpm 9.15.4 through the approved package-management channel. Then run `corepack pnpm install` to generate `pnpm-lock.yaml`, review the lockfile, and rerun install/build checks. Do not use pnpm 11 to generate a lockfile for this pinned workspace.
