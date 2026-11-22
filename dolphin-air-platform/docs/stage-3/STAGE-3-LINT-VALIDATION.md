# Stage 3 Lint Configuration Validation

## Result: Passed

Validated 2026-11-21 with pnpm 9.15.4 and ESLint 9.39.5. The root configuration now uses `eslint.config.mjs`, avoiding a root-wide ESM package change. TypeScript ESLint recommended rules cover TS/TSX source under `apps/` and `packages/`; React and React Hooks rules cover CRM and shared UI; Next recommended rules cover portal sources and the root ESLint config file so Next 15's build-time detector sees the plugin.

Ignore patterns cover `node_modules`, `.next`, `dist`, `build`, `.turbo`, `coverage`, `*.tsbuildinfo`, and the generated `next-env.d.ts`. API, worker, CRM, portal, and shared package `eslint .` scripts all found their applicable files. `pnpm.cmd lint` passed: 10 lint tasks successful, 0 errors, 0 warnings.

Lint found and fixed two unused API imports and CRM issues: an unused import, a render-time clock read, and state updates in synchronous effect paths. No lint rules were disabled to clear these findings. The staff list initial fetch is scheduled after the effect stack; the existing loading state remains active until it resolves.

## Dependency and lockfile status

Root dev dependencies include `@eslint/js` 9.39.5, `typescript-eslint` 8.73.0, `eslint-plugin-react` 7.37.5, `eslint-plugin-react-hooks` 7.1.1, and `@next/eslint-plugin-next` 15.5.29. The existing `pnpm-lock.yaml` resolves these versions. `pnpm install --offline --frozen-lockfile` completed successfully and reported the lockfile up to date.

## Next and TypeScript checks

`eslint --print-config` confirmed `@typescript-eslint/no-unused-vars`, `react-hooks/rules-of-hooks`, and `@next/next/no-img-element` are active. The forced portal build detected Next rules with no plugin warning after the root config itself was included in the matching scope.

`apps/portal/tsconfig.json` was reviewed and left unchanged. It inherits `strict: true` from the shared config; JSX mode, aliases, `allowJs`, and generated type includes remain intact.
