# Stage 4.3 — API Contracts

All routes use the existing `StaffAuthGuard` and permission guard. Organization scope is resolved from the verified server-side identity context; request bodies cannot choose the tenant. IDs are UUID-validated. Sales access is additionally limited to customers they own or created; other roles still require explicit customer permissions.

| Route | Permission | Behavior |
|---|---|---|
| `GET /api/customers` | `customers.read` | Search/filter/sort/cursor-paginated active or archived directory |
| `GET /api/customers/summary` | `customers.read` | Organization-scoped totals |
| `POST /api/customers` | `customers.create` | Create individual/business CRM profile; no identity account |
| `GET /api/customers/:id` | `customers.read` | Profile with contacts, activity, owner, and linked Leads |
| `PATCH /api/customers/:id` | `customers.update` | Update profile and active/inactive status |
| `POST /api/customers/:id/archive` | `customers.archive` | Soft archive and activity event |
| `POST /api/customers/:id/restore` | `customers.restore` | Restore archived profile and activity event |
| `GET /api/customers/:id/contacts` | `contacts.read` | Customer contacts |
| `POST /api/customers/:id/contacts` | `contacts.create` | Add contact; optional primary contact |
| `PATCH /api/customers/:id/contacts/:contactId` | `contacts.update` | Edit contact |
| `GET /api/customers/contacts` | `contacts.read` | Organization/owner-scoped, paginated Contacts directory |
| `GET /api/customers/:id/activities` | `customers.read` | Recent activity timeline |
| `GET /api/customers/:id/leads` | `customers.read` | Organization-scoped linked Lead history |
| `POST /api/customers/duplicates` | `customers.read` | Return authorized matches for supplied contact/business signals |
| `GET /api/customers/lead-conversion/:leadId` | `customers.convert` | Eligibility and scoped duplicate preview |
| `POST /api/customers/convert-lead/:leadId` | `customers.convert` | Transactional `CREATE` or `LINK` conversion |

The list query validates `state`, `take`, `cursor`, `search`, `type`, `status`, `sort`, and `order`. No database credentials, Firebase tokens, or unrelated organization records are returned.
