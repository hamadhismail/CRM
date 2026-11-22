-- Keep the runtime application account from modifying historical audit events.
-- The isolated development roles must exist before this migration is applied.
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE "audit_events" FROM "dolphin_crm_dev_app";

-- Cross-field invariants not expressible in the Prisma schema.
ALTER TABLE "users"
    ADD CONSTRAINT "users_email_normalized_lowercase_check"
    CHECK ("email_normalized" IS NULL OR "email_normalized" = lower("email_normalized")),
    ADD CONSTRAINT "users_disabled_at_status_check"
    CHECK (("status" = 'DISABLED') = ("disabled_at" IS NOT NULL));

ALTER TABLE "organization_memberships"
    ADD CONSTRAINT "organization_memberships_revoked_at_status_check"
    CHECK (("status" = 'REVOKED') = ("revoked_at" IS NOT NULL));

ALTER TABLE "user_roles"
    ADD CONSTRAINT "user_roles_revoked_at_status_check"
    CHECK (("status" = 'REVOKED') = ("revoked_at" IS NOT NULL));

ALTER TABLE "customer_identities"
    ADD CONSTRAINT "customer_identities_verified_at_status_check"
    CHECK ("status" <> 'VERIFIED' OR "identity_verified_at" IS NOT NULL);
