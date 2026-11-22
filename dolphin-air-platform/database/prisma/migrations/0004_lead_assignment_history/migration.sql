-- CreateTable
CREATE TABLE "lead_assignment_history" (
    "id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "previous_assigned_membership_id" UUID,
    "assigned_membership_id" UUID NOT NULL,
    "actor_membership_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_assignment_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lead_assignment_history_organization_id_lead_id_assigned_at_idx" ON "lead_assignment_history"("organization_id", "lead_id", "assigned_at" DESC);

-- CreateIndex
CREATE INDEX "lead_assignment_history_organization_id_assigned_membership_idx" ON "lead_assignment_history"("organization_id", "assigned_membership_id", "assigned_at" DESC);

-- AddForeignKey
ALTER TABLE "lead_assignment_history" ADD CONSTRAINT "lead_assignment_history_lead_id_organization_id_fkey" FOREIGN KEY ("lead_id", "organization_id") REFERENCES "leads"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_assignment_history" ADD CONSTRAINT "lead_assignment_history_previous_assigned_membership_id_or_fkey" FOREIGN KEY ("previous_assigned_membership_id", "organization_id") REFERENCES "organization_memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_assignment_history" ADD CONSTRAINT "lead_assignment_history_assigned_membership_id_organizatio_fkey" FOREIGN KEY ("assigned_membership_id", "organization_id") REFERENCES "organization_memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_assignment_history" ADD CONSTRAINT "lead_assignment_history_actor_membership_id_organization_i_fkey" FOREIGN KEY ("actor_membership_id", "organization_id") REFERENCES "organization_memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

