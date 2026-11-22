import { canAssignRole, hasPermission, permissionsForRole } from '../auth/authentication.policy';
import { PlatformRole, StaffPrincipal } from '../auth/interfaces/authenticated-principal';

export type IdentityOrganizationType = 'INTERNAL' | 'B2B_AGENCY';
export type IdentityRoleScope = 'SYSTEM' | 'ORGANIZATION';
export type IdentityUserType = 'INTERNAL_STAFF' | 'AGENCY_USER' | 'CUSTOMER';

export interface RoleScopeBinding {
  readonly organizationType: IdentityOrganizationType;
  readonly scope: IdentityRoleScope;
  readonly userType: Exclude<IdentityUserType, 'CUSTOMER'>;
}

const ROLE_SCOPE_BINDINGS: Readonly<Partial<Record<PlatformRole, RoleScopeBinding>>> = Object.freeze({
  super_admin: { organizationType: 'INTERNAL', scope: 'SYSTEM', userType: 'INTERNAL_STAFF' },
  admin: { organizationType: 'INTERNAL', scope: 'ORGANIZATION', userType: 'INTERNAL_STAFF' },
  staff: { organizationType: 'INTERNAL', scope: 'ORGANIZATION', userType: 'INTERNAL_STAFF' },
  sales: { organizationType: 'INTERNAL', scope: 'ORGANIZATION', userType: 'INTERNAL_STAFF' },
  operations: { organizationType: 'INTERNAL', scope: 'ORGANIZATION', userType: 'INTERNAL_STAFF' },
  finance_accounts: { organizationType: 'INTERNAL', scope: 'ORGANIZATION', userType: 'INTERNAL_STAFF' },
  visa_processing: { organizationType: 'INTERNAL', scope: 'ORGANIZATION', userType: 'INTERNAL_STAFF' },
  b2b_agent: { organizationType: 'B2B_AGENCY', scope: 'ORGANIZATION', userType: 'AGENCY_USER' },
  // Customer identities are associated through CustomerIdentity, not UserRole.
});

export type RoleScopeDenial =
  | 'ROLE_NOT_ASSIGNABLE'
  | 'ROLE_SCOPE_MISMATCH'
  | 'ORGANIZATION_INACTIVE'
  | 'MEMBERSHIP_INACTIVE'
  | 'USER_INACTIVE'
  | 'USER_TYPE_MISMATCH'
  | 'ACTOR_NOT_AUTHORIZED'
  | 'ACTOR_OUT_OF_SCOPE'
  | 'SELF_ASSIGNMENT'
  | 'PERMISSION_CATALOG_MISMATCH';

export type RoleScopeDecision =
  | { readonly allowed: true; readonly binding: RoleScopeBinding }
  | { readonly allowed: false; readonly reason: RoleScopeDenial };

export interface RoleAssignmentContext {
  readonly actor: StaffPrincipal;
  readonly actorDatabaseUserId: string;
  readonly targetDatabaseUserId: string;
  readonly targetFirebaseUid: string | null;
  readonly organizationId: string;
  readonly organizationType: IdentityOrganizationType;
  readonly organizationStatus: 'ACTIVE' | 'INACTIVE';
  readonly membershipStatus: 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
  readonly targetUserStatus: 'INVITED' | 'ACTIVE' | 'DISABLED';
  readonly targetUserType: IdentityUserType;
  readonly roleCode: string;
  readonly roleScope: IdentityRoleScope;
  readonly roleAllowedOrganizationType: IdentityOrganizationType | null;
  readonly databasePermissionCodes: readonly string[];
}

export function roleScopeBinding(roleCode: string): RoleScopeBinding | null {
  return isPlatformRole(roleCode) ? ROLE_SCOPE_BINDINGS[roleCode] ?? null : null;
}

export function evaluateRoleAssignment(context: RoleAssignmentContext): RoleScopeDecision {
  const binding = roleScopeBinding(context.roleCode);
  if (!binding) return { allowed: false, reason: 'ROLE_NOT_ASSIGNABLE' };

  if (binding.organizationType !== context.organizationType
    || binding.organizationType !== context.roleAllowedOrganizationType
    || binding.scope !== context.roleScope) {
    return { allowed: false, reason: 'ROLE_SCOPE_MISMATCH' };
  }
  if (context.organizationStatus !== 'ACTIVE') return { allowed: false, reason: 'ORGANIZATION_INACTIVE' };
  if (context.membershipStatus !== 'ACTIVE') return { allowed: false, reason: 'MEMBERSHIP_INACTIVE' };
  if (context.targetUserStatus !== 'ACTIVE') return { allowed: false, reason: 'USER_INACTIVE' };
  if (binding.userType !== context.targetUserType) return { allowed: false, reason: 'USER_TYPE_MISMATCH' };

  const targetMatchesActor = context.targetDatabaseUserId === context.actorDatabaseUserId
    || (context.targetFirebaseUid !== null && context.targetFirebaseUid === context.actor.uid);
  if (targetMatchesActor) return { allowed: false, reason: 'SELF_ASSIGNMENT' };

  if (!hasPermission(context.actor, 'identity.roles.assign')
    || !canAssignRole(context.actor, context.roleCode as PlatformRole)
    || (context.organizationType === 'B2B_AGENCY' && context.actor.role !== 'super_admin')) {
    return { allowed: false, reason: 'ACTOR_NOT_AUTHORIZED' };
  }

  const canManageAnywhere = hasPermission(context.actor, 'identity.users.manage.anywhere');
  if (!canManageAnywhere && !context.actor.organizationIds.includes(context.organizationId)) {
    return { allowed: false, reason: 'ACTOR_OUT_OF_SCOPE' };
  }

  if (!samePermissionSet(context.databasePermissionCodes, permissionsForRole(context.roleCode as PlatformRole))) {
    return { allowed: false, reason: 'PERMISSION_CATALOG_MISMATCH' };
  }

  return { allowed: true, binding };
}

export function evaluateRolePermissionContext(input: {
  readonly userActive: boolean;
  readonly userType: IdentityUserType;
  readonly organizationId: string;
  readonly organizationType: IdentityOrganizationType;
  readonly organizationStatus: 'ACTIVE' | 'INACTIVE';
  readonly membershipStatus: 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
  readonly roleCode: string;
  readonly roleScope: IdentityRoleScope;
  readonly roleAllowedOrganizationType: IdentityOrganizationType | null;
  readonly databasePermissionCodes: readonly string[];
}): boolean {
  const binding = roleScopeBinding(input.roleCode);
  return Boolean(input.userActive
    && input.organizationId
    && input.organizationStatus === 'ACTIVE'
    && input.membershipStatus === 'ACTIVE'
    && binding
    && binding.userType === input.userType
    && binding.organizationType === input.organizationType
    && binding.organizationType === input.roleAllowedOrganizationType
    && binding.scope === input.roleScope
    && samePermissionSet(input.databasePermissionCodes, permissionsForRole(input.roleCode as PlatformRole)));
}

function samePermissionSet(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  if (leftSet.size !== left.length || rightSet.size !== right.length) return false;
  return [...rightSet].every((permission) => leftSet.has(permission));
}

function isPlatformRole(value: string): value is PlatformRole {
  return [
    'super_admin', 'admin', 'staff', 'sales', 'operations', 'finance_accounts',
    'visa_processing', 'b2b_agent', 'customer',
  ].includes(value);
}
