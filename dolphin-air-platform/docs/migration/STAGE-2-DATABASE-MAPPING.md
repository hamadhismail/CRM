# Stage 2 Database Mapping

## Observed persistence model

The source uses Firebase Auth, Cloud Firestore and Firebase Storage; the API uses Firebase Admin. No relational schema exists in the old source. `firestore.rules` and indexes confirm authorization and selected collection paths. `src/types.ts` contains rich domain DTOs, which must not be mistaken for a one-type/one-collection schema. No Prisma models or migrations were created in this stage.

Observed Firestore collection identifiers in source access code include `applicants`, `audit_logs`, `configs`, `customer_otps`, `customers`, `documents`, `messages`, `packages`, `payments`, `phone_index`, `travelers`, `visa_customer_otps`, and `visa_orders`. Rules/indexes also refer to `users`, `bookings`, `custom_quotes` (with `revisions` subcollection), `templates`, `whatsapp_templates`, `whatsapp_template_catalog`, `whatsapp_automations`, `whatsapp_automation_logs`, `logs`, `whatsapp_logs`, `notification_states`, `payment_followups`, `expenses`, `visa_products`, and other rule-protected paths. Some data are embedded in documents or accessed through dynamic paths; this list is not a definitive collection schema.

## Relationships evidenced by typed fields / source workflows

| Source entity/reference | Observed relationship | Relational design question |
|---|---|---|
| User/staff | User id/email, role, active flag, permission arrays; rules key staff record by normalized email | Preserve Firebase UID and email identity mapping; decide role/permission normalization and audit history |
| Lead | Lead contains `bookings[]`; each booking summary has `tripId`, `packageId`, agents, quote revision and pricing snapshots | Is booking a child record or legacy embedded snapshot? Preserve snapshot prices/status and source ids |
| Booking/trip | Lead booking summary links trip and package; trip views retrieve trip by id | Canonical trip ownership and group membership require full write-path audit |
| Traveler | `tripId`, passport profile, document array, verification state | Customer ownership and traveler reuse across trips need an explicit join model |
| Package/departure/inventory | Package stores departure/return dates, seats, booked seats, status, hotel/flight/itinerary, images and document refs | Determine whether departures and inventory are separate records or package fields |
| Payment | Customer, target type/id, entity type/id, lead/trip/visa order refs, proof attempts, receipt, approval and acknowledgement state | Preserve multiple target references, status transitions, precision, deduplication and immutable history |
| Expense | Optional package/trip/lead/traveler refs; supplier/payable/payment refs and paid/outstanding amounts | Reconcile derived balances and supplier payable allocations transactionally |
| Custom quote | `leadId`, revision number/current revision, accepted snapshot, converted trip | Preserve immutable revisions, accepted commercial snapshot and conversion idempotency |
| Visa product/order/applicant | Order snapshots product/prices/services; order has customer and applicant counts; applicant has processing/commercial details | Separate product snapshots from mutable product catalog; preserve status history and supplier assignment history |
| Visa supplier/payable/payment | Supplier and per-applicant cost, payable, adjustments and payments | Model payable ledger and allocation rows without losing legacy ids |
| Conversation/message | Conversation participant ids/names/roles, lead reference, unread counts; messages link lead | Confirm whether `messages` is internal, customer chat, or both before normalization |
| Notification/audit | Notification entity type/id, channel/status/idempotency key/read state; audit logs | Preserve event identity, attempts and audit immutability |
| Config | Agency, categories, agents, Google Sheets and WhatsApp settings/tokens | Never import secrets; split configuration from secret store and record replacement requirements |

## Migration plan constraints

1. Capture original collection/document ids and cross-references in a source-to-target key map.
2. Use sanitized/synthetic development fixtures; do not export live production data as a shortcut.
3. Establish exact money precision/currency and timezone semantics before schema design.
4. Preserve soft-delete/restore states, approval records, status history, document versions, and supplier balance history.
5. Create test-only Prisma migrations and rollback/verification plans only after schema approval. Do not run production migrations.

All relationship statements above are mapping hypotheses grounded in source field names/rules/API paths. Validate them against every read/write path in `src/server/db.ts` and `server.ts` before relational schema approval.
