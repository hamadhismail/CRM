import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { closeSync, existsSync, mkdirSync, openSync, rmSync, writeFileSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const crmDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rootDirectory = resolve(crmDirectory, '../..');
const apiDirectory = resolve(rootDirectory, 'apps/api');
const stateDirectory = resolve(crmDirectory, '.playwright');
const fixtureFile = resolve(stateDirectory, 'fixture.json');
const requireApi = createRequire(resolve(apiDirectory, 'package.json'));
const { Pool } = requireApi('pg');
const { getApps, initializeApp } = requireApi('firebase-admin/app');
const { getAuth } = requireApi('firebase-admin/auth');

let pool;
let firebaseAuth;
let apiProcess;
let frontendProcess;
let fixture;
let fixtureTransactionCommitted = false;
let firebaseUids = [];

export default async function globalSetup() {
  const rootEnv = resolve(rootDirectory, '.env');
  if (!process.env.DATABASE_URL && existsSync(rootEnv)) loadEnvFile(rootEnv);
  assertApprovedConfiguration();

  const emulator = await fetch('http://127.0.0.1:9099/', {
    signal: AbortSignal.timeout(2_000),
  });
  assert.ok(emulator.ok, 'Firebase Auth Emulator must be reachable at 127.0.0.1:9099 for dolphin-air-local.');
  const emulatorHealth = await emulator.json();
  assert.equal(emulatorHealth.authEmulator?.ready, true, 'The local Firebase Auth Emulator must report ready.');

  process.env.FIREBASE_PROJECT_ID = 'dolphin-air-local';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  const firebaseApp = getApps().find((app) => app.name === 'dolphin-air-stage334-e2e')
    ?? initializeApp({ projectId: 'dolphin-air-local' }, 'dolphin-air-stage334-e2e');
  firebaseAuth = getAuth(firebaseApp);
  pool = new Pool({ connectionString: process.env.MIGRATION_DATABASE_URL, max: 2 });

  mkdirSync(stateDirectory, { recursive: true });
  fixture = makeFixture();
  try {
    await verifyDatabaseTarget();
    await provisionFirebaseUsers();
    await provisionDatabaseRows();
    fixtureTransactionCommitted = true;
    writeFileSync(fixtureFile, JSON.stringify(fixture), { flag: 'w' });
    await startApi();
    await startFrontend();
  } catch (error) {
    await cleanup({ preserveLog: true }).catch(() => undefined);
    throw error;
  }

  return async () => {
    await cleanup();
  };
}

function assertApprovedConfiguration() {
  assert.notEqual(process.env.NODE_ENV, 'production', 'E2E must not run in production mode.');
  assert.notEqual(process.env.DATABASE_IDENTITY_AUTH_ENABLED, 'true', 'Do not enable database identity in the invoking process or project defaults.');
  assert.ok(process.env.DATABASE_URL && isApprovedUrl(process.env.DATABASE_URL, 'dolphin_crm_dev_app'),
    'DATABASE_URL must target the local dolphin_crm_dev database using the restricted runtime role.');
  assert.ok(process.env.MIGRATION_DATABASE_URL && isApprovedUrl(process.env.MIGRATION_DATABASE_URL, 'dolphin_crm_dev_migrator'),
    'MIGRATION_DATABASE_URL must target the local dolphin_crm_dev database using the dedicated migrator role.');
  if (process.env.FIREBASE_PROJECT_ID) assert.equal(process.env.FIREBASE_PROJECT_ID, 'dolphin-air-local');
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099');
}

function isApprovedUrl(value, expectedRole) {
  try {
    const url = new URL(value);
    return url.hostname === '127.0.0.1' && url.port === '5432'
      && decodeURIComponent(url.pathname.replace(/^\/+/, '')) === 'dolphin_crm_dev'
      && decodeURIComponent(url.username) === expectedRole && Boolean(url.password);
  } catch { return false; }
}

function makeFixture() {
  const suffix = randomUUID();
  const orgIds = Object.fromEntries(['multiA', 'multiB', 'single', 'foreign', 'restricted'].map((key) => [key, randomUUID()]));
  const users = Object.fromEntries(['actor', 'multi', 'single', 'noMembership', 'disabled', 'unknown', 'foreign', 'restricted'].map((key) => [key, {
    id: randomUUID(), uid: `stage334-${key}-${suffix}`, email: `stage334-${key}-${suffix}@dolphin-air.test`,
    password: `E2E-Local-${randomUUID()}-Only`,
  }]));
  const membershipIds = Object.fromEntries(['multiA', 'multiB', 'single', 'foreign', 'restricted'].map((key) => [key, randomUUID()]));
  return {
    orgIds, users, membershipIds, foreignLeadId: randomUUID(),
    orgNames: { multiA: `Synthetic E2E A ${suffix.slice(0, 8)}`, multiB: `Synthetic E2E B ${suffix.slice(0, 8)}`,
      single: `Synthetic E2E Single ${suffix.slice(0, 8)}`, foreign: `Synthetic E2E Foreign ${suffix.slice(0, 8)}`,
      restricted: `Synthetic E2E Restricted ${suffix.slice(0, 8)}` },
  };
}

async function verifyDatabaseTarget() {
  const result = await pool.query(`SELECT current_database() AS database,current_user AS role,inet_server_addr()::text AS address`);
  assert.equal(result.rows[0]?.database, 'dolphin_crm_dev');
  assert.equal(result.rows[0]?.role, 'dolphin_crm_dev_migrator');
  assert.match((result.rows[0]?.address ?? '').split('/')[0], /^127\./);
}

async function provisionFirebaseUsers() {
  for (const user of Object.values(fixture.users)) {
    await firebaseAuth.createUser({ uid: user.uid, email: user.email, password: user.password, emailVerified: true, displayName: `Synthetic ${user.uid}` });
    firebaseUids.push(user.uid);
  }
}

async function provisionDatabaseRows() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const rolesResult = await client.query(
      `SELECT r.id,r.code,r.scope,r.allowed_organization_type,array_agg(p.code) FILTER (WHERE p.code IS NOT NULL) AS permissions
       FROM roles r LEFT JOIN role_permissions rp ON rp.role_id=r.id LEFT JOIN permissions p ON p.id=rp.permission_id
       WHERE r.code=ANY($1::varchar[]) GROUP BY r.id`, [['sales', 'staff']],
    );
    const sales = rolesResult.rows.find((role) => role.code === 'sales');
    const staff = rolesResult.rows.find((role) => role.code === 'staff');
    assert.ok(sales && staff, 'Existing sales and staff roles must exist; E2E does not create roles.');
    assert.equal(sales.allowed_organization_type, 'INTERNAL');
    assert.ok(['leads.read', 'leads.create', 'leads.update', 'profile.read'].every((permission) => sales.permissions.includes(permission)));
    assert.ok(staff.permissions.includes('profile.read') && !staff.permissions.some((permission) => permission.startsWith('leads.')));

    const organizations = Object.keys(fixture.orgIds).map((key) => [fixture.orgIds[key], fixture.orgNames[key]]);
    for (const [id, name] of organizations) {
      await client.query(`INSERT INTO organizations (id,name,type,status,updated_at) VALUES ($1,$2,'INTERNAL','ACTIVE',now())`, [id, name]);
    }
    const u = fixture.users;
    await client.query(
      `INSERT INTO users (id,firebase_uid,display_name,email,email_normalized,status,user_type,disabled_at,updated_at) VALUES
       ($1,$2,'Synthetic E2E Fixture Actor',NULL,NULL,'ACTIVE','INTERNAL_STAFF',NULL,now()),
       ($3,$4,'Synthetic Multi Organization Staff',NULL,NULL,'ACTIVE','INTERNAL_STAFF',NULL,now()),
       ($5,$6,'Synthetic Single Organization Staff',NULL,NULL,'ACTIVE','INTERNAL_STAFF',NULL,now()),
       ($7,$8,'Synthetic No Membership Staff',NULL,NULL,'ACTIVE','INTERNAL_STAFF',NULL,now()),
       ($9,$10,'Synthetic Disabled Database User',NULL,NULL,'DISABLED','INTERNAL_STAFF',now(),now()),
       ($11,$12,'Synthetic Foreign Organization Staff',NULL,NULL,'ACTIVE','INTERNAL_STAFF',NULL,now()),
       ($13,$14,'Synthetic Restricted Role Staff',NULL,NULL,'ACTIVE','INTERNAL_STAFF',NULL,now())`,
      [u.actor.id,u.actor.uid,u.multi.id,u.multi.uid,u.single.id,u.single.uid,u.noMembership.id,u.noMembership.uid,
        u.disabled.id,u.disabled.uid,u.foreign.id,u.foreign.uid,u.restricted.id,u.restricted.uid],
    );
    const pairs = [
      ['multiA', 'multi'], ['multiB', 'multi'], ['single', 'single'], ['foreign', 'foreign'], ['restricted', 'restricted'],
    ];
    for (const [orgKey, userKey] of pairs) {
      await client.query(`INSERT INTO organization_memberships (id,organization_id,user_id,status,joined_at,updated_at)
        VALUES ($1,$2,$3,'ACTIVE',now(),now())`, [fixture.membershipIds[orgKey], fixture.orgIds[orgKey], u[userKey].id]);
    }
    const assignments = [
      ['multiA','sales'],['multiB','sales'],['single','sales'],['foreign','sales'],['restricted','staff'],
    ];
    for (const [orgKey, roleCode] of assignments) {
      const role = roleCode === 'sales' ? sales : staff;
      await client.query(`INSERT INTO user_roles (id,organization_id,organization_type,membership_id,role_id,role_scope,status,assigned_by_id)
        VALUES ($1,$2,'INTERNAL',$3,$4,$5,'ACTIVE',$6)`,
      [randomUUID(),fixture.orgIds[orgKey],fixture.membershipIds[orgKey],role.id,role.scope,u.actor.id]);
    }
    await client.query(
      `INSERT INTO leads (id,organization_id,lead_number,full_name,country_code,phone_number,phone_normalized,source,service,created_by_membership_id,updated_at)
       VALUES ($1,$2,$3,'Synthetic Foreign Organization Lead','+91','9000000000','919000000000','E2E fixture','UMRAH',$4,now())`,
      [fixture.foreignLeadId,fixture.orgIds.foreign,`E2E-${randomUUID().slice(0, 16)}`,fixture.membershipIds.foreign],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally { client.release(); }
}

async function startApi() {
  const apiPort = 3001;
  const apiEnvironment = { ...process.env, NODE_ENV: 'development', DATABASE_IDENTITY_AUTH_ENABLED: 'true',
    FIREBASE_PROJECT_ID: 'dolphin-air-local', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
    API_PORT: String(apiPort), CRM_ORIGIN: 'http://127.0.0.1:5174' };
  delete apiEnvironment.MIGRATION_DATABASE_URL;
  delete apiEnvironment.FIRESTORE_EMULATOR_HOST;
  delete apiEnvironment.NODE_OPTIONS;
  const entry = resolve(apiDirectory, 'dist/src/main.js');
  assert.ok(existsSync(entry), 'Build the Nest API before running browser E2E.');
  const apiLog = openSync(resolve(stateDirectory, 'api-startup.log'), 'w');
  apiProcess = spawn(process.execPath, [entry], { cwd: apiDirectory, env: apiEnvironment, stdio: ['ignore', apiLog, apiLog], windowsHide: true });
  apiProcess.once('exit', () => closeSync(apiLog));
  let exit = null;
  apiProcess.once('exit', (code, signal) => { exit = code ?? signal ?? 'unknown'; });
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (exit !== null) throw new Error(`Isolated local API exited before readiness (${exit}).`);
    try {
      const response = await fetch(`http://127.0.0.1:${apiPort}/api/leads`, { signal: AbortSignal.timeout(500) });
      if (response.status === 401) return;
      throw new Error(`Local API readiness check returned unexpected status ${response.status}.`);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Local API readiness')) throw error;
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 150));
    }
  }
  throw new Error('Isolated local NestJS API did not become ready.');
}

