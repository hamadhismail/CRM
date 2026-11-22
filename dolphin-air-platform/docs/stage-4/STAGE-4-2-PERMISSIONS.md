# Stage 4.2 permissions

The existing registry has `leads.read`, `leads.create` and `leads.update`; the approved Sales role owns these permissions. `leads.delete` and `leads.assign` do not exist. No role or permission was changed automatically. Archive, restore and assignment require an approved additive role matrix and backend enforcement. B2B agency lead ownership has no approved policy and remains unavailable.

## Stage 4.2.13 permission/tenant rules (2026-11-22)

No permissions were added or granted automatically. Assignment and eligible-staff listing use the existing `leads.update`; assignment history and duplicate lookup use `leads.read`. The API derives organization scope from the verified request principal, validates active organization/membership and eligible internal role data, and never accepts a client organization ID as authority. Duplicate results are further limited to records readable by the actor. Browser and API integration tests denied restricted-role assignment, cross-organization assignment, invalid membership/role targets, and foreign-record disclosure. Default database identity auth remains disabled; E2E enables it only in a dedicated local child API process.
