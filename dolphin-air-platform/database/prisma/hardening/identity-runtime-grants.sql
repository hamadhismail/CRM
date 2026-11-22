-- Apply only after the identity migration has been deployed to dolphin_crm_dev.
-- Connect as dolphin_crm_dev_migrator. This script is repeatable and grants
-- only the runtime data operations needed by the identity foundation.
BEGIN;

DO $$
BEGIN
    IF current_database() <> 'dolphin_crm_dev' THEN
        RAISE EXCEPTION 'Refusing runtime grants outside dolphin_crm_dev';
    END IF;
    IF current_user <> 'dolphin_crm_dev_migrator' THEN
        RAISE EXCEPTION 'Runtime grants must be applied by dolphin_crm_dev_migrator';
    END IF;
    IF inet_server_addr() IS NULL
       OR NOT (inet_server_addr() <<= inet '127.0.0.0/8'
               OR inet_server_addr() <<= inet '::1/128') THEN
        RAISE EXCEPTION 'Refusing runtime grants on a non-loopback PostgreSQL server';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dolphin_crm_dev_app') THEN
        RAISE EXCEPTION 'Runtime application role is missing';
    END IF;
    IF pg_has_role('dolphin_crm_dev_app', 'dolphin_crm_dev_migrator', 'MEMBER') THEN
        RAISE EXCEPTION 'Runtime application role must not inherit migration privileges';
    END IF;
    IF has_database_privilege('dolphin_crm_dev_app', current_database(), 'CREATE') THEN
        RAISE EXCEPTION 'Runtime application role must not be able to create schemas in the database';
    END IF;
    IF to_regclass('public.audit_events') IS NULL
       OR to_regclass('public._prisma_migrations') IS NULL THEN
        RAISE EXCEPTION 'Identity migration and Prisma migration history must exist first';
    END IF;
END;
$$;

GRANT USAGE ON SCHEMA public TO dolphin_crm_dev_app;
REVOKE CREATE ON SCHEMA public FROM dolphin_crm_dev_app;

-- Remove inherited/direct table and sequence access in this isolated database,
-- then grant only the explicit application tables below. Migration history stays
-- private to the migration role.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM PUBLIC, dolphin_crm_dev_app;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, dolphin_crm_dev_app;
REVOKE ALL PRIVILEGES ON TABLE public._prisma_migrations FROM PUBLIC, dolphin_crm_dev_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
    public.users,
    public.organizations,
    public.organization_memberships,
    public.roles,
    public.permissions,
    public.role_permissions,
    public.user_roles,
    public.departments,
    public.branches,
    public.department_memberships,
    public.branch_memberships,
    public.customer_identities
TO dolphin_crm_dev_app;

GRANT SELECT, INSERT ON TABLE public.audit_events TO dolphin_crm_dev_app;
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.audit_events
    FROM PUBLIC, dolphin_crm_dev_app;

-- Future objects created by the migrator receive no runtime access by default.
-- Add reviewed explicit grants when a future migration introduces an application
-- table. Future sequence-backed IDs require explicit USAGE/SELECT grants too.
ALTER DEFAULT PRIVILEGES FOR ROLE dolphin_crm_dev_migrator IN SCHEMA public
    REVOKE ALL ON TABLES FROM PUBLIC, dolphin_crm_dev_app;
ALTER DEFAULT PRIVILEGES FOR ROLE dolphin_crm_dev_migrator IN SCHEMA public
    REVOKE ALL ON SEQUENCES FROM PUBLIC, dolphin_crm_dev_app;

COMMIT;
