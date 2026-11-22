import { InternalRole, PlatformRole, StaffPrincipal } from './interfaces/authenticated-principal';

export const PERMISSION_CATALOG = [
  'profile.read',
  'profile.update',
  'identity.users.read',
  'identity.users.create',
  'identity.users.update',
  'identity.users.disable',
  'identity.users.manage.anywhere',
  'identity.roles.read',
  'identity.roles.assign',
  'identity.permissions.read',
  'organizations.read',
  'organizations.manage',
  'leads.read',
  'leads.create',
  'leads.update',
  'customers.read',
  'customers.create',
  'customers.update',
  'customers.archive',
  'customers.restore',
  'customers.convert',
  'contacts.read',
  'contacts.create',
  'contacts.update',
  'inquiries.read',
  'inquiries.create',
  'quotations.read',
  'quotations.create',
  'quotations.update',
  'packages.read',
  'departures.read',
  'trips.read',
  'trips.update',
  'bookings.read',
  'bookings.create',
  'bookings.update',
  'passengers.read',
  'documents.read',
  'finance.payments.read',
  'finance.payments.record',
  'finance.payments.approve',
  'finance.accounting.read',
  'finance.expenses.read',
  'finance.expenses.update',
  'visas.read',
  'visas.process',
  'visa_orders.read',
  'visa_orders.update',
  'agent.packages.read',
  'agent.bookings.read',
  'agent.bookings.create',
  'agent.payments.read',
] as const;

export type PermissionKey = (typeof PERMISSION_CATALOG)[number];

const ROLE_PERMISSIONS: Readonly<Record<InternalRole, readonly PermissionKey[]>> = Object.freeze({
  super_admin: [
    'profile.read', 'profile.update', 'identity.users.read', 'identity.users.create',
    'identity.users.update', 'identity.users.disable', 'identity.users.manage.anywhere',
    'identity.roles.read', 'identity.roles.assign', 'identity.permissions.read',
    'organizations.read', 'organizations.manage',
    'customers.read', 'customers.create', 'customers.update', 'customers.archive', 'customers.restore', 'customers.convert',
    'contacts.read', 'contacts.create', 'contacts.update',
  ],
  admin: [
    'profile.read', 'profile.update', 'identity.users.read', 'identity.users.create',
    'identity.users.update', 'identity.users.disable', 'identity.roles.read',
    'identity.roles.assign', 'identity.permissions.read', 'organizations.read',
    'customers.read', 'customers.create', 'customers.update', 'customers.archive', 'customers.restore', 'customers.convert',
    'contacts.read', 'contacts.create', 'contacts.update',
  ],
  staff: ['profile.read', 'profile.update'],
  sales: [
    'profile.read', 'profile.update', 'leads.read', 'leads.create', 'leads.update',
    'customers.read', 'customers.create', 'customers.update', 'customers.convert',
    'contacts.read', 'contacts.create', 'contacts.update',
    'inquiries.read', 'inquiries.create', 'quotations.read', 'quotations.create', 'quotations.update',
  ],
  operations: [
    'profile.read', 'profile.update', 'packages.read', 'departures.read', 'trips.read',
    'trips.update', 'bookings.read', 'bookings.update', 'passengers.read', 'documents.read',
  ],
  finance_accounts: [
    'profile.read', 'profile.update', 'finance.payments.read', 'finance.payments.record',
    'finance.payments.approve', 'finance.accounting.read', 'finance.expenses.read', 'finance.expenses.update',
  ],
  visa_processing: [
    'profile.read', 'profile.update', 'visas.read', 'visas.process', 'visa_orders.read',
    'visa_orders.update', 'documents.read',
  ],
});

const EXTERNAL_ROLE_PERMISSIONS: Readonly<Partial<Record<PlatformRole, readonly PermissionKey[]>>> = Object.freeze({
  b2b_agent: ['profile.read', 'profile.update', 'agent.packages.read', 'agent.bookings.read', 'agent.bookings.create', 'agent.payments.read'],
  customer: ['profile.read', 'profile.update'],
});

export function permissionsForRole(role: PlatformRole): readonly PermissionKey[] {
  return ROLE_PERMISSIONS[role as InternalRole] ?? EXTERNAL_ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(
  principal: StaffPrincipal | null | undefined,
  permission: string,
): boolean {
  if (!principal || !principal.active) return false;
  return (permissionsForRole(principal.role) as readonly string[]).includes(permission);
}

export function hasAnyRole(
  principal: StaffPrincipal | null | undefined,
  roles: readonly InternalRole[],
): boolean {
  return Boolean(principal?.active && roles.includes(principal.role));
}

export function canAccessOrganization(
  principal: StaffPrincipal | null | undefined,
  organizationId: string,
): boolean {
  return Boolean(principal?.active && organizationId && principal.organizationIds.includes(organizationId));
}

export function canManageUserInScope(actor: StaffPrincipal, targetOrganizationIds: readonly string[]): boolean {
  if (!hasPermission(actor, 'identity.users.update')) return false;
  if (hasPermission(actor, 'identity.users.manage.anywhere')) return true;
  return targetOrganizationIds.some((organizationId) => actor.organizationIds.includes(organizationId));
}

export function canAssignRole(actor: StaffPrincipal, role: PlatformRole): boolean {
  if (!hasPermission(actor, 'identity.roles.assign')) return false;
  if (role === 'super_admin') return actor.role === 'super_admin';
  if (role === 'admin') return actor.role === 'super_admin';
  return actor.role === 'super_admin' || actor.role === 'admin';
}

export function canCustomerAccessRecord(
  principal: { readonly kind: 'customer'; readonly customerId: string; readonly phone: string } | null | undefined,
  record: { customerId?: unknown; phone?: unknown },
): boolean {
  if (!principal || principal.kind !== 'customer') return false;
  const recordId = typeof record.customerId === 'string' ? record.customerId : '';
  const recordPhone = typeof record.phone === 'string' ? record.phone : '';
  return recordId === principal.customerId || Boolean(recordPhone && canonicalPhone(recordPhone) === canonicalPhone(principal.phone));
}

function canonicalPhone(value: string): string {
  return value.replace(/[^0-9]/g, '');
}
