# Stage 3.2 Build Results

All workspace commands were attempted through `pnpm.cmd`, but each stalled before any package script emitted output and was stopped. No build, lint, or typecheck result is claimed. The root cause is the unavailable pinned package-manager runtime and absent dependencies; see the dependency report.

| App | Expected script | Command attempted | Actual result |
|---|---|---|---|
| CRM | Vite + TypeScript `build` | `pnpm.cmd build` | Not executed; pnpm stalled before Turbo task output or dependency resolution. |
| Portal | Next.js `build` | `pnpm.cmd build` | Not executed; pnpm stalled before Turbo task output or dependency resolution. |
| API | Nest `build` | `pnpm.cmd build` | Not executed; pnpm stalled before Turbo task output or dependency resolution. |
| Worker | TypeScript `build` | `pnpm.cmd build` | Not executed; pnpm stalled before Turbo task output or dependency resolution. |
| Typecheck | Turbo workspace task | `pnpm.cmd typecheck` | Stalled before workspace scripts; no TypeScript result. |
| Lint | Turbo workspace task | `pnpm.cmd lint` | Stalled before workspace scripts; no lint result. |
| Tests | Turbo workspace task | `pnpm.cmd test` | Stalled before workspace scripts; no tests ran. |

Package manifests and JSON configuration were inspected. API and worker TypeScript configurations explicitly override the root `noEmit` setting so their build scripts can emit output. CRM, portal, API, worker, and shared package resolution remain unverified. No unrelated feature files were changed to suppress errors.
