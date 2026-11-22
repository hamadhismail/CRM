-- Apply only after 0005_customer_contact_foundation is deployed.
-- Run as dolphin_crm_dev_migrator, against the isolated local development DB.
BEGIN;

DO $$
BEGIN
  IF current_database() <> 'dolphin_crm_dev' OR current_user <> 'dolphin_crm_dev_migrator' THEN
    RAISE EXCEPTION 'Customer runtime grants require dolphin_crm_dev and the dedicated migration role';
  END IF;
  IF inet_server_addr() IS NULL
     OR NOT (inet_server_addr() <<= inet '127.0.0.0/8' OR inet_server_addr() <<= inet '::1/128') THEN
    RAISE EXCEPTION 'Refusing customer grants on a non-loopback server';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dolphin_crm_dev_app')
     OR pg_has_role('dolphin_crm_dev_app', 'dolphin_crm_dev_migrator', 'MEMBER') THEN
    RAISE EXCEPTION 'Runtime role is missing or inherits migration privileges';
  END IF;
  IF has_schema_privilege('dolphin_crm_dev_app', 'public', 'CREATE')
     OR has_database_privilege('dolphin_crm_dev_app', current_database(), 'CREATE') THEN
    RAISE EXCEPTION 'Runtime role has schema creation privileges';
  END IF;
  IF to_regclass('public.customers') IS NULL
     OR to_regclass('public.customer_contacts') IS NULL
     OR to_regclass('public.customer_activities') IS NULL
     OR to_regclass('public.customer_lead_links') IS NULL
     OR to_regclass('public._prisma_migrations') IS NULL THEN
    RAISE EXCEPTION 'Customer migration and migration history must exist before grants';
  END IF;
END $$;

REVOKE ALL PRIVILEGES ON TABLE
  public.customers, public.customer_contacts, public.customer_activities, public.customer_lead_links
  FROM PUBLIC, dolphin_crm_dev_app;
GRANT SELECT, INSERT, UPDATE ON TABLE public.customers, public.customer_contacts TO dolphin_crm_dev_app;
GRANT SELECT, INSERT ON TABLE public.customer_activities, public.customer_lead_links TO dolphin_crm_dev_app;
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.customer_activities, public.customer_lead_links
  FROM PUBLIC, dolphin_crm_dev_app;
REVOKE DELETE, TRUNCATE ON TABLE public.customers, public.customer_contacts
  FROM PUBLIC, dolphin_crm_dev_app;
REVOKE ALL PRIVILEGES ON TABLE public._prisma_migrations FROM PUBLIC, dolphin_crm_dev_app;

-- Default privileges remain closed for future tables and sequences.
ALTER DEFAULT PRIVILEGES FOR ROLE dolphin_crm_dev_migrator IN SCHEMA public
  REVOKE ALL ON TABLES FROM PUBLIC, dolphin_crm_dev_app;
ALTER DEFAULT PRIVILEGES FOR ROLE dolphin_crm_dev_migrator IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM PUBLIC, dolphin_crm_dev_app;

COMMIT;
