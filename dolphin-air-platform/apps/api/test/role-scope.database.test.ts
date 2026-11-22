import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import test from 'node:test';
import { Pool, PoolClient } from 'pg';
import { PERMISSION_CATALOG, permissionsForRole } from '../src/modules/auth/authentication.policy';
import { validateRuntimeDatabaseTarget } from '../src/database/runtime-database-target.policy';

if (existsSync('../../.env')) loadEnvFile('../../.env');

const connectionString = process.env.DATABASE_URL;
const target = validateRuntimeDatabaseTarget(connectionString);

test('role-scope database invariant and revocation integration', { timeout: 30_000 }, async (t) => {
  if (!connectionString) {
    t.skip('Isolated local database connection is not configured.');
    return;
  }
  assert.equal(target.allowed, true, 'Configured database target must satisfy the isolated local development policy.');

  const pool = new Pool({ connectionString, max: 5 });
  const ids = {
    internalOrg: randomUUID(), agencyOrg: randomUUID(), inactiveOrg: randomUUID(),
    actor: randomUUID(), internalUser: randomUUID(), agencyUser: randomUUID(), disabledUser: randomUUID(), concurrencyUser: randomUUID(), lifecycleUser: randomUUID(),
    internalMembership: randomUUID(), agencyMembership: randomUUID(), inactiveMembership: randomUUID(),
    disabledMembership: randomUUID(), concurrencyMembership: randomUUID(), lifecycleMembership: randomUUID(),
  };
  let fixtureCreated = false;

  try {
    const identity = await pool.query<{ database: string; role: string; address: string | null }>(
      'SELECT current_database() AS database, current_user AS role, inet_server_addr()::text AS address',
    );
    assert.equal(identity.rows[0]?.database, 'dolphin_crm_dev');
    assert.equal(identity.rows[0]?.role, 'dolphin_crm_dev_app');
    assert.match(identity.rows[0]?.address ?? '', /^127\./);

    const setupClient = await pool.connect();
    await setupClient.query('BEGIN');
    try {
      await setupClient.query(
        `INSERT INTO organizations (id,name,type,status,updated_at) VALUES
          ($1,'Synthetic role scope internal','INTERNAL','ACTIVE',now()),
          ($2,'Synthetic role scope agency','B2B_AGENCY','ACTIVE',now()),
          ($3,'Synthetic role scope inactive','INTERNAL','INACTIVE',now())`,
        [ids.internalOrg, ids.agencyOrg, ids.inactiveOrg],
      );
      await setupClient.query(
        `INSERT INTO users (id,display_name,status,user_type,disabled_at,updated_at) VALUES
          ($1,'Synthetic role actor','ACTIVE','INTERNAL_STAFF',NULL,now()),
          ($2,'Synthetic internal staff','ACTIVE','INTERNAL_STAFF',NULL,now()),
          ($3,'Synthetic agency user','ACTIVE','AGENCY_USER',NULL,now()),
          ($4,'Synthetic disabled user','DISABLED','INTERNAL_STAFF',now(),now()),
          ($5,'Synthetic concurrency user','ACTIVE','INTERNAL_STAFF',NULL,now()),
          ($6,'Synthetic lifecycle user','ACTIVE','INTERNAL_STAFF',NULL,now())`,
        [ids.actor, ids.internalUser, ids.agencyUser, ids.disabledUser, ids.concurrencyUser, ids.lifecycleUser],
      );
      await setupClient.query(
        `INSERT INTO organization_memberships (id,organization_id,user_id,status,joined_at,updated_at) VALUES
          ($1,$5,$6,'ACTIVE',now(),now()),
          ($2,$7,$8,'ACTIVE',now(),now()),
          ($3,$9,$6,'ACTIVE',now(),now()),
          ($4,$5,$10,'ACTIVE',now(),now()),
          ($11,$5,$12,'ACTIVE',now(),now()),
          ($13,$5,$14,'ACTIVE',now(),now())`,
        [ids.internalMembership, ids.agencyMembership, ids.inactiveMembership, ids.disabledMembership,
          ids.internalOrg, ids.internalUser, ids.agencyOrg, ids.agencyUser, ids.inactiveOrg, ids.disabledUser,
          ids.concurrencyMembership, ids.concurrencyUser, ids.lifecycleMembership, ids.lifecycleUser],
      );
      fixtureCreated = true;
      await setupClient.query('COMMIT');
    } catch (error) {
      await setupClient.query('ROLLBACK');
      throw error;
    } finally {
      setupClient.release();
    }

    const catalog = await pool.query<{ code: string }>('SELECT code FROM permissions ORDER BY code');
    assert.deepEqual(catalog.rows.map(({ code }) => code), [...PERMISSION_CATALOG].sort());

    const roles = await pool.query<{ id: string; code: string; scope: string; org_type: string | null }>(
      `SELECT id,code,scope,allowed_organization_type AS org_type FROM roles WHERE code = ANY($1::varchar[])`,
      [['sales', 'staff', 'admin', 'b2b_agent', 'customer']],
    );
    const roleByCode = new Map(roles.rows.map((row) => [row.code, row]));
    for (const role of ['sales', 'staff', 'admin', 'b2b_agent', 'customer']) assert.ok(roleByCode.has(role));

    for (const [code, role] of roleByCode) {
      const actual = await pool.query<{ code: string }>(
        `SELECT p.code FROM role_permissions rp JOIN permissions p ON p.id=rp.permission_id
         WHERE rp.role_id=$1 ORDER BY p.code`, [role.id],
      );
      assert.deepEqual(actual.rows.map(({ code: permission }) => permission), [...permissionsForRole(code as never)].sort());
    }

    const insertAssignment = async (input: {
      membership: string; organization: string; organizationType: string; role: string;
      roleScope?: string; assignedBy?: string; id?: string;
    }, client: Pool | PoolClient = pool) => client.query(
      `INSERT INTO user_roles (id,organization_id,organization_type,membership_id,role_id,role_scope,status,assigned_by_id)
       VALUES ($1,$2,$3,$4,$5,$6,'ACTIVE',$7)`,
      [input.id ?? randomUUID(), input.organization, input.organizationType, input.membership,
        roleByCode.get(input.role)?.id, input.roleScope ?? roleByCode.get(input.role)?.scope,
        input.assignedBy ?? ids.actor],
    );
    const rejected = async (operation: () => Promise<unknown>, codes = ['23514', '23503']) => {
      await assert.rejects(operation, (error: unknown) => {
        const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
        return codes.includes(code);
      });
    };

    await insertAssignment({ membership: ids.internalMembership, organization: ids.internalOrg, organizationType: 'INTERNAL', role: 'sales' });
    const validAgency = await insertAssignment({ membership: ids.agencyMembership, organization: ids.agencyOrg, organizationType: 'B2B_AGENCY', role: 'b2b_agent' });
    assert.equal(validAgency.rowCount, 1);
    await rejected(() => insertAssignment({ membership: ids.internalMembership, organization: ids.agencyOrg, organizationType: 'B2B_AGENCY', role: 'sales' }));
    await rejected(() => insertAssignment({ membership: ids.agencyMembership, organization: ids.agencyOrg, organizationType: 'B2B_AGENCY', role: 'admin' }));
    await rejected(() => insertAssignment({ membership: ids.internalMembership, organization: ids.internalOrg, organizationType: 'INTERNAL', role: 'b2b_agent' }));
    await rejected(() => insertAssignment({ membership: ids.internalMembership, organization: ids.internalOrg, organizationType: 'INTERNAL', role: 'customer' }));
    await rejected(() => insertAssignment({ membership: ids.inactiveMembership, organization: ids.inactiveOrg, organizationType: 'INTERNAL', role: 'sales' }));
    await rejected(() => insertAssignment({ membership: ids.disabledMembership, organization: ids.internalOrg, organizationType: 'INTERNAL', role: 'sales' }));
    await rejected(() => insertAssignment({ membership: ids.internalMembership, organization: ids.internalOrg, organizationType: 'INTERNAL', role: 'sales', assignedBy: ids.internalUser }));

    await pool.query("UPDATE organizations SET status='INACTIVE', updated_at=now() WHERE id=$1", [ids.agencyOrg]);
    const orgRevoked = await pool.query<{ status: string }>('SELECT status FROM user_roles WHERE membership_id=$1', [ids.agencyMembership]);
    assert.ok(orgRevoked.rows.length > 0 && orgRevoked.rows.every(({ status }) => status === 'REVOKED'));

    await insertAssignment({ membership: ids.lifecycleMembership, organization: ids.internalOrg, organizationType: 'INTERNAL', role: 'staff' });
    await pool.query("UPDATE users SET status='DISABLED', disabled_at=now(), updated_at=now() WHERE id=$1", [ids.lifecycleUser]);
    const userRevoked = await pool.query<{ status: string }>('SELECT status FROM user_roles WHERE membership_id=$1', [ids.lifecycleMembership]);
    assert.ok(userRevoked.rows.length > 0 && userRevoked.rows.every(({ status }) => status === 'REVOKED'));

    await pool.query("UPDATE organization_memberships SET status='REVOKED', revoked_at=now(), updated_at=now() WHERE id=$1", [ids.internalMembership]);
    const revoked = await pool.query<{ status: string }>('SELECT status FROM user_roles WHERE membership_id=$1', [ids.internalMembership]);
    assert.ok(revoked.rows.every(({ status }) => status === 'REVOKED'));
    await rejected(() => insertAssignment({ membership: ids.internalMembership, organization: ids.internalOrg, organizationType: 'INTERNAL', role: 'sales' }));

    const racePool = new Pool({ connectionString, max: 2 });
    const assignmentClient: PoolClient = await racePool.connect();
    const revokeClient: PoolClient = await racePool.connect();
    const raceRoleId = randomUUID();
    try {
      await assignmentClient.query('BEGIN');
      await insertAssignment({ membership: ids.concurrencyMembership, organization: ids.internalOrg, organizationType: 'INTERNAL', role: 'sales', id: raceRoleId }, assignmentClient);
      await revokeClient.query('BEGIN');
      let revokeFinished = false;
      const revokePromise = revokeClient.query(
        "UPDATE organization_memberships SET status='REVOKED', revoked_at=now(), updated_at=now() WHERE id=$1", [ids.concurrencyMembership],
      ).then(() => { revokeFinished = true; });
      await new Promise((resolve) => setTimeout(resolve, 150));
      assert.equal(revokeFinished, false, 'membership revocation should wait for the assignment context lock');
      await assignmentClient.query('COMMIT');
      await revokePromise;
      await revokeClient.query('COMMIT');
      const raceResult = await pool.query<{ status: string }>('SELECT status FROM user_roles WHERE id=$1', [raceRoleId]);
      assert.equal(raceResult.rows[0]?.status, 'REVOKED');
    } catch (error) {
      await assignmentClient.query('ROLLBACK').catch(() => undefined);
      await revokeClient.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      assignmentClient.release();
      revokeClient.release();
      await racePool.end();
    }

    await t.test('role scope enforcement and lifecycle revocation cases passed', () => assert.ok(true));
  } finally {
    if (fixtureCreated) {
      await pool.query('DELETE FROM user_roles WHERE membership_id = ANY($1::uuid[])', [
        [ids.internalMembership, ids.agencyMembership, ids.inactiveMembership, ids.disabledMembership, ids.concurrencyMembership, ids.lifecycleMembership],
      ]).catch(() => undefined);
      await pool.query('DELETE FROM organization_memberships WHERE id = ANY($1::uuid[])', [
        [ids.internalMembership, ids.agencyMembership, ids.inactiveMembership, ids.disabledMembership, ids.concurrencyMembership, ids.lifecycleMembership],
      ]).catch(() => undefined);
      await pool.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [[ids.actor, ids.internalUser, ids.agencyUser, ids.disabledUser, ids.concurrencyUser, ids.lifecycleUser]]).catch(() => undefined);
      await pool.query('DELETE FROM organizations WHERE id = ANY($1::uuid[])', [[ids.internalOrg, ids.agencyOrg, ids.inactiveOrg]]).catch(() => undefined);
    }
    await pool.end();
  }
});
