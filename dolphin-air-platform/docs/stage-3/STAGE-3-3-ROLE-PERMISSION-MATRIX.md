# Stage 3.3 Role and Permission Matrix

The following is the proposed Stage 3.3 role vocabulary. The existing in-code keys are not silently renamed here; normalization is pending a code change, contract review, and tests.

| Proposed role | Current platform key | Initial intended scope | Stage 3.3 status |
|---|---|---|---|
| `SUPER_ADMIN` | `super_admin` | Explicitly granted platform administration, still subject to record and organization policy | Existing catalogue; tests not run |
| `ADMIN` | `admin` | Authorized internal identity administration within assigned scope | Existing catalogue; tests not run |
| `STAFF` | `staff` | Minimal internal access; permissions individually granted | Existing catalogue; tests not run |
| `SALES` | `sales` | Sales-oriented permissions only | Existing catalogue; tests not run |
| `OPERATIONS` | `operations` | Operations-oriented permissions only | Existing catalogue; tests not run |
| `ACCOUNTS` | `finance_accounts` | Finance identity role; business feature access remains unimplemented | Naming alignment pending |
| `VISA_OFFICER` | `visa_processing` | Visa identity role; business feature access remains unimplemented | Naming alignment pending |
| `B2B_AGENT` | `b2b_agent` | Agency-scoped agent identity; no cross-agency access | Existing catalogue; membership lifecycle pending |
| `CUSTOMER` | `customer` | Own account/profile only; no staff API access | Customer sign-in disabled |

Permission keys are owned by the centralized API registry. Proposed identity actions include `users.read`, `users.invite`, `users.update`, `users.deactivate`, `roles.read`, and `roles.manage`. Proposed future business keys may be registered later but do not grant access to nonexistent business endpoints.

Authorization must default deny, use server-resolved role/permission data, require active memberships for scoped resources, and keep customer, agency, and internal staff principals distinct. Super Admin does not bypass organization or record ownership checks by default.

No role or permission matrix is Stage 3.3 verified until automated guard and cross-scope tests run successfully.
