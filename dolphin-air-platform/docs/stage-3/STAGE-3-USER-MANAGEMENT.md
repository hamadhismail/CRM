# Stage 3 User Management

## Implemented in source, not runtime verified

`GET /api/users` lists scoped staff accounts. `PATCH /api/users/:uid/role` updates a role, and `PATCH /api/users/:uid/status` activates/deactivates. The service validates identifiers, checks delegated role authority and organization scope, prevents self-role changes/self-deactivation, and protects the last active Super Admin with a Firestore transaction. The CRM has a staff list with role and status controls.

## Incomplete

Staff invitation/delivery boundary, duplicate invite handling, user profile edit/details, organization membership management, access revocation workflow, administrative audit history, and full staff UI are **Not implemented**. No passwords are emailed or seeded. Account deletion remains disabled.