async function startFrontend() {
  const frontendEnvironment = { ...process.env, CRM_E2E_PORT: '5174' };
  const entry = resolve(crmDirectory, 'e2e/static-server.mjs');
  frontendProcess = spawn(process.execPath, [entry], { cwd: crmDirectory, env: frontendEnvironment, stdio: 'ignore', windowsHide: true });
  let exit = null;
  frontendProcess.once('exit', (code, signal) => { exit = code ?? signal ?? 'unknown'; });
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (exit !== null) throw new Error(`Local CRM E2E frontend exited before readiness (${exit}).`);
    try {
      const response = await fetch('http://127.0.0.1:5174/login', { signal: AbortSignal.timeout(500) });
      if (response.status === 200) return;
      throw new Error(`Local CRM E2E frontend readiness returned unexpected status ${response.status}.`);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Local CRM E2E frontend readiness')) throw error;
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
    }
  }
  throw new Error('Local CRM E2E frontend did not become ready.');
}

async function cleanup({ preserveLog = false } = {}) {
  await stopChild(frontendProcess);
  if (apiProcess && apiProcess.exitCode === null) {
    await stopChild(apiProcess);
  }
  let cleanupError;
  if (pool && fixtureTransactionCommitted && fixture) {
    try {
      await verifyDatabaseTarget();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const orgIds = Object.values(fixture.orgIds);
        const userIds = Object.values(fixture.users).map((user) => user.id);
        const membershipIds = Object.values(fixture.membershipIds);
        await client.query(`DELETE FROM lead_notes WHERE organization_id=ANY($1::uuid[])`, [orgIds]);
        await client.query(`DELETE FROM lead_events WHERE organization_id=ANY($1::uuid[])`, [orgIds]);
        await client.query(`DELETE FROM leads WHERE organization_id=ANY($1::uuid[])`, [orgIds]);
        await client.query(`DELETE FROM audit_events WHERE organization_id=ANY($1::uuid[]) OR actor_user_id=ANY($2::uuid[])`, [orgIds,userIds]);
        await client.query(`DELETE FROM user_roles WHERE membership_id=ANY($1::uuid[])`, [membershipIds]);
        await client.query(`DELETE FROM organization_memberships WHERE id=ANY($1::uuid[])`, [membershipIds]);
        await client.query(`DELETE FROM users WHERE id=ANY($1::uuid[])`, [userIds]);
        await client.query(`DELETE FROM organizations WHERE id=ANY($1::uuid[])`, [orgIds]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined);
        cleanupError = error;
      } finally { client.release(); }
    } catch (error) { cleanupError = error; }
  }
  if (firebaseAuth) await Promise.all(firebaseUids.map((uid) => firebaseAuth.deleteUser(uid).catch(() => undefined)));
  if (pool) await pool.end();
  rmSync(fixtureFile, { force: true });
  if (!preserveLog && existsSync(stateDirectory) && !existsSync(resolve(stateDirectory, 'test-results'))) {
    rmSync(stateDirectory, { recursive: true, force: true });
  }
  if (cleanupError) throw cleanupError;
}

async function stopChild(child) {
  if (!child || child.exitCode !== null) return;
  child.kill();
  await Promise.race([new Promise((done) => child.once('exit', done)), new Promise((done) => setTimeout(done, 3_000))]);
}
