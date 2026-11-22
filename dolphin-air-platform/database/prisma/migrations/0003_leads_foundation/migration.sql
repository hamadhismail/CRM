-- CreateEnum
DO $$ BEGIN
  IF current_database() <> 'dolphin_crm_dev' OR current_user <> 'dolphin_crm_dev_migrator'
    OR inet_server_addr() IS NULL
    OR NOT (inet_server_addr() <<= inet '127.0.0.0/8' OR inet_server_addr() <<= inet '::1/128')
  THEN RAISE EXCEPTION 'Lead migration requires the isolated local development database and migrator'; END IF;
END $$;

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_PENDING', 'NEGOTIATION', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "LeadPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "LeadService" AS ENUM ('UMRAH', 'HAJJ', 'ZIYARATH', 'FLIGHT_TICKETS', 'HOTELS', 'VISA_ASSISTANCE', 'HOLIDAY_PACKAGES', 'OTHER_TRAVEL');

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "lead_number" VARCHAR(32) NOT NULL,
    "full_name" VARCHAR(160) NOT NULL,
    "country_code" VARCHAR(8) NOT NULL,
    "phone_number" VARCHAR(32) NOT NULL,
    "phone_normalized" VARCHAR(32) NOT NULL,
    "email" VARCHAR(320),
    "email_normalized" VARCHAR(320),
    "source" VARCHAR(60) NOT NULL,
    "service" "LeadService" NOT NULL,
    "destination" VARCHAR(120),
    "departure_date" DATE,
    "expected_passengers" INTEGER,
    "budget_minimum" DECIMAL(14,2),
    "budget_maximum" DECIMAL(14,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "assigned_membership_id" UUID,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "priority" "LeadPriority" NOT NULL DEFAULT 'NORMAL',
    "description" VARCHAR(2000),
    "created_by_membership_id" UUID NOT NULL,
    "updated_by_membership_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "archived_at" TIMESTAMPTZ(3),

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "leads" ADD CONSTRAINT "leads_expected_passengers_nonnegative" CHECK ("expected_passengers" IS NULL OR "expected_passengers" >= 0);
ALTER TABLE "leads" ADD CONSTRAINT "leads_budget_range_valid" CHECK (
  ("budget_minimum" IS NULL OR "budget_minimum" >= 0)
  AND ("budget_maximum" IS NULL OR "budget_maximum" >= 0)
  AND ("budget_minimum" IS NULL OR "budget_maximum" IS NULL OR "budget_minimum" <= "budget_maximum")
);
ALTER TABLE "leads" ADD CONSTRAINT "leads_currency_iso" CHECK ("currency" ~ '^[A-Z]{3}$');

-- CreateTable
CREATE TABLE "lead_notes" (
    "id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "author_membership_id" UUID NOT NULL,
    "body" VARCHAR(4000) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_events" (
    "id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "actor_membership_id" UUID NOT NULL,
    "event_type" VARCHAR(48) NOT NULL,
    "safe_metadata" JSONB,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leads_organization_id_archived_at_created_at_idx" ON "leads"("organization_id", "archived_at", "created_at" DESC);

-- CreateIndex
CREATE INDEX "leads_organization_id_status_created_at_idx" ON "leads"("organization_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "leads_organization_id_assigned_membership_id_status_idx" ON "leads"("organization_id", "assigned_membership_id", "status");

-- CreateIndex
CREATE INDEX "leads_organization_id_phone_normalized_idx" ON "leads"("organization_id", "phone_normalized");

-- CreateIndex
CREATE INDEX "leads_organization_id_email_normalized_idx" ON "leads"("organization_id", "email_normalized");

-- CreateIndex
CREATE UNIQUE INDEX "leads_id_organization_id_key" ON "leads"("id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "leads_organization_id_lead_number_key" ON "leads"("organization_id", "lead_number");

-- CreateIndex
CREATE INDEX "lead_notes_lead_id_created_at_idx" ON "lead_notes"("lead_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "lead_events_lead_id_occurred_at_idx" ON "lead_events"("lead_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "lead_events_organization_id_occurred_at_idx" ON "lead_events"("organization_id", "occurred_at" DESC);

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_membership_id_organization_id_fkey" FOREIGN KEY ("assigned_membership_id", "organization_id") REFERENCES "organization_memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_created_by_membership_id_organization_id_fkey" FOREIGN KEY ("created_by_membership_id", "organization_id") REFERENCES "organization_memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_updated_by_membership_id_organization_id_fkey" FOREIGN KEY ("updated_by_membership_id", "organization_id") REFERENCES "organization_memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_lead_id_organization_id_fkey" FOREIGN KEY ("lead_id", "organization_id") REFERENCES "leads"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_author_membership_id_organization_id_fkey" FOREIGN KEY ("author_membership_id", "organization_id") REFERENCES "organization_memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_events" ADD CONSTRAINT "lead_events_lead_id_organization_id_fkey" FOREIGN KEY ("lead_id", "organization_id") REFERENCES "leads"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_events" ADD CONSTRAINT "lead_events_actor_membership_id_organization_id_fkey" FOREIGN KEY ("actor_membership_id", "organization_id") REFERENCES "organization_memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

