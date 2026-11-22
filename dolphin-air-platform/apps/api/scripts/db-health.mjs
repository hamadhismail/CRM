import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { Client } from 'pg';
import loopbackAddressPolicy from '../src/database/postgres-loopback-address.cjs';

const { isPostgresLoopbackAddress } = loopbackAddressPolicy;

if (existsSync('../../.env')) {
  loadEnvFile('../../.env');
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  process.stderr.write('Database health check unavailable: DATABASE_URL is not configured.\n');
  process.exitCode = 1;
} else {
  let url;
  try {
    url = new URL(connectionString);
  } catch {
    process.stderr.write('Database health check unavailable: DATABASE_URL is invalid.\n');
    process.exitCode = 1;
  }

  if (url) {
    const hostname = url.hostname.toLowerCase();
    const database = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    const isLoopbackHost = ['127.0.0.1', 'localhost', '[::1]', '::1'].includes(hostname);

    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !isLoopbackHost || database !== 'dolphin_crm_dev') {
      process.stderr.write('Database health check refused: only loopback dolphin_crm_dev is allowed.\n');
      process.exitCode = 1;
    } else {
      const client = new Client({ connectionString });
      try {
        await client.connect();
        const result = await client.query(`
          SELECT current_database() AS database,
            inet_server_addr()::text AS server_address,
            current_user AS role_name,
            has_schema_privilege(current_user, 'public', 'CREATE') AS can_create_schema,
            has_database_privilege(current_user, current_database(), 'CREATE') AS can_create_schemas_in_database,
            (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS is_superuser,
            (SELECT rolcreatedb FROM pg_roles WHERE rolname = current_user) AS can_create_database,
            (SELECT rolcreaterole FROM pg_roles WHERE rolname = current_user) AS can_create_roles,
            pg_has_role(current_user, 'dolphin_crm_dev_migrator', 'MEMBER') AS can_assume_migrator,
            to_regclass('public.audit_events') IS NOT NULL AS audit_table_exists,
            CASE WHEN to_regclass('public.audit_events') IS NULL THEN false
              ELSE has_table_privilege(current_user, 'public.audit_events', 'SELECT') END AS audit_select,
            CASE WHEN to_regclass('public.audit_events') IS NULL THEN false
              ELSE has_table_privilege(current_user, 'public.audit_events', 'INSERT') END AS audit_insert,
            CASE WHEN to_regclass('public.audit_events') IS NULL THEN false
              ELSE has_table_privilege(current_user, 'public.audit_events', 'UPDATE') END AS audit_update,
            CASE WHEN to_regclass('public.audit_events') IS NULL THEN false
              ELSE has_table_privilege(current_user, 'public.audit_events', 'DELETE') END AS audit_delete,
            CASE WHEN to_regclass('public.audit_events') IS NULL THEN false
              ELSE has_table_privilege(current_user, 'public.audit_events', 'TRUNCATE') END AS audit_truncate
        `);
        const row = result.rows[0];
        const address = row?.server_address ?? '';
        const loopbackAddress = isPostgresLoopbackAddress(address);

        if (row?.database !== 'dolphin_crm_dev' || !loopbackAddress || row.role_name !== 'dolphin_crm_dev_app'
          || row.can_create_schema || row.can_create_schemas_in_database
          || row.is_superuser || row.can_create_database || row.can_create_roles || row.can_assume_migrator) {
          process.stderr.write('Database health check refused: target or runtime privileges do not match the isolated development policy.\n');
          process.exitCode = 1;
        } else if (row.audit_table_exists && (!row.audit_select || !row.audit_insert || row.audit_update || row.audit_delete || row.audit_truncate)) {
          process.stderr.write('Database health check failed: audit-event privileges do not match append-only policy.\n');
          process.exitCode = 1;
        } else {
          const schema = row.audit_table_exists ? 'identity-schema-present' : 'identity-schema-not-applied';
          process.stdout.write(`PostgreSQL health check passed: ${row.database} at loopback ${address}; ${schema}; runtime role verified.\n`);
        }
      } catch (error) {
        const code = error && typeof error === 'object' && 'code' in error
          ? String(error.code)
          : 'connection-error';
        process.stderr.write(`Database health check failed (${code}). No connection details were logged.\n`);
        process.exitCode = 1;
      } finally {
        await client.end().catch(() => undefined);
      }
    }
  }
}
