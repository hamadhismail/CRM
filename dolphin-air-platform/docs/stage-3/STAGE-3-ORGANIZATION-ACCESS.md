# Stage 3 Organization Access

The current policy carries organization IDs on staff principals and has helpers to check organization access and target-user management scope. The `OrganizationScopeService` denies access when scope cannot be verified. These source-level safeguards are **not runtime verified**.

Organization/branch/agency entities and active/inactive membership management are **Not implemented**. Cross-agency private data isolation and customer record isolation are **Not verified**. The current design reads Firestore identity records; the requested PostgreSQL/Prisma identity model has not been created. No booking, pricing, or commission work is included.
