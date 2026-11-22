BEGIN;
DO $$ BEGIN
  IF current_database() <> 'dolphin_crm_dev' OR current_user <> 'dolphin_crm_dev_migrator'
    OR inet_server_addr() IS NULL
    OR NOT (inet_server_addr() <<= inet '127.0.0.0/8' OR inet_server_addr() <<= inet '::1/128')
  THEN RAISE EXCEPTION 'Lead grants require the isolated local development database and migrator'; END IF;
  IF to_regclass('public.leads') IS NULL OR to_regclass('public.lead_notes') IS NULL
    OR to_regclass('public.lead_events') IS NULL OR to_regclass('public.lead_assignment_history') IS NULL
  THEN RAISE EXCEPTION 'Lead migration must be applied first'; END IF;
END $$;

REVOKE ALL ON TABLE public.leads, public.lead_notes, public.lead_events FROM PUBLIC, dolphin_crm_dev_app;
GRANT SELECT, INSERT, UPDATE ON TABLE public.leads TO dolphin_crm_dev_app;
GRANT SELECT, INSERT ON TABLE public.lead_notes, public.lead_events TO dolphin_crm_dev_app;
REVOKE DELETE, TRUNCATE ON TABLE public.leads, public.lead_notes, public.lead_events FROM PUBLIC, dolphin_crm_dev_app;
REVOKE UPDATE ON TABLE public.lead_notes, public.lead_events FROM PUBLIC, dolphin_crm_dev_app;
GRANT SELECT, INSERT ON TABLE public.lead_assignment_history TO dolphin_crm_dev_app;
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.lead_assignment_history FROM PUBLIC, dolphin_crm_dev_app;
COMMIT;
