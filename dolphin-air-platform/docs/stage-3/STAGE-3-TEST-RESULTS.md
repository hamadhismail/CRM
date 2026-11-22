# Stage 3 Test Results

## Current result: Unit/policy tests passed; emulator integration blocked (2026-11-21)

The API test command directly executed `tsx --test test/identity-policy.test.ts test/auth-emulator.test.ts`: **11 passed, 0 failed, 1 skipped**. The skipped test is `Firebase emulator accepts an active, verified platform staff identity`. It requires both Auth and Firestore emulators. Auth Emulator was started independently and verified on loopback, but Firestore could not fetch its official emulator artifact, so the integration test was not run against an incomplete emulator setup.

An initial test attempt stopped before discovery because Node 24 on this Windows execution host returned `uv_os_get_passwd ENOMEM` from `os.userInfo()`. The direct API test run used a temporary, deleted preload supplying a local username to tsx's temporary-directory helper only. Application code, test code, auth checks, and fixtures were unchanged.

The workspace `pnpm.cmd test` command also completed, but Turbo served its cached test result. The direct API test command above is the uncached execution and reported the counts above.

These results verify source unit/policy tests only. Firebase integration, PostgreSQL migration execution, runtime identity flows, and browser end-to-end behavior remain unverified. See `STAGE-3-RUNTIME-VERIFICATION.md`.
