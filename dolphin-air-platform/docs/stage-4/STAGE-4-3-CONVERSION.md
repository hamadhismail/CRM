# Stage 4.3 — Lead-to-Customer Conversion

## Eligibility and mapping

The Stage 4.2 rule is preserved: only an active `WON` Lead can be converted. Archived Leads and already-linked Leads are ineligible. Conversion requires `customers.convert` and an active organization context.

The create path maps Lead name, country code, phone, normalized phone, email, organization, actor membership, and ownership to an individual Customer. It creates a `CONVERTED` link and `LEAD_CONVERTED` activity. It does not create an opportunity, booking, portal account, or external message.

The link path accepts an existing active customer only in the same organization and visible to the actor, creates a `LINKED` relationship, and records `LEAD_LINKED` activity.

## Transaction and retry behavior

Conversion runs in a serializable Prisma transaction. It locks active membership/Lead state, checks status and existing links, checks duplicates before creating a profile, and writes customer/link/activity atomically. Duplicate matches block automatic creation until reviewed; an explicit `allowDuplicate` is required. Unique organization/Lead and organization/idempotency constraints protect concurrent retries. A repeated request resolves to the existing link; reuse of one key for a different Lead/customer is rejected.

Authenticated local PostgreSQL tests verified create, link, same-key replay, parallel create conversions producing exactly one link/customer target, duplicate handling, and cross-organization link rejection. Browser E2E verified the Lead conversion UI and resulting profile.
