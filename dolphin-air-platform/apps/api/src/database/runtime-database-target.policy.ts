export type RuntimeDatabaseTargetCheck =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reason: string };

export function validateRuntimeDatabaseTarget(
  connectionString: string | undefined,
  nodeEnvironment = process.env.NODE_ENV,
): RuntimeDatabaseTargetCheck {
  if (!connectionString) {
    return { allowed: false, reason: 'DATABASE_URL is not configured; database-backed services are disabled.' };
  }
  if (nodeEnvironment === 'production') {
    return { allowed: false, reason: 'Prisma development database connection is disabled in production.' };
  }

  try {
    const url = new URL(connectionString);
    const host = url.hostname.toLowerCase();
    const databaseName = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    const roleName = decodeURIComponent(url.username);
    const loopback = ['127.0.0.1', 'localhost', '[::1]', '::1'].includes(host);
    if (!['postgres:', 'postgresql:'].includes(url.protocol)
      || !loopback
      || url.port !== '5432'
      || databaseName !== 'dolphin_crm_dev'
      || roleName !== 'dolphin_crm_dev_app'
      || !url.password
      || url.searchParams.get('schema') !== 'public') {
      return {
        allowed: false,
        reason: 'DATABASE_URL is not an approved loopback application connection; database-backed services are disabled.',
      };
    }
    return { allowed: true };
  } catch {
    return { allowed: false, reason: 'DATABASE_URL is invalid; database-backed services are disabled.' };
  }
}
import { isPostgresLoopbackAddress } from './postgres-loopback-address.cjs';


export { isPostgresLoopbackAddress };
