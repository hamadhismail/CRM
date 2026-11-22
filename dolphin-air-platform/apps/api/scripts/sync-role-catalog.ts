import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { PERMISSION_CATALOG, permissionsForRole } from '../src/modules/auth/authentication.policy';
import { PLATFORM_ROLES, PlatformRole } from '../src/modules/auth/interfaces/authenticated-principal';
import { validateRuntimeDatabaseTarget } from '../src/database/runtime-database-target.policy';

if (existsSync('../../.env')) loadEnvFile('../../.env');

const connectionString = process.env.DATABASE_URL;
const target = validateRuntimeDatabaseTarget(connectionString);
if (!target.allowed) {
  process.stderr.write(`${target.reason}\n`);
  process.exitCode = 1;
}

const ROLE_BINDINGS = {
  super_admin: { scope: 'SYSTEM', allowedOrganizationType: 'INTERNAL' },
  admin: { scope: 'ORGANIZATION', allowedOrganizationType: 'INTERNAL' },
  staff: { scope: 'ORGANIZATION', allowedOrganizationType: 'INTERNAL' },
  sales: { scope: 'ORGANIZATION', allowedOrganizationType: 'INTERNAL' },
  operations: { scope: 'ORGANIZATION', allowedOrganizationType: 'INTERNAL' },
  finance_accounts: { scope: 'ORGANIZATION', allowedOrganizationType: 'INTERNAL' },
  visa_processing: { scope: 'ORGANIZATION', allowedOrganizationType: 'INTERNAL' },
  b2b_agent: { scope: 'ORGANIZATION', allowedOrganizationType: 'B2B_AGENCY' },
  customer: { scope: 'ORGANIZATION', allowedOrganizationType: null },
} as const satisfies Record<PlatformRole, { scope: 'SYSTEM' | 'ORGANIZATION'; allowedOrganizationType: 'INTERNAL' | 'B2B_AGENCY' | null }>;

const ROLE_NAMES: Record<PlatformRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  staff: 'Staff',
  sales: 'Sales',
  operations: 'Operations',
  finance_accounts: 'Finance / Accounts',
  visa_processing: 'Visa Processing',
  b2b_agent: 'B2B Agent',
  customer: 'Customer',
};

class RoleCatalogSyncError extends Error {}

async function synchronizeRoleCatalog(): Promise<void> {
  if (!target.allowed || !connectionString) return;
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    await prisma.$connect();
    await prisma.$transaction(async (tx) => {
    const [targetIdentity] = await tx.$queryRaw<Array<{ database: string; role: string; address: string | null }>>`
      SELECT current_database() AS database, current_user AS role, inet_server_addr()::text AS address
    `;
    if (targetIdentity?.database !== 'dolphin_crm_dev'
      || targetIdentity.role !== 'dolphin_crm_dev_app'
      || !targetIdentity.address?.startsWith('127.')) {
      throw new RoleCatalogSyncError('Role catalog sync refused: runtime connection identity is not the approved local database.');
    }

    const permissionIds = new Map<string, string>();
    for (const code of PERMISSION_CATALOG) {
      const separator = code.lastIndexOf('.');
      const resource = code.slice(0, separator);
      const action = code.slice(separator + 1);
      const existing = await tx.permission.findUnique({ where: { code } });
      if (existing) {
        if (existing.resource !== resource || existing.action !== action) {
          throw new RoleCatalogSyncError(`Permission definition mismatch for ${code}; refusing to alter the existing registry.`);
        }
        permissionIds.set(code, existing.id);
      } else {
        const created = await tx.permission.create({ data: { code, resource, action } });
        permissionIds.set(code, created.id);
      }
    }

    for (const roleCode of PLATFORM_ROLES) {
      const binding = ROLE_BINDINGS[roleCode];
      const existing = await tx.role.findUnique({
        where: { code: roleCode },
        include: { permissions: { include: { permission: true } } },
      });
      if (existing && (existing.scope !== binding.scope
        || existing.allowedOrganizationType !== binding.allowedOrganizationType
        || !existing.isSystemRole)) {
        throw new RoleCatalogSyncError(`Role definition mismatch for ${roleCode}; refusing to alter existing scope or flags.`);
      }

      const role = existing ?? await tx.role.create({
        data: {
          code: roleCode,
          name: ROLE_NAMES[roleCode],
          scope: binding.scope,
          allowedOrganizationType: binding.allowedOrganizationType,
          isSystemRole: true,
        },
      });
      const expected = permissionsForRole(roleCode);
      const existingCodes = existing?.permissions.map((entry) => entry.permission.code) ?? [];
      if (existingCodes.some((code) => !(expected as readonly string[]).includes(code))) {
        throw new RoleCatalogSyncError(`Role ${roleCode} has extra database permissions; refusing to remove or change them automatically.`);
      }

      for (const code of expected) {
        const permissionId = permissionIds.get(code);
        if (!permissionId) throw new RoleCatalogSyncError(`Static permission ${code} was not registered.`);
        await tx.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId } },
          create: { roleId: role.id, permissionId },
          update: {},
        });
      }
    }

    const databasePermissionCodes = (await tx.permission.findMany({ select: { code: true } }))
      .map(({ code }) => code).sort();
    const expectedPermissionCodes = [...PERMISSION_CATALOG].sort();
    if (databasePermissionCodes.length !== expectedPermissionCodes.length
      || databasePermissionCodes.some((code, index) => code !== expectedPermissionCodes[index])) {
      throw new RoleCatalogSyncError('Database permission catalog does not exactly match the approved static catalog.');
    }

    for (const roleCode of PLATFORM_ROLES) {
      const persisted = await tx.role.findUnique({
        where: { code: roleCode },
        include: { permissions: { include: { permission: true } } },
      });
      const actual = persisted?.permissions.map((entry) => entry.permission.code).sort() ?? [];
      const expected = [...permissionsForRole(roleCode)].sort();
      if (actual.length !== expected.length || actual.some((code, index) => code !== expected[index])) {
        throw new RoleCatalogSyncError(`Persisted role permissions for ${roleCode} do not match the static registry.`);
      }
    }
    }, { isolationLevel: 'Serializable' });

    console.log(`Synchronized and verified ${PLATFORM_ROLES.length} static roles and ${PERMISSION_CATALOG.length} static permissions in the local development database.`);
  } finally {
    await prisma.$disconnect();
  }
}

void synchronizeRoleCatalog().catch((error: unknown) => {
  if (error instanceof RoleCatalogSyncError) {
    process.stderr.write(`${error.message}\n`);
  } else {
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'sync-error';
    process.stderr.write(`Role catalog sync failed (${code}); no connection details were logged.\n`);
  }
  process.exitCode = 1;
});
