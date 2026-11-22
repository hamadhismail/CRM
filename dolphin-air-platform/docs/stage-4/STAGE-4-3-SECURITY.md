# Stage 4.3 — Security

## Permissions

Customer/contact permissions were added to the existing catalog and synchronized to the local development role catalog. They are assigned only to the existing `super_admin`, `admin`, and `sales` roles where needed. Sales receives customer read/create/update/convert and contact read/create/update. Only Admin and Super Admin receive customer archive/restore. Other roles do not gain customer access. E2E fixtures use the existing `admin` and `sales` role definitions; they do not create roles.

## Isolation and data handling

- Staff authentication is checked before customer data access; missing/forged/revoked tokens fail closed.
- Organization context and active membership are validated per request; customer/contact/link queries include organization scope.
- Composite tenant foreign keys prevent cross-organization customer/contact/Lead relationships.
- Sales visibility is constrained to owned/created CRM customer records; customer identities cannot be assigned as CRM relationship owners.
- Duplicate matching is organization-scoped and reveals only records the requesting role can read.
- Primary email/phone are normalized; phone/email are not globally unique. No automatic customer merge occurs.
- Audit/activity metadata contains event/source identifiers and safe field summaries, not bearer tokens or credentials. Activity/link tables are append-only to the runtime role.
- Archived records use soft archive; restore is permission-protected. No irreversible deletion API is exposed.
- Customer creation does not create a Firebase identity or collect identity/passport documents.

Database-backed staff identity remains disabled in defaults. E2E enabled it only in a dedicated local Nest child process after verifying `dolphin-air-local`, loopback Auth Emulator, and the isolated database roles. Production Firebase and non-development databases were not used.
