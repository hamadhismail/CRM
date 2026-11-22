import {
  Activity as ActivityIcon, ArrowDownRight, ArrowRight, ArrowUpRight, CalendarDays, CheckCircle2, CircleAlert,
  Clock3, Handshake, Inbox, ListTodo, MessageSquareText, Plus, UserRoundPlus, Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../app/providers/AuthProvider';
import type { DashboardMetric, DashboardPeriod } from '../types/dashboard';
import '../components/workspace.css';

const METRIC_DEFINITIONS: readonly Pick<DashboardMetric, 'id' | 'label'>[] = [
  { id: 'totalLeads', label: 'Total leads' },
  { id: 'newLeads', label: 'New leads' },
  { id: 'activeCustomers', label: 'Active customers' },
  { id: 'openOpportunities', label: 'Open opportunities' },
  { id: 'pendingFollowUps', label: 'Pending follow-ups' },
  { id: 'overdueTasks', label: 'Overdue tasks' },
];

const METRIC_ICONS = [Users, UserRoundPlus, Handshake, ArrowDownRight, Clock3, CircleAlert] as const;
const PERIOD_LABELS: Record<DashboardPeriod, string> = {
  today: 'Today', last7Days: 'Last 7 days', last30Days: 'Last 30 days', custom: 'Custom range',
};

export function DashboardPage() {
  const { user, apiFetch } = useAuth();
  const [customerMetric, setCustomerMetric] = useState<{ value: number | null; status: DashboardMetric['status']; context: string }>({ value: null, status: 'unavailable', context: 'Authorized data source not connected' });
  const [period, setPeriod] = useState<DashboardPeriod>('last7Days');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  useEffect(() => {
    if (!user?.permissions.includes('customers.read')) return;
    let current = true;
    void apiFetch('/api/customers/summary').then(async (response) => {
      if (!response.ok) throw new Error('Customer summary unavailable');
      return response.json() as Promise<{ active: number }>;
    }).then((summary) => { if (current) setCustomerMetric({ value: summary.active, status: summary.active ? 'ready' : 'empty', context: 'Active customers in this organization' }); })
      .catch(() => { if (current) setCustomerMetric({ value: null, status: 'unavailable', context: 'Authorized customer metrics unavailable' }); });
    return () => { current = false; };
  }, [apiFetch, user]);
  const metrics = useMemo<DashboardMetric[]>(() => METRIC_DEFINITIONS.map((metric) => metric.id === 'activeCustomers'
    ? { ...metric, ...customerMetric }
    : { ...metric, value: null, status: 'unavailable' as const, context: 'Authorized data source not connected' }), [customerMetric]);
  const sectionTitle = user?.role === 'sales' ? 'Your sales workspace'
    : user?.role === 'operations' ? 'Your operations workspace'
      : user?.role === 'finance_accounts' ? 'Your finance workspace'
        : 'Business overview';

  return (
    <div className="dashboard-page">
      <section className="dashboard-intro" aria-labelledby="dashboard-heading">
        <div>
          <p className="dashboard-eyebrow">{sectionTitle}</p>
          <h2 id="dashboard-heading">Good day, {user?.displayName?.split(' ')[0] ?? 'there'}</h2>
          <p className="dashboard-intro__description">Your daily overview will appear here when authorized CRM data is connected.</p>
        </div>
        <div className="dashboard-intro__filters">
          <CalendarDays size={17} aria-hidden="true" />
          <label className="sr-only" htmlFor="dashboard-period">Dashboard date range</label>
          <select id="dashboard-period" value={period} onChange={(event) => setPeriod(event.target.value as DashboardPeriod)}>
            <option value="today">Today</option>
            <option value="last7Days">Last 7 days</option>
            <option value="last30Days">Last 30 days</option>
            <option value="custom">Custom range</option>
          </select>
        </div>
      </section>

      {period === 'custom' && <div className="dashboard-custom-range" aria-label="Custom date range">
        <label>From <input type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} /></label>
        <span aria-hidden="true">to</span>
        <label>To <input type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} /></label>
        <span className="dashboard-custom-range__note">Date filters are ready; dashboard data API is not connected.</span>
      </div>}

      <section className="dashboard-metrics" aria-label={`${PERIOD_LABELS[period]} performance metrics`}>
        {metrics.map((metric, index) => {
          const Icon = METRIC_ICONS[index];
          return <article className="dashboard-metric" key={metric.id} aria-label={`${metric.label}: unavailable`}>
            <div className="dashboard-metric__top"><span>{metric.label}</span><span className="dashboard-metric__icon"><Icon size={18} strokeWidth={1.8} /></span></div>
            <div className="dashboard-metric__value">{metric.value === null ? 'N/A' : metric.value.toLocaleString()}</div>
            <p className="dashboard-metric__context">{metric.context}</p>
          </article>;
        })}
      </section>

      <section className="dashboard-chart-grid" aria-label="Dashboard analytics">
        <ChartPanel title="Lead status distribution" subtitle="Current lead stages" />
        <ChartPanel title="Leads by source" subtitle="Where inquiries begin" />
        <ChartPanel title="Monthly lead trends" subtitle="Lead volume over time" wide />
        <ChartPanel title="Sales pipeline overview" subtitle="Opportunities by stage" />
        <ChartPanel title="Lead conversion trends" subtitle="Conversion over time" />
      </section>

      <section className="dashboard-workspace-grid" aria-label="Daily work and recent activity">
        <DataPanel title="Recent leads" icon={Users} actionLabel={user?.permissions.includes('leads.read') ? 'View leads' : undefined} actionTo={user?.permissions.includes('leads.read') ? '/leads' : undefined} emptyText="Lead records will appear after the authorized leads API is connected." />
        <DataPanel title="Upcoming follow-ups" icon={Clock3} emptyText="Follow-up data is not available yet." />
        <DataPanel title="Overdue tasks" icon={ListTodo} emptyText="Task data is not available yet." />
        <DataPanel title="Recent activity" icon={ActivityIcon} wide emptyText="Activity history is not available yet." />
      </section>

      <section className="dashboard-quick-actions" aria-labelledby="quick-actions-heading">
        <div className="dashboard-section-heading"><div><p className="dashboard-eyebrow">Workspace</p><h3 id="quick-actions-heading">Quick actions</h3></div><span>Actions become available with their CRM modules</span></div>
        <div className="dashboard-action-list">
          <QuickAction label="Add lead" icon={Plus} available={Boolean(user?.permissions.includes('leads.create'))} />
          <QuickAction label="Add customer" icon={UserRoundPlus} available={Boolean(user?.permissions.includes('customers.create'))} to={user?.permissions.includes('customers.create') ? '/customers' : undefined} />
          <QuickAction label="Create inquiry" icon={Inbox} available={Boolean(user?.permissions.includes('inquiries.create'))} />
          <QuickAction label="Schedule follow-up" icon={CalendarDays} available={false} />
          <QuickAction label="Create task" icon={CheckCircle2} available={false} />
        </div>
      </section>
    </div>
  );
}

