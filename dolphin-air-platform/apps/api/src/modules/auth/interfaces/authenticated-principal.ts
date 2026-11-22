export const PLATFORM_ROLES = [
  'super_admin',
  'admin',
  'staff',
  'sales',
  'operations',
  'finance_accounts',
  'visa_processing',
  'b2b_agent',
  'customer',
] as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[number];
export type InternalRole = Exclude<PlatformRole, 'b2b_agent' | 'customer'>;

export interface StaffPrincipal {
  readonly kind: 'staff';
  readonly uid: string;
  readonly email: string;
  readonly displayName: string;
  readonly role: InternalRole;
  readonly active: true;
  readonly organizationIds: readonly string[];
  readonly permissions: readonly string[];
}

export interface CustomerPrincipal {
  readonly kind: 'customer';
  readonly customerId: string;
  readonly phone: string;
  readonly name: string;
  readonly email: string;
}

export type AuthenticatedPrincipal = StaffPrincipal | CustomerPrincipal;

export interface UserRecord {
  uid?: string;
  email?: string;
  displayName?: string;
  role?: string;
  active?: boolean;
  organizationIds?: unknown;
}

export function toStaffPrincipal(uid: string, record: UserRecord, verifiedEmail: string): StaffPrincipal | null {
  const email = verifiedEmail.trim().toLowerCase();
  const role = record.role;
  if (!email || record.active !== true || !isInternalRole(role)) return null;
  if (record.email && record.email.trim().toLowerCase() !== email) return null;

  return Object.freeze({
    kind: 'staff',
    uid,
    email,
    displayName: typeof record.displayName === 'string' && record.displayName.trim()
      ? record.displayName.trim()
      : email.split('@')[0],
    role,
    active: true,
    organizationIds: stringList(record.organizationIds),
    permissions: Object.freeze([]),
  });
}

export function toSafeUser(principal: StaffPrincipal, permissions: readonly string[]) {
  return {
    id: principal.uid,
    email: principal.email,
    displayName: principal.displayName,
    role: principal.role,
    active: principal.active,
    organizationIds: [...principal.organizationIds],
    permissions: [...permissions],
  };
}

export function isPlatformRole(value: unknown): value is PlatformRole {
  return typeof value === 'string' && (PLATFORM_ROLES as readonly string[]).includes(value);
}

export function isInternalRole(value: unknown): value is InternalRole {
  return isPlatformRole(value) && value !== 'b2b_agent' && value !== 'customer';
}

function stringList(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return Object.freeze([]);
  return Object.freeze([...new Set(value.filter((item): item is string => typeof item === 'string' && item.length > 0))]);
}
