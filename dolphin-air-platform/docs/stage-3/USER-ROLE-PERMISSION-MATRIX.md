# User, Role and Permission Matrix

| Principal / role | Verified source behavior | New policy |
|---|---|---|
| `admin` staff | Broad access in source helpers; admin-only user-management updates; primary admin protections. | Broad permission predicate; management endpoints admin-only; self-role/status changes blocked; organization-scoped operations still fail closed without membership. |
| `agent` staff | User-specific `permissions`, `visaPermissions`, and `supplierPermissions`; notification helper also checks `notificationPermissions`. | Only exact values loaded from staff record grant access. No browser role claims trusted. |
| `accounts` staff | Fixed visa capabilities: `visa.processing.view`, `visa.suppliers.view/manage`, `visa.costs.view/manage/override`, `visa.payables.view/manage/record/cancel`, `visa.margin.view`; supplier and notification capabilities are source-defined. | Those exact capabilities are retained; other operations require explicit per-user permission. |
| customer | Authenticated phone/session identity and customer record association. | Customer guard plus exact customer ID or canonical phone ownership check. |
| agency user | No distinct verified role or membership model in legacy source. | No agency access granted until membership data and policy are established. |

Legacy supplier account capabilities are enumerated in `authentication.policy.ts` and should be revalidated against the whole source before broad module adoption. Permission key names elsewhere remain per-user values and are not invented here. `admin` permission predicate is broad for parity, but sensitive write endpoints must add dedicated business restrictions.

The source notification helper has a special `role === 'visa'` read-only notification branch, although the declared user role union and staff login allowlist contain only `admin`, `agent`, and `accounts`. The new staff principal intentionally rejects `visa` until source data proves it is a real staff role; this branch needs fixture review before notification feature migration.

## Management safeguards

Only administrators can list staff and change role, active state, or username. Self role change and self disable are blocked. Primary admin protection is retained. Create/invite, password reset, and deletion are intentionally blocked; legacy creation persists credentials in Firestore and delete also removes Firebase Auth identity.
