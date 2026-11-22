export type DashboardDataStatus = 'loading' | 'ready' | 'empty' | 'unavailable' | 'error';
export type DashboardPeriod = 'today' | 'last7Days' | 'last30Days' | 'custom';

export interface DashboardMetric {
  readonly id: 'totalLeads' | 'newLeads' | 'activeCustomers' | 'openOpportunities' | 'pendingFollowUps' | 'overdueTasks';
  readonly label: string;
  readonly value: number | null;
  readonly status: DashboardDataStatus;
  readonly context: string;
}

export interface DashboardSummaryContract {
  readonly period: { readonly from: string; readonly to: string; readonly timezone: string };
  readonly metrics: readonly DashboardMetric[];
}

export interface DashboardActivityContract {
  readonly id: string;
  readonly type: 'lead_created' | 'lead_assigned' | 'status_changed' | 'follow_up_completed' | 'customer_added' | 'inquiry_received';
  readonly occurredAt: string;
  readonly organizationId: string;
  readonly actorDisplayName: string;
  readonly subjectLabel: string;
}

export interface DashboardChartPoint {
  readonly label: string;
  readonly value: number;
}
