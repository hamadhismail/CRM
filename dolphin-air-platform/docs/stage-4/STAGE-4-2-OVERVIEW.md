# Stage 4.2 overview

Status: PARTIALLY IMPLEMENTED. Stage 3 final acceptance remains partial. Authenticated Leads browser/API access has been verified in an isolated local E2E process; PostgreSQL identity auth remains disabled by default. The guarded API requires the explicit local test-process flag. No dashboard query was exposed.

Completed safe foundation: Prisma lead schema, applied additive migration, verified restricted runtime grants and synthetic rollback checks, generated Prisma Client, shared status/service/priority and list contracts. Lead conversion, follow-ups, assignment workflow and live customer data access are deferred.

## Stage 3.3.4 browser verification update (2026-11-22)

Five genuine Edge E2E tests now verify Firebase login, organization selection, scoped Leads workflows, session restoration, organization switching, revocation, and authorization denial against the local Auth Emulator, NestJS API and `dolphin_crm_dev`. This removes the previous browser-authentication blocker for the implemented Leads workflow. Stage 4.2 remains partial because broader scope is unfinished, including assignment, duplicate handling, conversion, and other deferred integrations.
