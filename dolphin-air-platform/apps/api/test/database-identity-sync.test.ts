import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import test from 'node:test';
import { Pool } from 'pg';
import { PrismaService } from '../src/database/prisma.service';
import { DatabaseStaffIdentityService } from '../src/modules/auth/services/database-staff-identity.service';

if (existsSync('../../.env')) loadEnvFile('../../.env');

const runtimeUrl = process.env.DATABASE_URL;
const migrationUrl = process.env.MIGRATION_DATABASE_URL;

test('verified Firebase UID resolves only provisioned active PostgreSQL staff identities', { timeout: 30_000 }, async (t) => {
  if (!runtimeUrl || !migrationUrl) {
    t.skip('Runtime and migration database connections are required for safe identity integration cleanup.');
    return;
  }
  assert.equal(isApprovedUrl(runtimeUrl, 'dolphin_crm_dev_app'), true, 'runtime connection must be the local app role');
  assert.equal(isApprovedUrl(migrationUrl, 'dolphin_crm_dev_migrator'), true, 'cleanup connection must be the local migrator role');

  const runtime = new Pool({ connectionString: runtimeUrl, max: 3 });
  const migration = new Pool({ connectionString: migrationUrl, max: 1 });
  const database = new PrismaService();
  const ids = {
    organization: randomUUID(), inactiveOrganization: randomUUID(),
    actor: randomUUID(), activeUser: randomUUID(), disabledUser: randomUUID(), inactiveOrgUser: randomUUID(),
    activeMembership: randomUUID(), disabledMembership: randomUUID(), inactiveOrgMembership: randomUUID(),
  };
  const firebaseUids = [randomUUID(), randomUUID(), randomUUID()];
  const syntheticEmails = firebaseUids.map((uid) => `${uid}@dolphin-air.test`);
  let fixturesCreated = false;
  let prismaReady = false;
  let cleanupFailure: unknown;

  try {
    const identity = await runtime.query<{ database: string; role: string; address: string | null }>(
      'SELECT current_database() AS database, current_user AS role, inet_server_addr()::text AS address',
    );
    assert.equal(identity.rows[0]?.database, 'dolphin_crm_dev');
    assert.equal(identity.rows[0]?.role, 'dolphin_crm_dev_app');
    assert.match(identity.rows[0]?.address ?? '', /^127\./);
    await database.onModuleInit();
    prismaReady = database.isReady;
    assert.equal(prismaReady, true, 'NestJS PrismaService must connect with the restricted runtime role');

    const roles = await runtime.query<{ id: string; scope: string }>("SELECT id,scope FROM roles WHERE code='sales'");
    assert.equal(roles.rowCount, 1);
    const salesRole = roles.rows[0]!;

    const setup = await runtime.connect();
    try {
      await setup.query('BEGIN');
      await setup.query(
        `INSERT INTO organizations (id,name,type,status,updated_at) VALUES
          ($1,'Synthetic identity sync internal','INTERNAL','ACTIVE',now()),
          ($2,'Synthetic identity sync inactive','INTERNAL','ACTIVE',now())`,
        [ids.organization, ids.inactiveOrganization],
      );
      await setup.query(
        `INSERT INTO users (id,firebase_uid,display_name,status,user_type,disabled_at,updated_at) VALUES
          ($1,$4,'Synthetic sync actor','ACTIVE','INTERNAL_STAFF',NULL,now()),
          ($2,$5,'Synthetic sync active','ACTIVE','INTERNAL_STAFF',NULL,now()),
          ($3,$6,'Synthetic sync disabled','DISABLED','INTERNAL_STAFF',now(),now())`,
        [ids.actor, ids.activeUser, ids.disabledUser, `actor-${randomUUID()}`, firebaseUids[0], firebaseUids[1]],
      );
      await setup.query(
        `INSERT INTO users (id,firebase_uid,display_name,status,user_type,updated_at) VALUES
          ($1,$2,'Synthetic inactive-org user','ACTIVE','INTERNAL_STAFF',now())`,
        [ids.inactiveOrgUser, firebaseUids[2]],
      );
      await setup.query(
        `INSERT INTO organization_memberships (id,organization_id,user_id,status,joined_at,updated_at) VALUES
          ($1,$4,$5,'ACTIVE',now(),now()),
          ($2,$4,$6,'ACTIVE',now(),now()),
          ($3,$7,$8,'ACTIVE',now(),now())`,
        [ids.activeMembership, ids.disabledMembership, ids.inactiveOrgMembership,
          ids.organization, ids.activeUser, ids.disabledUser, ids.inactiveOrganization, ids.inactiveOrgUser],
      );
      await setup.query(
        `INSERT INTO user_roles (id,organization_id,organization_type,membership_id,role_id,role_scope,status,assigned_by_id) VALUES
          ($1,$2,'INTERNAL',$3,$4,$5,'ACTIVE',$6),
          ($7,$8,'INTERNAL',$9,$4,$5,'ACTIVE',$6)`,
        [randomUUID(), ids.organization, ids.activeMembership, salesRole.id, salesRole.scope, ids.actor,
          randomUUID(), ids.inactiveOrganization, ids.inactiveOrgMembership],
      );
      await setup.query('COMMIT');
      fixturesCreated = true;
    } catch (error) {
      await setup.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      setup.release();
    }

    const resolver = new DatabaseStaffIdentityService(database);
    const decoded = (uid: string, email: string, name: string) => ({
      uid, email, email_verified: true, name,
    }) as never;
    const principal = await resolver.resolveVerifiedIdentity(decoded(firebaseUids[0], syntheticEmails[0], 'Verified Synthetic Staff'), ids.organization);
    assert.equal(principal.uid, firebaseUids[0]);
    assert.equal(principal.role, 'sales');
    assert.deepEqual(principal.organizationIds, [ids.organization]);
    const synchronized = await runtime.query<{ email: string; display_name: string }>(
      'SELECT email,display_name FROM users WHERE id=$1', [ids.activeUser],
    );
    assert.equal(synchronized.rows[0]?.email, syntheticEmails[0]);
    assert.equal(synchronized.rows[0]?.display_name, 'Verified Synthetic Staff');

    const repeated = await resolver.resolveVerifiedIdentity(decoded(firebaseUids[0], syntheticEmails[0], 'Verified Synthetic Staff'), ids.organization);
    assert.equal(repeated.uid, firebaseUids[0], 'repeated profile synchronization must remain idempotent');
    assert.equal(await resolver.recordSessionRevocation(firebaseUids[0]), true);
    const revocationAudit = await runtime.query<{ count: string }>(
      "SELECT count(*) FROM audit_events WHERE actor_user_id=$1 AND action='auth.session.revoked'", [ids.activeUser],
    );
    assert.equal(Number(revocationAudit.rows[0]?.count), 1);
    await assert.rejects(() => resolver.resolveVerifiedIdentity(decoded(randomUUID(), `${randomUUID()}@dolphin-air.test`, 'Unknown'), ids.organization));
    await assert.rejects(() => resolver.resolveVerifiedIdentity(decoded(firebaseUids[1], syntheticEmails[1], 'Disabled'), ids.organization));
    await assert.rejects(() => resolver.resolveVerifiedIdentity(decoded(firebaseUids[0], syntheticEmails[0], 'Wrong organization'), ids.inactiveOrganization));

    await runtime.query("UPDATE organization_memberships SET status='REVOKED', revoked_at=now(), updated_at=now() WHERE id=$1", [ids.activeMembership]);
    await assert.rejects(() => resolver.resolveVerifiedIdentity(decoded(firebaseUids[0], syntheticEmails[0], 'Revoked'), ids.organization));

    await runtime.query("UPDATE organizations SET status='INACTIVE', updated_at=now() WHERE id=$1", [ids.inactiveOrganization]);
    await assert.rejects(() => resolver.resolveVerifiedIdentity(decoded(firebaseUids[2], `${firebaseUids[2]}@dolphin-air.test`, 'Inactive org'), ids.inactiveOrganization));
  } finally {
    await database.onModuleDestroy().catch(() => undefined);
    if (fixturesCreated) {
      const cleanup = await migration.connect();
      try {
        await cleanup.query('BEGIN');
        await cleanup.query('DELETE FROM audit_events WHERE actor_user_id = ANY($1::uuid[])', [[ids.activeUser, ids.disabledUser, ids.inactiveOrgUser]]);
        await cleanup.query('DELETE FROM user_roles WHERE membership_id = ANY($1::uuid[])', [[ids.activeMembership, ids.disabledMembership, ids.inactiveOrgMembership]]);
        await cleanup.query('DELETE FROM organization_memberships WHERE id = ANY($1::uuid[])', [[ids.activeMembership, ids.disabledMembership, ids.inactiveOrgMembership]]);
        await cleanup.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [[ids.actor, ids.activeUser, ids.disabledUser, ids.inactiveOrgUser]]);
        await cleanup.query('DELETE FROM organizations WHERE id = ANY($1::uuid[])', [[ids.organization, ids.inactiveOrganization]]);
        await cleanup.query('COMMIT');
      } catch (error) {
        await cleanup.query('ROLLBACK').catch(() => undefined);
        cleanupFailure = error;
      } finally {
        cleanup.release();
      }
    }
    await runtime.end();
    await migration.end();
  }
  if (cleanupFailure) throw cleanupFailure;
});

function isApprovedUrl(value: string, expectedRole: string): boolean {
  try {
    const url = new URL(value);
    return ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname.toLowerCase())
      && url.port === '5432'
      && decodeURIComponent(url.pathname.replace(/^\/+/, '')) === 'dolphin_crm_dev'
      && decodeURIComponent(url.username) === expectedRole
      && Boolean(url.password);
  } catch {
    return false;
  }
}
