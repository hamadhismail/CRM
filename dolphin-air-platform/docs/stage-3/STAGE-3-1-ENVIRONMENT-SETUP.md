# Stage 3.1 Environment Setup

## Inspected environment

| Component | Detected | Finding |
|---|---|---|
| Node.js | `v24.14.1` | Available. No Node engine ranges are declared in workspace manifests. |
| Corepack | `0.34.6` | Available, but its default cache path is outside the writable workspace. A temp `COREPACK_HOME` was used. |
| Project package manager | `pnpm@9.15.4` in root manifest | Required pinned version is not cached. |
| Exposed `pnpm.cmd` | `11.15.0` at global npm path | Not the pinned version; it stalled without output during version/install calls. Exact cause of the stall is unconfirmed. Not used to generate a lockfile. |
| Lockfile | None | There is no `pnpm-lock.yaml`, so no existing dependency resolution is available. |
| Workspace dependencies | None | No root `node_modules` found. Dependencies were not installed. |
| Firebase CLI | `15.24.0`, already installed globally | Used without signing in. No global packages were installed. |
| Java | `1.8.0_471` | Firebase CLI 15.24 requires Java 21+ for the Firestore emulator. |
| Playwright | Not present in workspace manifests or installed dependencies | Frontend automation could not be run. |

## Commands and outcomes

- `node --version` — passed: `v24.14.1`.
- `corepack --version` — passed: `0.34.6`.
- `pnpm.cmd --version` — stalled without output; stopped after timeout.
- `corepack pnpm --version` with `COREPACK_HOME` set to a task-specific temp directory — failed because downloading `pnpm-9.15.4.tgz` from `registry.npmjs.org` was denied (`EACCES`).
- `pnpm.cmd install` — stalled without output; stopped. No lockfile or `node_modules` was created.
- `firebase.cmd --version` with an isolated temporary `XDG_CONFIG_HOME` — passed: `15.24.0`.
- `firebase.cmd emulators:start --only auth,firestore --project dolphin-air-local --non-interactive` — failed before startup because installed Java is 8; Firebase CLI requires Java 21+. CLI remote-config fetch was also blocked. No emulator service started and no production Firebase credentials were loaded.

## Local emulator configuration

`firebase.json` binds Auth Emulator to `127.0.0.1:9099` and Firestore Emulator to `127.0.0.1:8080`. `.firebaserc` selects only `dolphin-air-local`. `firestore.rules` denies client access by default; Firebase Admin test access would use only the local emulator. `.env.example` already contains emulator-only API and CRM settings and the customer flow remains disabled.

With a supported JDK and the pinned package manager available, start the emulators in a PowerShell window:

```powershell
$env:XDG_CONFIG_HOME = Join-Path $env:TEMP 'dolphin-air-xdg'
$env:CI = '1'
$env:FIREBASE_CLI_DISABLE_UPDATE_CHECK = '1'
firebase.cmd emulators:start --only auth,firestore --project dolphin-air-local --non-interactive
```

The network-restricted environment prevented downloading the pinned pnpm release and Firebase emulator artifacts. No production configuration was altered.
