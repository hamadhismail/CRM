# Stage 3.1 Build Results

## Workspace and configuration

The workspace is `pnpm` + Turborepo with `apps/*` and `packages/*`. Root tasks are `build`, `lint`, and `typecheck`; root `dev` runs Turbo in parallel. CRM uses Vite, portal uses Next.js, API uses Nest CLI, and worker uses `tsc`. Application scripts are present. API test script targets `test/identity-policy.test.ts`. No lockfile exists, package manager is pinned to pnpm 9.15.4, and the exposed pnpm 11.15.0 binary stalls for an unconfirmed reason. No dependencies are installed.

## Results

| Check | Command | Result | Cause |
|---|---|---|---|
| Dependency install | `pnpm.cmd install` | Blocked; command stalled and was stopped. | Pinned pnpm 9.15.4 is not cached; Corepack download from npm registry failed with network `EACCES`. No lockfile exists. |
| CRM build | `pnpm.cmd --filter @dolphin/crm build` | Not run to completion | Workspace dependencies and a working pinned pnpm are unavailable. |
| Portal build | `pnpm.cmd --filter @dolphin/portal build` | Not run | Same blocker. |
| API build | `pnpm.cmd --filter @dolphin/api build` | Not run | Same blocker. |
| Worker build | `pnpm.cmd --filter @dolphin/worker build` | Not run | Same blocker. |
| Typecheck | `pnpm.cmd typecheck` | Not run to completion | Same blocker. |
| Lint | `pnpm.cmd lint` | Not run to completion | Same blocker. |
| API unit tests | `pnpm.cmd --filter @dolphin/api test` | Not run to completion | Same blocker; `tsx` and Nest dependencies are not installed. |

No build, typecheck, lint, or test is claimed as passing. The pnpm workspace manifests and relevant JSON configuration parsed successfully in a dependency-free check; this does not validate TypeScript compilation or package resolution.

No code fix could be compiled in this environment. The prior Stage 3 local-only Firebase guard and customer session expiry checks remain in place; they need compiler and runtime validation after environment access is restored.
