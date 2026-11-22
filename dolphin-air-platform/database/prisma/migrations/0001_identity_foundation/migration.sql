-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('INVITED', 'ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('INTERNAL_STAFF', 'AGENCY_USER', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('INTERNAL', 'B2B_AGENCY');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "RoleScope" AS ENUM ('SYSTEM', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "UserRoleStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "CustomerIdentityStatus" AS ENUM ('PENDING_VERIFICATION', 'VERIFIED', 'DISABLED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "firebase_uid" VARCHAR(128),
    "display_name" VARCHAR(160) NOT NULL,
    "email" VARCHAR(320),
    "email_normalized" VARCHAR(320),
    "phone_number" VARCHAR(32),
    "status" "UserStatus" NOT NULL DEFAULT 'INVITED',
    "user_type" "UserType" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "disabled_at" TIMESTAMPTZ(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "type" "OrganizationType" NOT NULL,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_memberships" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'INVITED',
    "invited_at" TIMESTAMPTZ(3),
    "joined_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "organization_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "scope" "RoleScope" NOT NULL DEFAULT 'ORGANIZATION',
    "is_system_role" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "code" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "resource" VARCHAR(80) NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "status" "UserRoleStatus" NOT NULL DEFAULT 'ACTIVE',
    "assigned_by_id" UUID,
    "assigned_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(3),

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "code" VARCHAR(48) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "code" VARCHAR(48) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "department_memberships" (
    "organization_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "department_id" UUID NOT NULL,

    CONSTRAINT "department_memberships_pkey" PRIMARY KEY ("membership_id","department_id")
);

-- CreateTable
CREATE TABLE "branch_memberships" (
    "organization_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,

    CONSTRAINT "branch_memberships_pkey" PRIMARY KEY ("membership_id","branch_id")
);

-- CreateTable
CREATE TABLE "customer_identities" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "CustomerIdentityStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "identity_verified_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "customer_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "actor_user_id" UUID,
    "action" VARCHAR(120) NOT NULL,
    "target_type" VARCHAR(120) NOT NULL,
    "target_id" VARCHAR(160),
    "request_id" VARCHAR(128),
    "safe_metadata" JSONB,
    "event_timestamp" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_firebase_uid_key" ON "users"("firebase_uid");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_normalized_key" ON "users"("email_normalized");

-- CreateIndex
CREATE INDEX "users_status_user_type_idx" ON "users"("status", "user_type");

-- CreateIndex
CREATE INDEX "users_display_name_idx" ON "users"("display_name");

-- CreateIndex
CREATE INDEX "organizations_type_status_idx" ON "organizations"("type", "status");

-- CreateIndex
CREATE INDEX "organizations_name_idx" ON "organizations"("name");

-- CreateIndex
CREATE INDEX "organization_memberships_user_id_status_idx" ON "organization_memberships"("user_id", "status");

-- CreateIndex
CREATE INDEX "organization_memberships_organization_id_status_idx" ON "organization_memberships"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "organization_memberships_id_organization_id_key" ON "organization_memberships"("id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_memberships_organization_id_user_id_key" ON "organization_memberships"("organization_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE INDEX "roles_scope_is_system_role_idx" ON "roles"("scope", "is_system_role");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "permissions_resource_idx" ON "permissions"("resource");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_resource_action_key" ON "permissions"("resource", "action");

-- CreateIndex
CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions"("permission_id");

-- CreateIndex
CREATE INDEX "user_roles_organization_id_status_idx" ON "user_roles"("organization_id", "status");

-- CreateIndex
CREATE INDEX "user_roles_role_id_status_idx" ON "user_roles"("role_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_membership_id_role_id_key" ON "user_roles"("membership_id", "role_id");

-- CreateIndex
CREATE INDEX "departments_organization_id_active_idx" ON "departments"("organization_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "departments_id_organization_id_key" ON "departments"("id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "departments_organization_id_code_key" ON "departments"("organization_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "departments_organization_id_name_key" ON "departments"("organization_id", "name");

-- CreateIndex
CREATE INDEX "branches_organization_id_active_idx" ON "branches"("organization_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "branches_id_organization_id_key" ON "branches"("id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "branches_organization_id_code_key" ON "branches"("organization_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "branches_organization_id_name_key" ON "branches"("organization_id", "name");

-- CreateIndex
CREATE INDEX "department_memberships_organization_id_department_id_idx" ON "department_memberships"("organization_id", "department_id");

-- CreateIndex
CREATE INDEX "branch_memberships_organization_id_branch_id_idx" ON "branch_memberships"("organization_id", "branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_identities_user_id_key" ON "customer_identities"("user_id");

-- CreateIndex
CREATE INDEX "customer_identities_status_identity_verified_at_idx" ON "customer_identities"("status", "identity_verified_at");

-- CreateIndex
CREATE INDEX "audit_events_organization_id_event_timestamp_idx" ON "audit_events"("organization_id", "event_timestamp" DESC);

-- CreateIndex
CREATE INDEX "audit_events_actor_user_id_event_timestamp_idx" ON "audit_events"("actor_user_id", "event_timestamp" DESC);

-- CreateIndex
CREATE INDEX "audit_events_target_type_target_id_event_timestamp_idx" ON "audit_events"("target_type", "target_id", "event_timestamp" DESC);

-- CreateIndex
CREATE INDEX "audit_events_request_id_idx" ON "audit_events"("request_id");

-- AddForeignKey
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_membership_id_organization_id_fkey" FOREIGN KEY ("membership_id", "organization_id") REFERENCES "organization_memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_memberships" ADD CONSTRAINT "department_memberships_membership_id_organization_id_fkey" FOREIGN KEY ("membership_id", "organization_id") REFERENCES "organization_memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_memberships" ADD CONSTRAINT "department_memberships_department_id_organization_id_fkey" FOREIGN KEY ("department_id", "organization_id") REFERENCES "departments"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_memberships" ADD CONSTRAINT "branch_memberships_membership_id_organization_id_fkey" FOREIGN KEY ("membership_id", "organization_id") REFERENCES "organization_memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_memberships" ADD CONSTRAINT "branch_memberships_branch_id_organization_id_fkey" FOREIGN KEY ("branch_id", "organization_id") REFERENCES "branches"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_identities" ADD CONSTRAINT "customer_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- BEGIN DOLPHIN AIR IDENTITY HARDENING
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
-- END DOLPHIN AIR IDENTITY HARDENING
