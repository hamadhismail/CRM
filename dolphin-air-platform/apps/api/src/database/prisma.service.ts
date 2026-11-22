import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import {
  isPostgresLoopbackAddress,
  validateRuntimeDatabaseTarget,
} from './runtime-database-target.policy';

interface RuntimeDatabaseCheck {
  databaseName: string;
  serverAddress: string | null;
  roleName: string;
  canCreateSchema: boolean;
  canCreateSchemasInDatabase: boolean;
  isSuperuser: boolean;
  canCreateDatabase: boolean;
  canCreateRoles: boolean;
  canAssumeMigrator: boolean;
  auditTableExists: boolean;
  auditSelect: boolean;
  auditInsert: boolean;
  auditUpdate: boolean;
  auditDelete: boolean;
  auditTruncate: boolean;
}

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private prisma?: PrismaClient;
  private ready = false;

  async onModuleInit(): Promise<void> {
    const connectionString = process.env.DATABASE_URL;
    const target = validateRuntimeDatabaseTarget(connectionString);

    if (!target.allowed) {
      this.logger.warn(target.reason);
      return;
    }

    const client = new PrismaClient({
      adapter: new PrismaPg({ connectionString: connectionString! }),
    });

    try {
      await client.$connect();
      const checks = await client.$queryRaw<RuntimeDatabaseCheck[]>`
        SELECT
          current_database() AS "databaseName",
          inet_server_addr()::text AS "serverAddress",
          current_user AS "roleName",
          has_schema_privilege(current_user, 'public', 'CREATE') AS "canCreateSchema",
          has_database_privilege(current_user, current_database(), 'CREATE') AS "canCreateSchemasInDatabase",
          (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS "isSuperuser",
          (SELECT rolcreatedb FROM pg_roles WHERE rolname = current_user) AS "canCreateDatabase",
          (SELECT rolcreaterole FROM pg_roles WHERE rolname = current_user) AS "canCreateRoles",
          pg_has_role(current_user, 'dolphin_crm_dev_migrator', 'MEMBER') AS "canAssumeMigrator",
          to_regclass('public.audit_events') IS NOT NULL AS "auditTableExists",
          CASE WHEN to_regclass('public.audit_events') IS NULL THEN false
            ELSE has_table_privilege(current_user, 'public.audit_events', 'SELECT') END AS "auditSelect",
          CASE WHEN to_regclass('public.audit_events') IS NULL THEN false
            ELSE has_table_privilege(current_user, 'public.audit_events', 'INSERT') END AS "auditInsert",
          CASE WHEN to_regclass('public.audit_events') IS NULL THEN false
            ELSE has_table_privilege(current_user, 'public.audit_events', 'UPDATE') END AS "auditUpdate",
          CASE WHEN to_regclass('public.audit_events') IS NULL THEN false
            ELSE has_table_privilege(current_user, 'public.audit_events', 'DELETE') END AS "auditDelete",
          CASE WHEN to_regclass('public.audit_events') IS NULL THEN false
            ELSE has_table_privilege(current_user, 'public.audit_events', 'TRUNCATE') END AS "auditTruncate"
      `;
      const check = checks[0];

      if (!check || !isApprovedConnectionTarget(check)) {
        await client.$disconnect();
        this.logger.error('Database connection rejected: target identity or runtime privileges failed verification.');
        return;
      }

      if (check && !check.auditTableExists) {
        await client.$disconnect();
        this.logger.warn('Database connected, but the identity migration is not applied; database-backed services remain unavailable.');
        return;
      }

      if (!isApprovedAuditPolicy(check)) {
        await client.$disconnect();
        this.logger.error('Database connection rejected: audit-event privileges failed append-only verification.');
        return;
      }

      this.prisma = client;
      this.ready = true;
      this.logger.log(check.auditTableExists
        ? 'Connected to the isolated development database; runtime privileges verified.'
        : 'Connected to the isolated development database; identity migration is not applied yet.');
    } catch (error) {
      await client.$disconnect().catch(() => undefined);
      const code = error && typeof error === 'object' && 'code' in error
        ? String(error.code)
        : 'connection-error';
      this.logger.error(`Development database is unavailable (${code}); database-backed services remain unavailable.`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.prisma) return;
    await this.prisma.$disconnect().catch(() => {
      this.logger.warn('Database disconnect reported an error during shutdown.');
    });
  }

  get client(): PrismaClient {
    if (!this.prisma || !this.ready) {
      throw new ServiceUnavailableException({
        error: 'DATABASE_UNAVAILABLE',
        message: 'Database-backed services are temporarily unavailable.',
      });
    }
    return this.prisma;
  }

  get isReady(): boolean {
    return this.ready;
  }
}

function isApprovedConnectionTarget(check: RuntimeDatabaseCheck): boolean {
  return check.databaseName === 'dolphin_crm_dev'
    && check.roleName === 'dolphin_crm_dev_app'
    && isPostgresLoopbackAddress(check.serverAddress)
    && !check.canCreateSchema
    && !check.canCreateSchemasInDatabase
    && !check.isSuperuser
    && !check.canCreateDatabase
    && !check.canCreateRoles
    && !check.canAssumeMigrator;
}

function isApprovedAuditPolicy(check: RuntimeDatabaseCheck): boolean {
  return check.auditTableExists
    && check.auditSelect
    && check.auditInsert
    && !check.auditUpdate
    && !check.auditDelete
    && !check.auditTruncate;
}

