# Authentication Database Mapping

| Source record | Verified fields / relation | Stage 3 treatment |
|---|---|---|
| Firestore `users/{normalized-email}` | Staff profile, role, active, optional permission arrays and legacy password value. | Remains source of truth; read by API emulator integration. No copy or write of credentials. |
| Firebase Auth user | Identity used for Firebase custom token / Google sign-in. | Verified by Firebase Admin; no user recreation. |
| `customer_sessions/{sha256(token)}` | Hashed opaque session token, phone/customer references, expiry and revocation. | Customer guard lookup only; logout revokes/deletes. No session issuance implemented. |
| Customer/traveler/visa order records | Phone-associated customer identity; structures vary by workflow. | Not migrated. Exact record ownership needs feature-specific model mapping. |
| Organization membership | No verified membership collection found. | No schema/table created; organization scope denies. |

No Prisma models or migrations are added. This avoids duplicating Firebase identity and does not imply relational modeling is approved. Production data, IDs, and provider configuration remain untouched. Any future relational mirror needs a non-destructive ID mapping, migration rehearsal with sanitized fixtures, and explicit source-of-truth decision.
