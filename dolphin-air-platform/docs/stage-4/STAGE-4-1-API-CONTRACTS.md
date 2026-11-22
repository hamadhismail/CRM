# Stage 4.1 API Contracts

## Implemented

No dashboard backend endpoints were added. The current API has no Stage 4 lead, customer, opportunity, follow-up, task or activity tables/services from which to calculate authorized metrics. The existing Firebase authentication and staff identity APIs remain unchanged.

## Typed frontend contracts

`apps/crm/src/features/dashboard/types/dashboard.ts` defines dashboard data status, period, metric, summary, activity and chart-point contracts for future integration. These contracts do not imply a live API.

## Deferred endpoint boundary

Summary, chart, recent lead, activity and follow-up requests are deferred until each endpoint can enforce authenticated identity, organization membership, permissions and record scope. The UI currently performs no requests to unimplemented endpoints.
