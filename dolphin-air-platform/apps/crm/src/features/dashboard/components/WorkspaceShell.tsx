import { useEffect, useState } from 'react';
import {
  ArrowDownUp, BarChart3, Bell, BriefcaseBusiness, ChevronDown,
  ChevronLeft, ChevronRight, CircleDollarSign, ClipboardCheck, ContactRound, FileText,
  LayoutDashboard, LifeBuoy, LogOut, Menu, MessageSquareText, Package, Plane, Search,
  Settings2, ShieldCheck, UserRound, Users, WalletCards, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../../app/providers/AuthProvider';
import './workspace.css';

interface WorkspaceItem {
  readonly label: string;
  readonly to?: string;
  readonly permission?: string;
  readonly icon: LucideIcon;
  readonly comingSoon?: boolean;
}

interface WorkspaceGroup {
  readonly label: string;
  readonly items: readonly WorkspaceItem[];
}

const GROUPS: readonly WorkspaceGroup[] = [
  { label: 'Main', items: [
    { label: 'Dashboard', to: '/', permission: 'profile.read', icon: LayoutDashboard },
    { label: 'Leads', to: '/leads', permission: 'leads.read', icon: Users },
    { label: 'Contacts', to: '/contacts', permission: 'contacts.read', icon: ContactRound },
    { label: 'Customers', to: '/customers', permission: 'customers.read', icon: UserRound },
    { label: 'Inquiries', to: '/coming-soon/inquiries', permission: 'inquiries.read', icon: MessageSquareText },
    { label: 'Sales Pipeline', icon: ArrowDownUp, comingSoon: true },
  ] },
  { label: 'Operations', items: [
    { label: 'Packages', permission: 'packages.read', icon: Package, comingSoon: true },
    { label: 'Departures', permission: 'departures.read', icon: Plane, comingSoon: true },
    { label: 'Bookings', permission: 'bookings.read', icon: BriefcaseBusiness, comingSoon: true },
    { label: 'Passengers', permission: 'passengers.read', icon: Users, comingSoon: true },
    { label: 'Visa Management', permission: 'visas.read', icon: FileText, comingSoon: true },
  ] },
  { label: 'Finance', items: [
    { label: 'Invoices', icon: FileText, comingSoon: true },
    { label: 'Payments', permission: 'finance.payments.read', icon: WalletCards, comingSoon: true },
    { label: 'Suppliers', icon: CircleDollarSign, comingSoon: true },
  ] },
  { label: 'Workspace', items: [
    { label: 'Tasks & Follow-ups', icon: ClipboardCheck, comingSoon: true },
    { label: 'Communications', icon: MessageSquareText, comingSoon: true },
    { label: 'Reports', icon: BarChart3, comingSoon: true },
    { label: 'Staff Management', to: '/staff', permission: 'identity.users.read', icon: ShieldCheck },
    { label: 'Settings', to: '/coming-soon/settings', permission: 'organizations.manage', icon: Settings2, comingSoon: true },
  ] },
];

const COLLAPSED_KEY = 'crm_sidebar_collapsed';

function readCollapsedPreference(): boolean {
  try { return window.localStorage.getItem(COLLAPSED_KEY) === 'true'; } catch { return false; }
}

export function WorkspaceShell() {
  const { user, organizations, activeOrganizationId, selectOrganization, logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(readCollapsedPreference);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pageTitle = location.pathname === '/'
    ? 'Dashboard'
    : location.pathname === '/leads' ? 'Leads'
    : location.pathname.startsWith('/customers') ? 'Customers'
    : location.pathname.startsWith('/contacts') ? 'Contacts'
    : location.pathname === '/staff' ? 'Staff Management'
      : location.pathname.startsWith('/coming-soon/')
        ? toTitle(location.pathname.split('/').at(-1) ?? 'Workspace') : 'Workspace';
  const organizationCount = user?.organizationIds?.length ?? 0;

  useEffect(() => {
    try { window.localStorage.setItem(COLLAPSED_KEY, String(collapsed)); } catch { /* Preference persistence is optional. */ }
  }, [collapsed]);

  return (
    <div className={`workspace-layout${collapsed ? ' workspace-layout--collapsed' : ''}`}>
      {mobileOpen && <button className="workspace-mobile-scrim" type="button" aria-label="Close navigation menu" onClick={() => setMobileOpen(false)} />}
      <aside className={`workspace-sidebar${mobileOpen ? ' workspace-sidebar--mobile-open' : ''}`} aria-label="Main navigation">
        <div className="workspace-sidebar__brand">
          <span className="brand-lockup__mark" aria-hidden="true">D</span>
          {!collapsed && <span className="workspace-sidebar__brand-name">Dolphin Air <small>Services</small></span>}
          <button className="workspace-icon-button workspace-sidebar__mobile-close" type="button" aria-label="Close navigation menu" onClick={() => setMobileOpen(false)}><X size={19} /></button>
        </div>

        <div className="workspace-sidebar__identity">
          <span className="workspace-sidebar__avatar" aria-hidden="true">{initials(user?.displayName)}</span>
          {!collapsed && <span className="workspace-sidebar__person"><strong>{user?.displayName ?? 'Staff member'}</strong><small>{roleLabel(user?.role)}</small></span>}
        </div>

        <nav className="workspace-nav">
          {GROUPS.map((group) => {
            const visibleItems = group.items.filter((item) => !item.permission || user?.permissions.includes(item.permission));
            if (!visibleItems.length) return null;
            return <section className="workspace-nav__group" key={group.label} aria-label={group.label}>
              {!collapsed && <h2>{group.label}</h2>}
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const content = <><Icon size={18} strokeWidth={1.8} /><span className="workspace-nav__label">{item.label}</span>{item.comingSoon && !collapsed && <span className="workspace-nav__soon">Soon</span>}</>;
                if (!item.to) return <button className="workspace-nav__item workspace-nav__item--disabled" type="button" key={item.label} disabled title={`${item.label} is coming soon`} aria-label={`${item.label}, coming soon`}>
                  <Icon size={18} strokeWidth={1.8} /><span className="workspace-nav__label">{item.label}</span>{!collapsed && <span className="workspace-nav__soon">Soon</span>}
                </button>;
                if (item.comingSoon) return <NavLink onClick={() => setMobileOpen(false)} className="workspace-nav__item" to={item.to} key={item.label} title={collapsed ? item.label : undefined}>
                  {content}
                </NavLink>;
                return <NavLink onClick={() => setMobileOpen(false)} end={item.to === '/'} className={({ isActive }) => `workspace-nav__item${isActive ? ' workspace-nav__item--active' : ''}`} to={item.to} key={item.label} title={collapsed ? item.label : undefined}>
                  {content}
                </NavLink>;
              })}
            </section>;
          })}
        </nav>

        <div className="workspace-sidebar__footer">
          {!collapsed && <span><LifeBuoy size={15} /> Secure staff workspace</span>}
          <button className="workspace-collapse-button" type="button" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed}>
            {collapsed ? <ChevronRight size={17} /> : <><ChevronLeft size={17} /><span>Collapse menu</span></>}
          </button>
        </div>
      </aside>

      <div className="workspace-main">
        <header className="workspace-header">
          <div className="workspace-header__left">
            <button className="workspace-icon-button workspace-menu-button" type="button" aria-label="Open navigation menu" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
            <div className="workspace-header__title"><div className="workspace-breadcrumb"><Link to="/">Workspace</Link><ChevronRight size={13} /><span>{pageTitle}</span></div><h1>{pageTitle}</h1></div>
          </div>
          <div className="workspace-header__actions">
            <button className="workspace-search-trigger" type="button" disabled title="Global search will be available when authorized search APIs are implemented" aria-label="Global search unavailable">
              <Search size={17} /><span>Search CRM</span><kbd>Ctrl K</kbd>
            </button>
            {organizations.length > 1 ? <label className="workspace-scope workspace-scope--select" title="Changing organization reloads organization-scoped workspace data">
              <span className="workspace-scope__dot" aria-hidden="true" /><span className="workspace-scope__label">Organization</span>
              <select aria-label="Active organization" value={activeOrganizationId ?? ''} onChange={(event) => void selectOrganization(event.target.value).catch(() => undefined)}>
                {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
              </select>
            </label> : <div className="workspace-scope" title="Organization scope is resolved by the authenticated backend profile">
              <span className="workspace-scope__dot" aria-hidden="true" /><span>{organizationCount === 1 ? organizations[0]?.name ?? '1 organization' : 'No organization'}</span>
            </div>}
            <button className="workspace-icon-button workspace-notifications" type="button" disabled title="Notifications are not connected yet" aria-label="Notifications unavailable"><Bell size={18} /></button>
            <details className="workspace-account">
              <summary aria-label="Open account menu"><span className="workspace-account__avatar">{initials(user?.displayName)}</span><span className="workspace-account__name">{user?.displayName ?? 'Staff'}</span><ChevronDown size={15} /></summary>
              <div className="workspace-account__menu"><div className="workspace-account__details"><strong>{user?.displayName}</strong><span>{user?.email}</span><small>{roleLabel(user?.role)}</small></div><button type="button" onClick={() => void logout()}><LogOut size={16} /> Sign out</button></div>
            </details>
          </div>
        </header>
        <main className="workspace-content"><Outlet /></main>
      </div>
    </div>
  );
}

function initials(name?: string): string {
  if (!name?.trim()) return 'DA';
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
}

function roleLabel(role?: string): string {
  if (!role) return 'Staff';
  return role.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function toTitle(value: string): string {
  return value.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
