-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('INDIVIDUAL', 'BUSINESS');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "CustomerContactMethod" AS ENUM ('PHONE', 'EMAIL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "CustomerActivityType" AS ENUM ('CREATED', 'UPDATED', 'CONTACT_ADDED', 'CONTACT_UPDATED', 'LEAD_LINKED', 'LEAD_CONVERTED', 'ARCHIVED', 'RESTORED');

-- CreateEnum
CREATE TYPE "CustomerLeadLinkType" AS ENUM ('LINKED', 'CONVERTED');

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "customer_number" VARCHAR(32) NOT NULL,
    "type" "CustomerType" NOT NULL,
    "display_name" VARCHAR(160) NOT NULL,
    "legal_name" VARCHAR(180),
    "primary_country_code" VARCHAR(8),
    "primary_phone" VARCHAR(32),
    "phone_normalized" VARCHAR(32),
    "email" VARCHAR(320),
    "email_normalized" VARCHAR(320),
    "preferred_language" VARCHAR(32),
    "country" VARCHAR(80),
    "city" VARCHAR(100),
    "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "owner_membership_id" UUID NOT NULL,
    "created_by_membership_id" UUID NOT NULL,
    "updated_by_membership_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "archived_at" TIMESTAMPTZ(3),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_contacts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "full_name" VARCHAR(160) NOT NULL,
    "designation" VARCHAR(120),
    "country_code" VARCHAR(8),
    "phone_number" VARCHAR(32),
    "phone_normalized" VARCHAR(32),
    "email" VARCHAR(320),
    "email_normalized" VARCHAR(320),
    "preferred_method" "CustomerContactMethod",
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_by_membership_id" UUID NOT NULL,
    "updated_by_membership_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "archived_at" TIMESTAMPTZ(3),

    CONSTRAINT "customer_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_activities" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "actor_membership_id" UUID NOT NULL,
    "event_type" "CustomerActivityType" NOT NULL,
    "safe_metadata" JSONB,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_lead_links" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "actor_membership_id" UUID NOT NULL,
    "link_type" "CustomerLeadLinkType" NOT NULL,
    "idempotency_key" VARCHAR(128) NOT NULL,
    "linked_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_lead_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customers_organization_id_status_created_at_idx" ON "customers"("organization_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "customers_organization_id_type_status_idx" ON "customers"("organization_id", "type", "status");

-- CreateIndex
CREATE INDEX "customers_organization_id_owner_membership_id_status_idx" ON "customers"("organization_id", "owner_membership_id", "status");

-- CreateIndex
CREATE INDEX "customers_organization_id_phone_normalized_idx" ON "customers"("organization_id", "phone_normalized");

-- CreateIndex
CREATE INDEX "customers_organization_id_email_normalized_idx" ON "customers"("organization_id", "email_normalized");

-- CreateIndex
CREATE INDEX "customers_organization_id_display_name_idx" ON "customers"("organization_id", "display_name");

-- CreateIndex
CREATE UNIQUE INDEX "customers_id_organization_id_key" ON "customers"("id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_organization_id_customer_number_key" ON "customers"("organization_id", "customer_number");

-- CreateIndex
CREATE INDEX "customer_contacts_organization_id_customer_id_archived_at_f_idx" ON "customer_contacts"("organization_id", "customer_id", "archived_at", "full_name");

-- CreateIndex
CREATE INDEX "customer_contacts_organization_id_phone_normalized_idx" ON "customer_contacts"("organization_id", "phone_normalized");

-- CreateIndex
CREATE INDEX "customer_contacts_organization_id_email_normalized_idx" ON "customer_contacts"("organization_id", "email_normalized");

-- CreateIndex
CREATE UNIQUE INDEX "customer_contacts_id_organization_id_key" ON "customer_contacts"("id", "organization_id");

-- CreateIndex
CREATE INDEX "customer_activities_organization_id_customer_id_occurred_at_idx" ON "customer_activities"("organization_id", "customer_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "customer_activities_organization_id_occurred_at_idx" ON "customer_activities"("organization_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "customer_lead_links_organization_id_customer_id_linked_at_idx" ON "customer_lead_links"("organization_id", "customer_id", "linked_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "customer_lead_links_organization_id_lead_id_key" ON "customer_lead_links"("organization_id", "lead_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_lead_links_organization_id_idempotency_key_key" ON "customer_lead_links"("organization_id", "idempotency_key");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_owner_membership_id_organization_id_fkey" FOREIGN KEY ("owner_membership_id", "organization_id") REFERENCES "organization_memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_created_by_membership_id_organization_id_fkey" FOREIGN KEY ("created_by_membership_id", "organization_id") REFERENCES "organization_memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_updated_by_membership_id_organization_id_fkey" FOREIGN KEY ("updated_by_membership_id", "organization_id") REFERENCES "organization_memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_contacts" ADD CONSTRAINT "customer_contacts_customer_id_organization_id_fkey" FOREIGN KEY ("customer_id", "organization_id") REFERENCES "customers"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_contacts" ADD CONSTRAINT "customer_contacts_created_by_membership_id_organization_id_fkey" FOREIGN KEY ("created_by_membership_id", "organization_id") REFERENCES "organization_memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_contacts" ADD CONSTRAINT "customer_contacts_updated_by_membership_id_organization_id_fkey" FOREIGN KEY ("updated_by_membership_id", "organization_id") REFERENCES "organization_memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_activities" ADD CONSTRAINT "customer_activities_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_activities" ADD CONSTRAINT "customer_activities_customer_id_organization_id_fkey" FOREIGN KEY ("customer_id", "organization_id") REFERENCES "customers"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_activities" ADD CONSTRAINT "customer_activities_actor_membership_id_organization_id_fkey" FOREIGN KEY ("actor_membership_id", "organization_id") REFERENCES "organization_memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_lead_links" ADD CONSTRAINT "customer_lead_links_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_lead_links" ADD CONSTRAINT "customer_lead_links_customer_id_organization_id_fkey" FOREIGN KEY ("customer_id", "organization_id") REFERENCES "customers"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_lead_links" ADD CONSTRAINT "customer_lead_links_lead_id_organization_id_fkey" FOREIGN KEY ("lead_id", "organization_id") REFERENCES "leads"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_lead_links" ADD CONSTRAINT "customer_lead_links_actor_membership_id_organization_id_fkey" FOREIGN KEY ("actor_membership_id", "organization_id") REFERENCES "organization_memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Domain invariants that Prisma's schema DSL cannot currently express.
ALTER TABLE "customers"
  ADD CONSTRAINT "customers_business_legal_name_check"
    CHECK ("type" <> 'BUSINESS' OR NULLIF(BTRIM("legal_name"), '') IS NOT NULL),
  ADD CONSTRAINT "customers_phone_pair_check"
    CHECK (("primary_country_code" IS NULL) = ("primary_phone" IS NULL)),
  ADD CONSTRAINT "customers_phone_normalized_check"
    CHECK ("phone_normalized" IS NULL OR ("primary_phone" IS NOT NULL AND "phone_normalized" ~ '^[0-9]{6,20}$')),
  ADD CONSTRAINT "customers_email_normalized_check"
    CHECK ("email_normalized" IS NULL OR ("email" IS NOT NULL AND "email_normalized" = LOWER(BTRIM("email"))));

ALTER TABLE "customer_contacts"
  ADD CONSTRAINT "customer_contacts_phone_pair_check"
    CHECK (("country_code" IS NULL) = ("phone_number" IS NULL)),
  ADD CONSTRAINT "customer_contacts_contact_method_check"
    CHECK ("phone_number" IS NOT NULL OR "email" IS NOT NULL),
  ADD CONSTRAINT "customer_contacts_phone_normalized_check"
    CHECK ("phone_normalized" IS NULL OR ("phone_number" IS NOT NULL AND "phone_normalized" ~ '^[0-9]{6,20}$')),
  ADD CONSTRAINT "customer_contacts_email_normalized_check"
    CHECK ("email_normalized" IS NULL OR ("email" IS NOT NULL AND "email_normalized" = LOWER(BTRIM("email"))));

CREATE UNIQUE INDEX "customer_contacts_one_active_primary_key"
  ON "customer_contacts"("organization_id", "customer_id")
  WHERE "is_primary" = true AND "archived_at" IS NULL;