function ChartPanel({ title, subtitle, wide = false }: { title: string; subtitle: string; wide?: boolean }) {
  return <article className={`dashboard-panel dashboard-chart-panel${wide ? ' dashboard-panel--wide' : ''}`}>
    <div className="dashboard-panel__heading"><div><h3>{title}</h3><p>{subtitle}</p></div><span className="dashboard-panel__more" aria-hidden="true">...</span></div>
    <div className="dashboard-chart-empty" role="status"><span className="dashboard-chart-empty__mark"><ArrowUpRight size={19} /></span><strong>Analytics not connected</strong><span>Analytics available when lead data is connected.</span></div>
  </article>;
}

function DataPanel({ title, icon: Icon, emptyText, actionLabel, actionTo, wide = false }: {
  title: string; icon: LucideIcon; emptyText: string; actionLabel?: string; actionTo?: string; wide?: boolean;
}) {
  return <article className={`dashboard-panel dashboard-data-panel${wide ? ' dashboard-panel--wide' : ''}`}>
    <div className="dashboard-panel__heading"><div className="dashboard-panel__title-with-icon"><span><Icon size={17} /></span><h3>{title}</h3></div>
      {actionLabel && actionTo && <Link className="dashboard-panel__link" to={actionTo}>{actionLabel}<ArrowRight size={14} /></Link>}
    </div>
    <div className="dashboard-data-empty" role="status"><span className="dashboard-data-empty__icon"><MessageSquareText size={18} /></span><p>{emptyText}</p></div>
  </article>;
}

function QuickAction({ label, icon: Icon, available, to }: { label: string; icon: LucideIcon; available: boolean; to?: string }) {
  const content = <><span><Icon size={18} /></span><strong>{label}</strong><small>{available ? to ? 'Open customer directory' : 'Coming soon' : 'Unavailable'}</small></>;
  return to ? <Link className="dashboard-quick-action" to={to}>{content}</Link> : <button className="dashboard-quick-action" type="button" disabled title={available ? `${label} is not available until its module is implemented` : `${label} is unavailable for your permissions or its module is not implemented`}>
    {content}
  </button>;
}

