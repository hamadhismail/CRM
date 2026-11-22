# Stage 2 Integration Inventory

| Integration | Source evidence | Recommendation | Risk / next discovery |
|---|---|---|---|
| Firebase Auth | `src/firebase.ts`, login and OTP routes, Firestore rules | Adapt or replace only after identity/authorization parity plan | Google sign-in is not sufficient: rules require an active staff record and valid role |
| Firebase Functions/Hosting | `firebase.json` rewrites `/api/**` to function `api`; `functions/index.js` is a bundled Express artifact | Preserve hosting/API boundary until replacement behavior is approved | Bundled artifact has the same 260 explicit route method/path pairs as `server.ts`; deployed version was not inspected |
| Cloud Firestore + Firebase Admin | `src/server/db.ts`, `server.ts`, rules and indexes | Adapt data access; preserve source ids and behavior while target schema is approved | Mixed direct-client and server paths; transaction, cache, isolation and access-control behavior need audit |
| Firebase Storage | `src/firebase.ts`, document upload/download paths, `storage.rules` | Adapt storage references and access checks | Passport, visa, payment-proof and ticket files are sensitive; preserve ownership and revocation behavior |
| Firebase App Check | `src/firebase.ts` | Retain or replace with equivalent abuse protection | Verify enforcement and platform coverage |
| Google Sheets | `src/lib/googleSheets.ts`, package sync helpers, `/api/sheets/*`, token/config logic | Adapt; retain synchronization semantics | Idempotency, conflict policy, token rotation and sync-record history |
| Google Drive | `src/server/googleDrive.ts`, `/api/drive/*`, document migration scripts | Adapt; preserve download/view/backup/reassociation behavior | OAuth scopes, file ownership, links and data residency; never use production credentials in development |
| ImageKit | `src/lib/imageKit.ts`, auth/upload routes, image migration scripts | Adapt or replace only after fallback and URL semantics are mapped | Dual storage, signatures, transformations, migration/rollback behavior |
| Passport scanning | `src/server/passportScanner.ts`, Tesseract.js + MRZ parser; Gemini package dependency/prompt | Adapt behind passport-processing boundary | OCR confidence/validation, privacy, manual correction, model/API credential requirements; verify whether Gemini path is enabled |
| AiSensy / WhatsApp | WhatsApp config/templates/send/sync/bulk/automation routes; `src/server/automationEngine.ts`; type catalog | Retain provider behavior initially or explicitly approve replacement | Templates, variables, quiet hours, duplicate prevention, retries, provider status sync and idempotency |
| WebSockets | `src/server/websocketServer.ts`, client hooks and `ws` dependency | Adapt under communications infrastructure | Auth handshake, event names, reconnect and unread count synchronization |
| PWA/service worker | `vite-plugin-pwa`, manifest and CRM PWA controls | Retain offline/install/update behavior | Cache invalidation and sensitive-data caching policy |
| PDF generation | `jspdf`, `jspdf-autotable`, `customQuotePdf.ts`, receipt/package output | Retain output behavior during migration | Compare pagination, pricing, fonts, logos, terms and attachment/download behavior |
| Excel utilities | Inventory hint only; confirm exact source file/package usage during implementation review | Locate and map before replacement | No dedicated spreadsheet library was established from the initial route/source scan |
| Image/OCR and document processing | `sharp`, `pdfjs-dist`, upload/multipart parsing, visa document processor | Adapt behind storage/document modules | MIME/size validation, malware scanning and private URL handling |
| Google Gemini | `@google/genai`, passport scanner prompt | Treat as conditional integration pending runtime-path confirmation | Do not invoke during migration tests; identify API usage and data retention before any decision |
| Email | No legacy send/delivery subsystem identified in inspected product source | New feature, separate parity; implement later by approval | Provider, templates, consent, retry, delivery status and idempotency decisions remain open |

No integration was initialized, connected, or called in this mapping pass. Legacy secret/config values must not be copied into the new workspace.
