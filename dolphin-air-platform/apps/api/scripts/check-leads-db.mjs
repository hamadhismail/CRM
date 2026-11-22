import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { resolve } from 'node:path';
import pg from 'pg';
import { randomUUID } from 'node:crypto';

const envPath = resolve(process.cwd(), '../../.env');
if (existsSync(envPath)) loadEnvFile(envPath);
const url = new URL(process.env.DATABASE_URL ?? 'postgresql://invalid@127.0.0.1/invalid');
if (url.hostname !== '127.0.0.1' || url.port !== '5432' || url.pathname !== '/dolphin_crm_dev'
  || url.username !== 'dolphin_crm_dev_app') throw new Error('Isolated runtime database target is required.');

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
try {
  await client.connect();
  const { rows } = await client.query(`SELECT current_database() AS database,
    current_user AS role,
    (has_table_privilege(current_user, 'public.leads', 'SELECT')
      AND has_table_privilege(current_user, 'public.leads', 'INSERT')
      AND has_table_privilege(current_user, 'public.leads', 'UPDATE')) AS lead_rw,
    has_table_privilege(current_user, 'public.leads', 'DELETE') AS lead_delete,
    (has_table_privilege(current_user, 'public.lead_notes', 'SELECT')
      AND has_table_privilege(current_user, 'public.lead_notes', 'INSERT')) AS note_append,
    (has_table_privilege(current_user, 'public.lead_notes', 'UPDATE')
      OR has_table_privilege(current_user, 'public.lead_notes', 'DELETE')
      OR has_table_privilege(current_user, 'public.lead_notes', 'TRUNCATE')) AS note_mutate,
    (has_table_privilege(current_user, 'public.lead_events', 'SELECT')
      AND has_table_privilege(current_user, 'public.lead_events', 'INSERT')) AS event_append,
    (has_table_privilege(current_user, 'public.lead_events', 'UPDATE')
      OR has_table_privilege(current_user, 'public.lead_events', 'DELETE')
      OR has_table_privilege(current_user, 'public.lead_events', 'TRUNCATE')) AS event_mutate,
    has_table_privilege(current_user, 'public._prisma_migrations', 'SELECT') AS migration_read`);
  const r = rows[0];
  if (r.database !== 'dolphin_crm_dev' || r.role !== 'dolphin_crm_dev_app'
    || !r.lead_rw || r.lead_delete || !r.note_append || r.note_mutate
    || !r.event_append || r.event_mutate || r.migration_read) throw new Error('Lead runtime privileges failed verification.');
  process.stdout.write('Lead runtime privileges verified: lead read/insert/update; notes and events append-only; migration history inaccessible.\n');

  const orgId = randomUUID();
  const otherOrgId = randomUUID();
  const userId = randomUUID();
  const memberId = randomUUID();
  const leadId = randomUUID();
  await client.query('BEGIN');
  try {
    await client.query(`INSERT INTO organizations (id, name, type, status, created_at, updated_at)
      VALUES ($1, 'Synthetic lead test organization', 'INTERNAL', 'ACTIVE', now(), now()),
             ($2, 'Synthetic other organization', 'INTERNAL', 'ACTIVE', now(), now())`, [orgId, otherOrgId]);
    await client.query(`INSERT INTO users (id, display_name, status, user_type, created_at, updated_at)
      VALUES ($1, 'Synthetic lead test user', 'ACTIVE', 'INTERNAL_STAFF', now(), now())`, [userId]);
    await client.query(`INSERT INTO organization_memberships (id, organization_id, user_id, status, created_at, updated_at)
      VALUES ($1, $2, $3, 'ACTIVE', now(), now())`, [memberId, orgId, userId]);
    await client.query(`INSERT INTO leads (id, organization_id, lead_number, full_name, country_code,
      phone_number, phone_normalized, source, service, created_by_membership_id, updated_at)
      VALUES ($1, $2, $3, 'Synthetic Lead', '+91', '0000000000', '910000000000',
      'TEST', 'UMRAH', $4, now())`, [leadId, orgId, `TEST-${randomUUID().slice(0, 20)}`, memberId]);
    await client.query(`INSERT INTO lead_notes (id, lead_id, organization_id, author_membership_id, body)
      VALUES ($1, $2, $3, $4, 'Synthetic test note')`, [randomUUID(), leadId, orgId, memberId]);
    await client.query(`INSERT INTO lead_events (id, lead_id, organization_id, actor_membership_id, event_type)
      VALUES ($1, $2, $3, $4, 'created')`, [randomUUID(), leadId, orgId, memberId]);
    await client.query('SAVEPOINT tenant_check');
    let rejected = false;
    try {
      await client.query('UPDATE leads SET organization_id = $1 WHERE id = $2', [otherOrgId, leadId]);
    } catch (error) {
      rejected = error?.code === '23503';
    }
    await client.query('ROLLBACK TO SAVEPOINT tenant_check');
    if (!rejected) throw new Error('Cross-organization membership constraint was not enforced.');
    process.stdout.write('Synthetic lead, note and event writes passed; cross-organization mutation rejected.\n');
  } finally {
    await client.query('ROLLBACK');
  }
} finally {
  await client.end();
}
