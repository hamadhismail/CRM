import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const crmDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rootDirectory = resolve(crmDirectory, '../..');
const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const environment = {
  ...process.env,
  VITE_API_URL: 'http://127.0.0.1:3001',
  VITE_DATABASE_IDENTITY_AUTH: 'true',
  VITE_FIREBASE_API_KEY: 'demo-local-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'localhost',
  VITE_FIREBASE_PROJECT_ID: 'dolphin-air-local',
  VITE_FIREBASE_APP_ID: '1:1234567890:web:stage334e2e',
  VITE_FIREBASE_AUTH_EMULATOR_URL: 'http://127.0.0.1:9099',
};

for (const args of [
  ['--filter', '@dolphin/api', 'build'],
  ['--filter', '@dolphin/crm', 'build:e2e'],
  ['--filter', '@dolphin/crm', 'exec', 'playwright', 'test', '--config', 'playwright.config.ts'],
]) {
  const result = spawnSync(pnpmCommand, args, { cwd: rootDirectory, env: environment, stdio: 'inherit', shell: process.platform === 'win32', windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
