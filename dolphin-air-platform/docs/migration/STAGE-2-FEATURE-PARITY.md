# Stage 2 Feature Parity Checklist

Status definitions: **Not Started**, **In Progress**, **Implemented**, **Tested**, **Verified**, **Blocked**. `Verified` requires behavior comparison with the source and passing tests. No features are verified by this mapping-only pass.

| Area | Status | Verification leads |
|---|---|---|
| Dashboard and notifications | Not Started | KPI query/filter/navigation and notification-state comparison |
| Leads, restore, search, pricing | Not Started | `deletedLeadsWorkflow`, `leadSearch`, `leadPackagePricingRecalc` |
| Sales/trip pipelines | Not Started | `pipelineStatus`, `tripAwarePipeline` |
| Contacts/customers | Not Started | `contactsView`, phone deduplication, identity linkage |
| Follow-ups/tasks/inquiries | Not Started | Calendar, persistence, route behavior tests to identify |
| Custom quotes/revisions/PDF/share/convert | Not Started | `customQuotes*` tests and pricing/snapshot/PDF comparisons |
| Packages/images/calendar/inventory | Not Started | `packageDates`, `imageCatalogPicker`, `dualPackageImageStorage`, package image tests |
| Trips/bookings/travelers/documents/payments | Not Started | `bookings`, `tripPayments`, `tripDetailsGlobalDrawer`, passport/document tests |
| Visa products/orders/docs/payment/processing/commercials/Umrah | Not Started | `visa*` and `umrah*` tests |
| Payments/receipts/delete approvals/follow-ups | Not Started | `receipts`, payment route/status transition and approval tests |
| Expenses/suppliers/accounting/finance reports | Not Started | `expensesFiltering`, `suppliers`, precision/approval/history checks |
| Auth/users/roles/permissions/session timeout | Not Started | `adminAuthSecurity`, `usernameAndEmailAuth`, session behavior |
| Settings/announcements/staff chat/audit/global search | Not Started | Announcement/chat/audit/search behavior tests |
| WhatsApp hub/templates/bulk/sync/automations | Not Started | `whatsapp*`, `bulkWhatsApp`; provider calls mocked in development |
| Public website and package/inquiry/calendar | Not Started | Content, routes, responsive and customer portal tests |
| Customer auth/OTP/bookings/travelers/docs/payments/chat/visas | Not Started | Customer portal, OTP, booking and visa workflow tests |
| B2B agent portal | Not Started | New feature; scope and approval required; no parity claim |
| Firebase/Sheets/Drive/ImageKit/OCR/WebSocket/PWA/PDF/Excel | Not Started | Integration compatibility, permission, offline and security checks |
| New email system | Not Started | New feature; delivery/retry/idempotency tests required |

The ZIP contains 73 test files. They were inventoried but not run. No production services were contacted.
