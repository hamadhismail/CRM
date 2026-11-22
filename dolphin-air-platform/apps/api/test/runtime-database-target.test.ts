import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isPostgresLoopbackAddress,
  validateRuntimeDatabaseTarget,
} from '../src/database/runtime-database-target.policy';

test('PostgreSQL loopback address accepts IPv4 and IPv6 CIDR representations', () => {
  assert.equal(isPostgresLoopbackAddress('127.0.0.1/32'), true);
  assert.equal(isPostgresLoopbackAddress('127.42.0.9/32'), true);
  assert.equal(isPostgresLoopbackAddress('::1/128'), true);
  assert.equal(isPostgresLoopbackAddress('::ffff:127.0.0.1/128'), true);
  assert.equal(isPostgresLoopbackAddress('127.0.0.1'), true);
});

test('PostgreSQL loopback address rejects remote, malformed and non-host CIDR values', () => {
  assert.equal(isPostgresLoopbackAddress('198.51.100.10/32'), false);
  assert.equal(isPostgresLoopbackAddress('::ffff:198.51.100.10/128'), false);
  assert.equal(isPostgresLoopbackAddress('127.0.0.1/24'), false);
  assert.equal(isPostgresLoopbackAddress('127.0.0.1/not-a-prefix'), false);
  assert.equal(isPostgresLoopbackAddress(null), false);
});

test('runtime database target accepts only the local app role and dev database', () => {
  assert.deepEqual(
    validateRuntimeDatabaseTarget(
      'postgresql://dolphin_crm_dev_app:synthetic-secret@127.0.0.1:5432/dolphin_crm_dev?schema=public',
      'development',
    ),
    { allowed: true },
  );
});

test('runtime database target rejects production environments', () => {
  assert.equal(
    validateRuntimeDatabaseTarget(
      'postgresql://dolphin_crm_dev_app:synthetic-secret@127.0.0.1:5432/dolphin_crm_dev?schema=public',
      'production',
    ).allowed,
    false,
  );
});

test('runtime database target rejects non-loopback hosts', () => {
  assert.equal(
    validateRuntimeDatabaseTarget(
      'postgresql://dolphin_crm_dev_app:synthetic-secret@example.invalid:5432/dolphin_crm_dev?schema=public',
      'development',
    ).allowed,
    false,
  );
});

test('runtime database target rejects migration accounts', () => {
  assert.equal(
    validateRuntimeDatabaseTarget(
      'postgresql://dolphin_crm_dev_migrator:synthetic-secret@127.0.0.1:5432/dolphin_crm_dev?schema=public',
      'development',
    ).allowed,
    false,
  );
});

test('runtime database target rejects other database names and missing passwords', () => {
  assert.equal(
    validateRuntimeDatabaseTarget(
      'postgresql://dolphin_crm_dev_app:synthetic-secret@127.0.0.1:5432/postgres?schema=public',
      'development',
    ).allowed,
    false,
  );
  assert.equal(
    validateRuntimeDatabaseTarget(
      'postgresql://dolphin_crm_dev_app@127.0.0.1:5432/dolphin_crm_dev?schema=public',
      'development',
    ).allowed,
    false,
  );
});

test('runtime database target does not include connection strings in rejection reasons', () => {
  const result = validateRuntimeDatabaseTarget(
    'postgresql://dolphin_crm_dev_app:synthetic-secret@remote.invalid:5432/dolphin_crm_dev?schema=public',
    'development',
  );
  assert.equal(result.allowed, false);
  if (!result.allowed) assert.equal(result.reason.includes('synthetic-secret'), false);
});
