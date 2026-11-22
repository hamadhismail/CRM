import assert from 'node:assert/strict';
import test from 'node:test';
import { permissionsForRole } from '../src/modules/auth/authentication.policy';
import { StaffPrincipal, toStaffPrincipal } from '../src/modules/auth/interfaces/authenticated-principal';
import {
  evaluateRoleAssignment,
  evaluateRolePermissionContext,
  RoleAssignmentContext,
} from '../src/modules/roles/role-scope.policy';

function principal(role: StaffPrincipal['role'], organizationIds = ['internal-1']): StaffPrincipal {
  return toStaffPrincipal(`firebase-${role}`, {
    email: `${role}@example.test`, displayName: role, active: true, role, organizationIds,
  }, `${role}@example.test`)!;
}

function assignmentContext(overrides: Partial<RoleAssignmentContext> = {}): RoleAssignmentContext {
  const roleCode = overrides.roleCode ?? 'sales';
  return {
    actor: principal('super_admin'),
    actorDatabaseUserId: 'actor-db-id',
    targetDatabaseUserId: 'target-db-id',
    targetFirebaseUid: 'firebase-target',
    organizationId: 'internal-1',
    organizationType: 'INTERNAL',
    organizationStatus: 'ACTIVE',
    membershipStatus: 'ACTIVE',
    targetUserStatus: 'ACTIVE',
    targetUserType: 'INTERNAL_STAFF',
    roleCode,
    roleScope: roleCode === 'super_admin' ? 'SYSTEM' : 'ORGANIZATION',
    roleAllowedOrganizationType: roleCode === 'b2b_agent' ? 'B2B_AGENCY' : roleCode === 'customer' ? null : 'INTERNAL',
    databasePermissionCodes: permissionsForRole(roleCode as never),
    ...overrides,
  };
}

test('role scope policy permits approved active internal staff assignments', () => {
  assert.equal(evaluateRoleAssignment(assignmentContext()).allowed, true);
});

test('role scope policy permits approved B2B assignment by an in-scope Super Admin', () => {
  const context = assignmentContext({
    roleCode: 'b2b_agent',
    organizationId: 'agency-1',
    organizationType: 'B2B_AGENCY',
    roleAllowedOrganizationType: 'B2B_AGENCY',
    targetUserType: 'AGENCY_USER',
  });
  assert.equal(evaluateRoleAssignment(context).allowed, true);
});

test('role scope policy rejects cross-organization role and organization-type mismatches', () => {
  const decision = evaluateRoleAssignment(assignmentContext({ organizationType: 'B2B_AGENCY' }));
  assert.deepEqual(decision, { allowed: false, reason: 'ROLE_SCOPE_MISMATCH' });
  assert.equal(evaluateRoleAssignment(assignmentContext({
    roleCode: 'b2b_agent', organizationType: 'INTERNAL', roleAllowedOrganizationType: 'B2B_AGENCY',
    targetUserType: 'AGENCY_USER',
  })).allowed, false);
});

test('internal admin roles cannot be assigned to agencies and agency roles cannot be assigned internally', () => {
  assert.equal(evaluateRoleAssignment(assignmentContext({
    roleCode: 'admin', organizationType: 'B2B_AGENCY', roleAllowedOrganizationType: 'INTERNAL', targetUserType: 'AGENCY_USER',
  })).allowed, false);
  assert.equal(evaluateRoleAssignment(assignmentContext({
    roleCode: 'b2b_agent', organizationType: 'INTERNAL', roleAllowedOrganizationType: 'B2B_AGENCY', targetUserType: 'INTERNAL_STAFF',
  })).allowed, false);
});

test('role scope policy rejects inactive organizations, memberships and users', () => {
  assert.deepEqual(evaluateRoleAssignment(assignmentContext({ organizationStatus: 'INACTIVE' })), { allowed: false, reason: 'ORGANIZATION_INACTIVE' });
  assert.deepEqual(evaluateRoleAssignment(assignmentContext({ membershipStatus: 'REVOKED' })), { allowed: false, reason: 'MEMBERSHIP_INACTIVE' });
  assert.deepEqual(evaluateRoleAssignment(assignmentContext({ targetUserStatus: 'DISABLED' })), { allowed: false, reason: 'USER_INACTIVE' });
});

test('role scope policy rejects self assignment and actor privilege escalation', () => {
  assert.deepEqual(evaluateRoleAssignment(assignmentContext({ targetDatabaseUserId: 'actor-db-id' })), { allowed: false, reason: 'SELF_ASSIGNMENT' });
  assert.equal(evaluateRoleAssignment(assignmentContext({ roleCode: 'customer' })).allowed, false);
  assert.equal(evaluateRoleAssignment(assignmentContext({
    actor: principal('admin'), roleCode: 'admin',
  })).allowed, false);
  assert.equal(evaluateRoleAssignment(assignmentContext({
    actor: principal('admin'), roleCode: 'b2b_agent', organizationId: 'agency-1',
    organizationType: 'B2B_AGENCY', roleAllowedOrganizationType: 'B2B_AGENCY', targetUserType: 'AGENCY_USER',
  })).allowed, false);
});

test('role scope policy rejects out-of-scope actors and mismatched permission catalog entries', () => {
  assert.deepEqual(evaluateRoleAssignment(assignmentContext({
    actor: principal('admin', ['internal-2']),
  })), { allowed: false, reason: 'ACTOR_OUT_OF_SCOPE' });
  assert.deepEqual(evaluateRoleAssignment(assignmentContext({
    databasePermissionCodes: ['dashboard.view'],
  })), { allowed: false, reason: 'PERMISSION_CATALOG_MISMATCH' });
});

test('permission evaluation fails closed on inactive context, wrong role scope, or catalog drift', () => {
  const base = {
    userActive: true,
    userType: 'INTERNAL_STAFF' as const,
    organizationId: 'internal-1',
    organizationType: 'INTERNAL' as const,
    organizationStatus: 'ACTIVE' as const,
    membershipStatus: 'ACTIVE' as const,
    roleCode: 'sales',
    roleScope: 'ORGANIZATION' as const,
    roleAllowedOrganizationType: 'INTERNAL' as const,
    databasePermissionCodes: permissionsForRole('sales'),
  };
  assert.equal(evaluateRolePermissionContext(base), true);
  assert.equal(evaluateRolePermissionContext({ ...base, membershipStatus: 'SUSPENDED' }), false);
  assert.equal(evaluateRolePermissionContext({ ...base, roleScope: 'SYSTEM' }), false);
  assert.equal(evaluateRolePermissionContext({ ...base, userType: 'AGENCY_USER' }), false);
  assert.equal(evaluateRolePermissionContext({ ...base, databasePermissionCodes: [] }), false);
});
