# Stage 4.1 Dashboard Overview

## Scope delivered

- Added a protected CRM application shell with grouped navigation, active routes, desktop collapse preference, mobile drawer, account menu and the existing Firebase logout action.
- Added a dashboard workspace with six KPI cards, five analytics panels, recent lead/follow-up/task/activity panels, date-range controls and permission-aware quick-action availability.
- Added explicit coming-soon states for unfinished routes. No lead, customer, pipeline, task or analytics API existed at this integration point, so the dashboard makes no data requests and displays unavailable states instead of fabricated values.
- Preserved the existing sign-in, identity provider, session warning and staff-management route behavior.

## Authorization and data handling

The dashboard remains behind the existing staff route and `profile.read` check. Navigation items are filtered using permissions delivered by the authenticated API profile. Staff management retains its `identity.users.read` route guard. Dashboard summaries, tenant filters and staff performance are not implemented because authorized business data sources are not available. No backend endpoint was added.

Organization context displays the count of organization IDs in the authenticated user profile. This is informational only and does not select or authorize a tenant; backend membership checks remain authoritative.

## Acceptance state

The shell/dashboard UI foundation is implemented. Full dashboard data integration and Stage 4.1 production acceptance remain pending Stage 3 runtime authentication acceptance and Stage 4 domain APIs.
