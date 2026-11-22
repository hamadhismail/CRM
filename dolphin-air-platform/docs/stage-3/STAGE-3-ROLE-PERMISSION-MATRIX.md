# Stage 3 Role and Permission Matrix

The current source has a centrally declared static role/permission policy in `apps/api/src/modules/auth/authentication.policy.ts`, server-side role and permission guards, and API endpoints for reading role and permission catalogs. The catalog and policy tests exist but have not been executed in this environment.

Current role keys include `super_admin`, `admin`, `staff`, `sales`, `operations`, `finance_accounts`, `visa_processing`, `b2b_agent`, and `customer`. These differ in naming from the requested `ACCOUNTS` and `VISA_OFFICER` labels. Permission values include identity permissions and selected future business permission keys; unrelated business modules were not implemented.

Persisted role/permission administration and a permission matrix UI are **Not implemented**. No runtime access claims are made. See `USER-ROLE-PERMISSION-MATRIX.md` and `STAGE-3-3-ROLE-PERMISSION-MATRIX.md` for historical detail.
