# Stage 4.2 frontend

The Stage 4.1 shell now routes permitted staff to `/leads`. `LeadsPage` requests the guarded lead list and provides a validated minimal create form for name, country code, phone, email, source and service. It renders loading, verified empty, error and 503 unavailable states; only a successful POST closes the form and refreshes the list. The API request carries the organization header only when the authenticated profile has exactly one organization. No lead records are stored in browser persistence and no sample records are displayed. Search, edit, details, assignment, notes and status controls remain unimplemented.

## Stage 4.2.13 CRM integration (2026-11-22)

The existing Lead details UI now loads eligible staff and assignment history from guarded APIs, supports assignment/reassignment with server refresh and feedback, and shows the current assignee. Create/edit preflight performs the guarded duplicate check; matching records appear in a warning and the user must explicitly choose to continue a repeat inquiry. A conversion-preparation state explains that actual conversion is unavailable and does not create a customer or opportunity. UI behavior is covered by component tests and the actual Edge E2E workflow; see the test report.
