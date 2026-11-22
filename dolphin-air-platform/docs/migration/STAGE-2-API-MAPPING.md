# Stage 2 API Mapping

Source: `server.ts` in the supplied ZIP. Inventory lists each of the 260 explicit Express method/path declarations. Catch-all handler excluded. A static method/path comparison with bundled `functions/index.js` found the same 260 explicit routes (plus the same wildcard handlers); this does not verify that a deployed function matches either archive artifact. This is a route-to-module mapping, not a verified request/response contract. For each route, inspect handler body for input schema, response envelope/status, authentication/role/ownership checks, side effects, transaction/idempotency behavior and error cases before implementation.

| Existing method and path | New destination module | Contract status |
|---|---|---|
| POST `/api/scan-passport` | `passengers / passport-processing` | Not Started — handler contract review pending |
| GET `/api/announcements/active` | `settings / announcements` | Not Started — handler contract review pending |
| GET `/api/announcements` | `settings / announcements` | Not Started — handler contract review pending |
| POST `/api/announcements` | `settings / announcements` | Not Started — handler contract review pending |
| PATCH `/api/announcements/:id/status` | `settings / announcements` | Not Started — handler contract review pending |
| PATCH `/api/announcements/:id` | `settings / announcements` | Not Started — handler contract review pending |
| DELETE `/api/announcements/:id` | `settings / announcements` | Not Started — handler contract review pending |
| POST `/api/imagekit/upload-package-image` | `integrations / storage` | Not Started — handler contract review pending |
| GET `/api/imagekit/auth` | `integrations / storage` | Not Started — handler contract review pending |
| POST `/api/imagekit/auth` | `integrations / storage` | Not Started — handler contract review pending |
| POST `/api/auth/login` | `auth` | Not Started — handler contract review pending |
| POST `/api/auth/google` | `auth` | Not Started — handler contract review pending |
| GET `/api/auth/me` | `auth` | Not Started — handler contract review pending |
| GET `/api/agents` | `agents` | Not Started — handler contract review pending |
| POST `/api/agents` | `agents` | Not Started — handler contract review pending |
| GET `/api/categories` | `settings` | Not Started — handler contract review pending |
| POST `/api/categories` | `settings` | Not Started — handler contract review pending |
| GET `/api/users` | `users / roles / permissions` | Not Started — handler contract review pending |
| POST `/api/users` | `users / roles / permissions` | Not Started — handler contract review pending |
| DELETE `/api/users/:id` | `users / roles / permissions` | Not Started — handler contract review pending |
| PUT `/api/users/:email/username` | `users / roles / permissions` | Not Started — handler contract review pending |
| PUT `/api/users/:email/role` | `users / roles / permissions` | Not Started — handler contract review pending |
| PUT `/api/users/:email/status` | `users / roles / permissions` | Not Started — handler contract review pending |
| PUT `/api/users/:email/password` | `users / roles / permissions` | Not Started — handler contract review pending |
| GET `/api/leads` | `leads` | Not Started — handler contract review pending |
| POST `/api/leads` | `leads` | Not Started — handler contract review pending |
| PUT `/api/leads/:id` | `leads` | Not Started — handler contract review pending |
| DELETE `/api/leads/:id` | `leads` | Not Started — handler contract review pending |
| GET `/api/deleted-leads` | `leads` | Not Started — handler contract review pending |
| POST `/api/deleted-leads/:id/restore` | `leads` | Not Started — handler contract review pending |
| POST `/api/leads/:id/bookings` | `leads` | Not Started — handler contract review pending |
| PUT `/api/leads/:id/bookings/:tripId` | `leads` | Not Started — handler contract review pending |
| POST `/api/custom-quotes` | `quotations` | Not Started — handler contract review pending |
| GET `/api/custom-quotes` | `quotations` | Not Started — handler contract review pending |
| GET `/api/custom-quotes/:id` | `quotations` | Not Started — handler contract review pending |
| PATCH `/api/custom-quotes/:id` | `quotations` | Not Started — handler contract review pending |
| POST `/api/custom-quotes/:id/revisions` | `quotations` | Not Started — handler contract review pending |
| GET `/api/custom-quotes/:id/revisions` | `quotations` | Not Started — handler contract review pending |
| POST `/api/custom-quotes/:id/convert` | `quotations` | Not Started — handler contract review pending |
| POST `/api/custom-quotes/:id/media-pdf` | `quotations` | Not Started — handler contract review pending |
| POST `/api/custom-quotes/:id/share` | `quotations` | Not Started — handler contract review pending |
| GET `/api/trips/:tripId` | `trips` | Not Started — handler contract review pending |
| GET `/api/payments` | `payments` | Not Started — handler contract review pending |
| POST `/api/payments` | `payments` | Not Started — handler contract review pending |
| PUT `/api/payments/:id` | `payments` | Not Started — handler contract review pending |
| DELETE `/api/payments/:id` | `payments` | Not Started — handler contract review pending |
| POST `/api/payments/:id/request-delete` | `payments` | Not Started — handler contract review pending |
| POST `/api/payments/:id/reject-delete` | `payments` | Not Started — handler contract review pending |
| GET `/api/payments/:id/proof` | `payments` | Not Started — handler contract review pending |
| POST `/api/payments/:id/receipt` | `payments` | Not Started — handler contract review pending |
| GET `/api/chats/:leadId` | `review handler; map to owning module` | Not Started — handler contract review pending |
| POST `/api/chats` | `review handler; map to owning module` | Not Started — handler contract review pending |
| PUT `/api/chats/:id` | `review handler; map to owning module` | Not Started — handler contract review pending |
| GET `/api/payment-followups` | `payment-followups` | Not Started — handler contract review pending |
| POST `/api/payment-followups` | `payment-followups` | Not Started — handler contract review pending |
| PUT `/api/payment-followups/:id` | `payment-followups` | Not Started — handler contract review pending |
| DELETE `/api/payment-followups/:id` | `payment-followups` | Not Started — handler contract review pending |
| GET `/api/expenses` | `expenses` | Not Started — handler contract review pending |
| POST `/api/expenses` | `expenses` | Not Started — handler contract review pending |
| PUT `/api/expenses/:id` | `expenses` | Not Started — handler contract review pending |
| DELETE `/api/expenses/:id` | `expenses` | Not Started — handler contract review pending |
| GET `/api/audit-logs` | `audit` | Not Started — handler contract review pending |
| GET `/api/packages` | `packages` | Not Started — handler contract review pending |
| POST `/api/packages` | `packages` | Not Started — handler contract review pending |
| PUT `/api/packages/:id` | `packages` | Not Started — handler contract review pending |
| DELETE `/api/packages/:id` | `packages` | Not Started — handler contract review pending |
| GET `/api/admin/visa/products` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| GET `/api/admin/visa/products/:id` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| POST `/api/admin/visa/products` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| PATCH `/api/admin/visa/products/:id` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| DELETE `/api/admin/visa/products/:id` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| GET `/api/visa/products` | `review handler; map to owning module` | Not Started — handler contract review pending |
| GET `/api/visa/products/:id` | `review handler; map to owning module` | Not Started — handler contract review pending |
| POST `/api/visa/products` | `review handler; map to owning module` | Not Started — handler contract review pending |
| PATCH `/api/visa/products/:id` | `review handler; map to owning module` | Not Started — handler contract review pending |
| DELETE `/api/visa/products/:id` | `review handler; map to owning module` | Not Started — handler contract review pending |
| GET `/api/travelers` | `passengers / passport-processing` | Not Started — handler contract review pending |
| POST `/api/travelers` | `passengers / passport-processing` | Not Started — handler contract review pending |
| PUT `/api/travelers/:id` | `passengers / passport-processing` | Not Started — handler contract review pending |
| DELETE `/api/travelers/:id` | `passengers / passport-processing` | Not Started — handler contract review pending |
| POST `/api/travelers/:id/documents` | `passengers / passport-processing` | Not Started — handler contract review pending |
| DELETE `/api/travelers/:id/documents/:docId` | `passengers / passport-processing` | Not Started — handler contract review pending |
| POST `/api/drive/view-ticket` | `documents / integrations` | Not Started — handler contract review pending |
| POST `/api/travelers/:id/documents/upload` | `passengers / passport-processing` | Not Started — handler contract review pending |
| GET `/api/drive/verify-root` | `documents / integrations` | Not Started — handler contract review pending |
| POST `/api/drive/backup` | `documents / integrations` | Not Started — handler contract review pending |
| GET `/api/drive/download/:driveFileId` | `documents / integrations` | Not Started — handler contract review pending |
| GET `/api/download` | `documents / integrations` | Not Started — handler contract review pending |
| GET `/api/whatsapp/templates` | `whatsapp / communications` | Not Started — handler contract review pending |
| POST `/api/whatsapp/templates` | `whatsapp / communications` | Not Started — handler contract review pending |
| GET `/api/whatsapp/logs` | `whatsapp / communications` | Not Started — handler contract review pending |
| GET `/api/whatsapp/config` | `whatsapp / communications` | Not Started — handler contract review pending |
| POST `/api/whatsapp/config` | `whatsapp / communications` | Not Started — handler contract review pending |
| GET `/api/whatsapp/status` | `whatsapp / communications` | Not Started — handler contract review pending |
| POST `/api/whatsapp/sync` | `whatsapp / communications` | Not Started — handler contract review pending |
| GET `/api/whatsapp/templates/catalog` | `whatsapp / communications` | Not Started — handler contract review pending |
| POST `/api/whatsapp/templates/sync` | `whatsapp / communications` | Not Started — handler contract review pending |
| PATCH `/api/whatsapp/templates/catalog/:id/enable` | `whatsapp / communications` | Not Started — handler contract review pending |
| POST `/api/whatsapp/templates/register` | `whatsapp / communications` | Not Started — handler contract review pending |
| DELETE `/api/whatsapp/templates/catalog/:id` | `whatsapp / communications` | Not Started — handler contract review pending |
| POST `/api/whatsapp/send-project-message` | `whatsapp / communications` | Not Started — handler contract review pending |
| GET `/api/sheets/config` | `integrations` | Not Started — handler contract review pending |
| POST `/api/sheets/config` | `integrations` | Not Started — handler contract review pending |
| GET `/api/sheets/sync-records` | `integrations` | Not Started — handler contract review pending |
| POST `/api/sheets/sync-records` | `integrations` | Not Started — handler contract review pending |
| GET `/api/sheets/sync-data` | `integrations` | Not Started — handler contract review pending |
| POST `/api/whatsapp/resolve/template-params` | `whatsapp / communications` | Not Started — handler contract review pending |
| POST `/api/whatsapp/resolve-template-params` | `whatsapp / communications` | Not Started — handler contract review pending |
| POST `/api/whatsapp/send` | `whatsapp / communications` | Not Started — handler contract review pending |
| POST `/api/whatsapp/check-duplicates` | `whatsapp / communications` | Not Started — handler contract review pending |
| POST `/api/whatsapp/bulk-send` | `whatsapp / communications` | Not Started — handler contract review pending |
| POST `/api/whatsapp/media-url` | `whatsapp / communications` | Not Started — handler contract review pending |
| GET `/api/whatsapp/automations` | `whatsapp / communications` | Not Started — handler contract review pending |
| POST `/api/whatsapp/automations` | `whatsapp / communications` | Not Started — handler contract review pending |
| PUT `/api/whatsapp/automations/:id` | `whatsapp / communications` | Not Started — handler contract review pending |
| PATCH `/api/whatsapp/automations/:id` | `whatsapp / communications` | Not Started — handler contract review pending |
| DELETE `/api/whatsapp/automations/:id` | `whatsapp / communications` | Not Started — handler contract review pending |
| PATCH `/api/whatsapp/automations/:id/toggle` | `whatsapp / communications` | Not Started — handler contract review pending |
| POST `/api/whatsapp/automations/:id/duplicate` | `whatsapp / communications` | Not Started — handler contract review pending |
| POST `/api/whatsapp/automations/test` | `whatsapp / communications` | Not Started — handler contract review pending |
| GET `/api/whatsapp/automations/history` | `whatsapp / communications` | Not Started — handler contract review pending |
| GET `/api/settings/agency` | `settings / announcements` | Not Started — handler contract review pending |
| PUT `/api/settings/agency` | `settings / announcements` | Not Started — handler contract review pending |
| GET `/api/settings/automation` | `settings / announcements` | Not Started — handler contract review pending |
| PUT `/api/settings/automation` | `settings / announcements` | Not Started — handler contract review pending |
| GET `/api/public/config` | `review handler; map to owning module` | Not Started — handler contract review pending |
| GET `/api/public/visa/products` | `visas / visa-orders` | Not Started — handler contract review pending |
| GET `/api/imagekit/auth` | `integrations / storage` | Not Started — handler contract review pending |
| GET `/api/public/packages` | `packages (portal read dependency)` | Not Started — handler contract review pending |
| POST `/api/public/check-customer` | `bookings / customers / auth` | Not Started — handler contract review pending |
| POST `/api/public/book` | `bookings / customers / auth` | Not Started — handler contract review pending |
| POST `/api/public/otp/request` | `bookings / customers / auth` | Not Started — handler contract review pending |
| POST `/api/public/otp/verify` | `bookings / customers / auth` | Not Started — handler contract review pending |
| POST `/api/customer/visa/auth/send-otp` | `visa-orders / visas / documents / payments` | Not Started — handler contract review pending |
| POST `/api/customer/visa/auth/verify-otp` | `visa-orders / visas / documents / payments` | Not Started — handler contract review pending |
| POST `/api/customer/visa/auth/firebase-verify` | `visa-orders / visas / documents / payments` | Not Started — handler contract review pending |
| POST `/api/customer/auth/send-otp` | `customers / auth / notifications` | Not Started — handler contract review pending |
| POST `/api/customer/auth/verify-otp` | `customers / auth / notifications` | Not Started — handler contract review pending |
| POST `/api/customer/auth/firebase-verify` | `customers / auth / notifications` | Not Started — handler contract review pending |
| POST `/api/customer/auth/logout` | `customers / auth / notifications` | Not Started — handler contract review pending |
| GET `/api/customer/bookings` | `bookings / customers` | Not Started — handler contract review pending |
| POST `/api/customer/book` | `bookings / customers` | Not Started — handler contract review pending |
| GET `/api/customer/payments` | `payments` | Not Started — handler contract review pending |
| POST `/api/customer/payments/record` | `payments` | Not Started — handler contract review pending |
| GET `/api/customer/payments/:id/proof` | `payments` | Not Started — handler contract review pending |
| GET `/api/customer/travelers` | `passengers / passport-processing` | Not Started — handler contract review pending |
| POST `/api/customer/travelers` | `passengers / passport-processing` | Not Started — handler contract review pending |
| POST `/api/customer/scan-passport` | `passengers / passport-processing` | Not Started — handler contract review pending |
| GET `/api/customer/documents/download/:driveFileId` | `documents` | Not Started — handler contract review pending |
| POST `/api/customer/travelers/:id/upload-photo` | `passengers / passport-processing` | Not Started — handler contract review pending |
| POST `/api/customer/travelers/:id/documents/upload` | `passengers / passport-processing` | Not Started — handler contract review pending |
| POST `/api/travelers/:id/reassociate-documents` | `passengers / passport-processing` | Not Started — handler contract review pending |
| GET `/api/customer/chats/:leadId` | `communications` | Not Started — handler contract review pending |
| POST `/api/customer/chats` | `communications` | Not Started — handler contract review pending |
| PUT `/api/customer/chats/:id` | `communications` | Not Started — handler contract review pending |
| POST `/api/customer/visa/orders` | `visa-orders / visas / documents / payments` | Not Started — handler contract review pending |
| GET `/api/customer/visa/orders` | `visa-orders / visas / documents / payments` | Not Started — handler contract review pending |
| GET `/api/customer/visa/orders/:orderId` | `visa-orders / visas / documents / payments` | Not Started — handler contract review pending |
| PATCH `/api/customer/visa/orders/:orderId/travel-details` | `visa-orders / visas / documents / payments` | Not Started — handler contract review pending |
| PATCH `/api/customer/visa/orders/:orderId/transportation-choice` | `visa-orders / visas / documents / payments` | Not Started — handler contract review pending |
| PATCH `/api/admin/visa/orders/:orderId/transportation-choice` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| POST `/api/admin/visa/orders/:orderId/umrah-requirements/:serviceKey/status` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| POST `/api/customer/visa/orders/:orderId/applicants` | `visa-orders / visas / documents / payments` | Not Started — handler contract review pending |
| PATCH `/api/customer/visa/orders/:orderId/applicants/:applicantId` | `visa-orders / visas / documents / payments` | Not Started — handler contract review pending |
| DELETE `/api/customer/visa/orders/:orderId/applicants/:applicantId` | `visa-orders / visas / documents / payments` | Not Started — handler contract review pending |
| POST `/api/customer/visa/orders/:orderId/complete-applicants` | `visa-orders / visas / documents / payments` | Not Started — handler contract review pending |
| POST `/api/customer/visa/orders/:orderId/reopen-draft` | `visa-orders / visas / documents / payments` | Not Started — handler contract review pending |
| POST `/api/customer/visa/orders/:orderId/cancel` | `visa-orders / visas / documents / payments` | Not Started — handler contract review pending |
| POST `/api/customer/visa/orders/:orderId/submit-documents` | `visa-orders / visas / documents / payments` | Not Started — handler contract review pending |
| DELETE `/api/customer/visa/orders/:orderId` | `visa-orders / visas / documents / payments` | Not Started — handler contract review pending |
| GET `/api/admin/visa/orders` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| GET `/api/admin/visa/orders/:orderId` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| POST `/api/admin/visa/orders/:orderId/reject` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| PATCH `/api/admin/visa/orders/:orderId/reject` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| DELETE `/api/admin/visa/orders/:orderId` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| POST `/api/customer/visa/orders/:orderId/applicants/:applicantId/documents/passport` | `visa-orders / visas / documents / payments` | Not Started — handler contract review pending |
| POST `/api/customer/visa/orders/:orderId/applicants/:applicantId/documents/photo` | `visa-orders / visas / documents / payments` | Not Started — handler contract review pending |
| POST `/api/customer/visa/orders/:orderId/applicants/:applicantId/documents/upload` | `visa-orders / visas / documents / payments` | Not Started — handler contract review pending |
| GET `/api/customer/visa/orders/:orderId/applicants/:applicantId/documents` | `visa-orders / visas / documents / payments` | Not Started — handler contract review pending |
| GET `/api/customer/visa/orders/:orderId/applicants/:applicantId/documents/:documentId/view` | `visa-orders / visas / documents / payments` | Not Started — handler contract review pending |
| POST `/api/customer/visa/orders/:orderId/applicants/:applicantId/documents/:documentId/confirm` | `visa-orders / visas / documents / payments` | Not Started — handler contract review pending |
| POST `/api/customer/visa/orders/:orderId/applicants/:applicantId/documents/:documentId/correct-applicant` | `visa-orders / visas / documents / payments` | Not Started — handler contract review pending |
| GET `/api/admin/visa/orders/:orderId/documents` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| GET `/api/admin/visa/orders/:orderId/applicants/:applicantId/documents/:documentId/view` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| POST `/api/admin/visa/orders/:orderId/applicants/:applicantId/documents/:documentId/verify` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| POST `/api/admin/visa/orders/:orderId/applicants/:applicantId/documents/:documentId/request-reupload` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| POST `/api/admin/visa/orders/:orderId/applicants/:applicantId/documents/:documentId/reject` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| POST `/api/admin/visa/orders/:orderId/accept-documents` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| GET `/api/customer/visa/orders/:orderId/payment-instructions` | `visa-orders / visas / documents / payments` | Not Started — handler contract review pending |
| GET `/api/customer/visa/orders/:orderId/payment-instructions/qr/:accountId` | `visa-orders / visas / documents / payments` | Not Started — handler contract review pending |
| GET `/api/customer/visa/orders/:orderId/payment` | `visa-orders / visas / documents / payments` | Not Started — handler contract review pending |
| POST `/api/customer/visa/orders/:orderId/payment` | `visa-orders / visas / documents / payments` | Not Started — handler contract review pending |
| POST `/api/customer/visa/orders/:orderId/payment/resubmit` | `visa-orders / visas / documents / payments` | Not Started — handler contract review pending |
| GET `/api/customer/visa/orders/:orderId/payment/proof` | `visa-orders / visas / documents / payments` | Not Started — handler contract review pending |
| GET `/api/customer/visa/orders/:orderId/receipt` | `visa-orders / visas / documents / payments` | Not Started — handler contract review pending |
| GET `/api/admin/payment-accounts` | `payments` | Not Started — handler contract review pending |
| POST `/api/admin/payment-accounts` | `payments` | Not Started — handler contract review pending |
| PATCH `/api/admin/payment-accounts/:id` | `payments` | Not Started — handler contract review pending |
| DELETE `/api/admin/payment-accounts/:id` | `payments` | Not Started — handler contract review pending |
| GET `/api/admin/payment-accounts/:id/qr` | `payments` | Not Started — handler contract review pending |
| GET `/api/admin/visa/orders/:orderId/payment` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| GET `/api/admin/visa/orders/:orderId/payment/proof` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| POST `/api/admin/visa/orders/:orderId/payment/verify` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| POST `/api/admin/visa/orders/:orderId/payment/reject` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| GET `/api/admin/visa/processing` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| GET `/api/admin/visa/orders/:orderId/processing` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| POST `/api/admin/visa/orders/:orderId/accept-processing` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| POST `/api/admin/visa/orders/:orderId/assign` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| POST `/api/admin/visa/orders/:orderId/applicants/:applicantId/status` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| POST `/api/admin/visa/orders/:orderId/applicants/:applicantId/request-info` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| POST `/api/admin/visa/orders/:orderId/applicants/:applicantId/information-request/:requestId/resolve` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| POST `/api/admin/visa/orders/:orderId/applicants/:applicantId/issued-visa` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| GET `/api/admin/visa/orders/:orderId/applicants/:applicantId/issued-visa` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| POST `/api/admin/visa/orders/:orderId/applicants/:applicantId/issued-visa/revoke` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| GET `/api/customer/visa/orders/:orderId/processing` | `visa-orders / visas / documents / payments` | Not Started — handler contract review pending |
| POST `/api/customer/visa/orders/:orderId/applicants/:applicantId/information-request/:requestId/respond` | `visa-orders / visas / documents / payments` | Not Started — handler contract review pending |
| GET `/api/customer/visa/orders/:orderId/applicants/:applicantId/issued-visa` | `visa-orders / visas / documents / payments` | Not Started — handler contract review pending |
| GET `/api/admin/visa/suppliers` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| GET `/api/admin/visa/suppliers/:id` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| POST `/api/admin/visa/suppliers` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| PATCH `/api/admin/visa/suppliers/:id` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| GET `/api/admin/visa/orders/:orderId/commercial` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| POST `/api/admin/visa/orders/:orderId/applicants/:applicantId/supplier` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| POST `/api/admin/visa/orders/:orderId/applicants/:applicantId/cost` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| POST `/api/admin/visa/orders/:orderId/applicants/:applicantId/generate-payable` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| GET `/api/admin/visa/payables` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| GET `/api/admin/visa/payables/:id/payments` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| POST `/api/admin/visa/payables/:id/payments` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| GET `/api/admin/visa/payables/:id/payments/:paymentId/proof` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| POST `/api/admin/visa/payables/:id/cancel` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| GET `/api/admin/visa/reports/suppliers` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| GET `/api/admin/visa/reports/margins` | `visas / visa-orders / suppliers / payments / reports` | Not Started — handler contract review pending |
| GET `/api/admin/suppliers` | `suppliers` | Not Started — handler contract review pending |
| GET `/api/admin/suppliers/:id` | `suppliers` | Not Started — handler contract review pending |
| POST `/api/admin/suppliers` | `suppliers` | Not Started — handler contract review pending |
| PATCH `/api/admin/suppliers/:id` | `suppliers` | Not Started — handler contract review pending |
| DELETE `/api/admin/suppliers/:id` | `suppliers` | Not Started — handler contract review pending |
| POST `/api/admin/suppliers/:id/opening-balance` | `suppliers` | Not Started — handler contract review pending |
| GET `/api/admin/supplier-purchases` | `suppliers` | Not Started — handler contract review pending |
| POST `/api/admin/supplier-purchases` | `suppliers` | Not Started — handler contract review pending |
| POST `/api/admin/supplier-purchases/:id/cancel` | `suppliers` | Not Started — handler contract review pending |
| GET `/api/admin/supplier-payments` | `review handler; map to owning module` | Not Started — handler contract review pending |
| POST `/api/admin/supplier-payments` | `review handler; map to owning module` | Not Started — handler contract review pending |
| GET `/api/admin/suppliers/payments/:paymentId/proof` | `suppliers` | Not Started — handler contract review pending |
| GET `/api/admin/suppliers/:id/statement` | `suppliers` | Not Started — handler contract review pending |
| POST `/api/admin/suppliers/:id/adjustments` | `suppliers` | Not Started — handler contract review pending |
| POST `/api/admin/suppliers/:id/recalculate-balance` | `suppliers` | Not Started — handler contract review pending |
| POST `/api/admin/suppliers/migrate` | `suppliers` | Not Started — handler contract review pending |
| GET `/api/admin/suppliers/migration-verification` | `suppliers` | Not Started — handler contract review pending |
| POST `/api/admin/expenses/with-supplier` | `expenses / suppliers` | Not Started — handler contract review pending |
| GET `/api/customer/notifications` | `customers / auth / notifications` | Not Started — handler contract review pending |
| POST `/api/customer/notifications/:id/read` | `customers / auth / notifications` | Not Started — handler contract review pending |
| POST `/api/customer/notifications/read-all` | `customers / auth / notifications` | Not Started — handler contract review pending |
| GET `/api/admin/notifications` | `notifications` | Not Started — handler contract review pending |
| POST `/api/admin/notifications/:id/read` | `notifications` | Not Started — handler contract review pending |
| POST `/api/admin/notifications/read-all` | `notifications` | Not Started — handler contract review pending |
| POST `/api/admin/notifications/:id/retry` | `notifications` | Not Started — handler contract review pending |
| POST `/api/admin/notifications/run-reminders` | `notifications` | Not Started — handler contract review pending |
| GET `/api/admin/notification-settings` | `review handler; map to owning module` | Not Started — handler contract review pending |
| PATCH `/api/admin/notification-settings` | `review handler; map to owning module` | Not Started — handler contract review pending |

Route declarations inventoried: 260. No endpoint has been implemented or parity-verified.

## Cross-cutting handler concerns

- Firebase Admin bypasses Firestore client rules, so each handler authorization check must be carried into Nest guards/policies.
- Staff access has admin/agent/accounts distinctions and some lead ownership/permission constraints.
- Customer OTP/session verification and document ownership are separate from staff auth.
- Payment deletion is request/approval controlled; payment proof and receipt operations have workflow states.
- Visa documents/payment/processing endpoints encode multi-step state transitions and idempotency-sensitive effects.
- Provider calls (WhatsApp, Google APIs, ImageKit) must be replaced by test doubles in automated tests.
- Some frontend operations use direct Firestore subscriptions rather than REST routes; they also need mapping and must not be omitted from parity.
