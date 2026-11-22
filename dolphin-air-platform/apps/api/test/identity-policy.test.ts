import assert from 'node:assert/strict';
import test from 'node:test';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { canAccessOrganization, canAssignRole, canCustomerAccessRecord, canManageUserInScope, hasPermission, permissionsForRole } from '../src/modules/auth/authentication.policy';
import { PLATFORM_ROLES, StaffPrincipal, toStaffPrincipal } from '../src/modules/auth/interfaces/authenticated-principal';
import { extractBearerToken, StaffAuthGuard } from '../src/modules/auth/guards/staff-auth.guard';
import { PermissionsGuard } from '../src/modules/auth/guards/permissions.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';
import { CustomerAuthGuard } from '../src/modules/auth/guards/customer-auth.guard';

function principal(role: StaffPrincipal['role'], organizationIds: string[] = ['org-a']): StaffPrincipal {
  return toStaffPrincipal(`${role}-uid`, {
    email: `${role}@example.test`, role, active: true, displayName: role, organizationIds,
  }, `${role}@example.test`)!;
}

test('platform role catalogue contains the approved new-system roles only', () => {
  assert.deepEqual(PLATFORM_ROLES, [
    'super_admin', 'admin', 'staff', 'sales', 'operations', 'finance_accounts', 'visa_processing', 'b2b_agent', 'customer',
  ]);
  assert.equal(toStaffPrincipal('uid', { email: 'x@example.test', role: 'unknown', active: true }, 'x@example.test'), null);
  assert.equal(toStaffPrincipal('uid', { email: 'x@example.test', role: 'customer', active: true }, 'x@example.test'), null);
  assert.equal(toStaffPrincipal('uid', { email: 'x@example.test', role: 'staff' }, 'x@example.test'), null);
  assert.equal(toStaffPrincipal('uid', { email: 'x@example.test', role: 'staff', active: false }, 'x@example.test'), null);
});

test('each role receives only its explicit central permission set', () => {
  const superAdmin = principal('super_admin');
  const admin = principal('admin');
  assert.equal(hasPermission(superAdmin, 'identity.users.manage.anywhere'), true);
  assert.equal(hasPermission(superAdmin, 'bookings.delete'), false);
  assert.equal(hasPermission(admin, 'identity.users.read'), true);
  assert.equal(hasPermission(admin, 'identity.users.manage.anywhere'), false);
  assert.equal(hasPermission(principal('staff'), 'identity.users.read'), false);
  assert.equal(hasPermission(principal('sales'), 'leads.create'), true);
  assert.equal(hasPermission(principal('sales'), 'finance.payments.approve'), false);
  assert.equal(hasPermission(principal('operations'), 'bookings.update'), true);
  assert.equal(hasPermission(principal('finance_accounts'), 'finance.payments.approve'), true);
  assert.equal(hasPermission(principal('visa_processing'), 'visas.process'), true);
  assert.deepEqual(permissionsForRole('b2b_agent').includes('agent.bookings.create'), true);
  assert.deepEqual(permissionsForRole('customer'), ['profile.read', 'profile.update']);
});

test('Nest permission and role guards allow assigned access and reject denied access', () => {
  const user = principal('sales');
  const makeContext = (requestUser: unknown) => ({
    getHandler: () => ({}), getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user: requestUser }) }),
  }) as never;
  const permissionGuard = new PermissionsGuard({ getAllAndOverride: () => ['leads.create'] } as never);
  const forbiddenPermissionGuard = new PermissionsGuard({ getAllAndOverride: () => ['finance.payments.approve'] } as never);
  const roleGuard = new RolesGuard({ getAllAndOverride: () => ['admin'] } as never);
  assert.equal(permissionGuard.canActivate(makeContext(user)), true);
  assert.throws(() => forbiddenPermissionGuard.canActivate(makeContext(user)), ForbiddenException);
  assert.throws(() => roleGuard.canActivate(makeContext(user)), ForbiddenException);
});

test('organization and user-management scope fails closed across organizations', () => {
  const admin = principal('admin', ['org-a']);
  const superAdmin = principal('super_admin');
  assert.equal(canAccessOrganization(admin, 'org-a'), true);
  assert.equal(canAccessOrganization(admin, 'org-b'), false);
  assert.equal(canAccessOrganization(null, 'org-a'), false);
  assert.equal(canManageUserInScope(admin, ['org-a']), true);
  assert.equal(canManageUserInScope(admin, ['org-b']), false);
  assert.equal(canManageUserInScope(superAdmin, ['org-b']), true);
});

test('role assignment prevents self-service privilege escalation', () => {
  const admin = principal('admin');
  const superAdmin = principal('super_admin');
  const sales = principal('sales');
  assert.equal(canAssignRole(admin, 'sales'), true);
  assert.equal(canAssignRole(admin, 'admin'), false);
  assert.equal(canAssignRole(admin, 'super_admin'), false);
  assert.equal(canAssignRole(sales, 'staff'), false);
  assert.equal(canAssignRole(superAdmin, 'super_admin'), true);
});

test('customer record access rejects cross-customer identifiers and phone numbers', () => {
  const customer = { kind: 'customer' as const, customerId: 'customer-1', phone: '+91 98765 43210' };
  assert.equal(canCustomerAccessRecord(customer, { customerId: 'customer-1' }), true);
  assert.equal(canCustomerAccessRecord(customer, { phone: '919876543210' }), true);
  assert.equal(canCustomerAccessRecord(customer, { customerId: 'customer-2', phone: '+1 555 0100' }), false);
  assert.equal(canCustomerAccessRecord(null, { customerId: 'customer-1' }), false);
});

test('staff guard rejects missing bearer credentials before identity lookup', async () => {
  let calls = 0;
  const guard = new StaffAuthGuard({ authenticateStaff: async () => { calls += 1; return principal('super_admin'); } } as never);
  const context = { switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }) } as never;
  await assert.rejects(() => guard.canActivate(context), UnauthorizedException);
  assert.equal(calls, 0);
});

test('customer session credentials are accepted only in bearer headers', () => {
  assert.equal(extractBearerToken({ headers: {}, query: { token: 'csess_unacceptable_query_token' } } as never), null);
  assert.equal(extractBearerToken({ headers: { authorization: 'Bearer csess_session' } } as never), 'csess_session');
});

function customerGuard(session: Record<string, unknown> | null, exists = true) {
  const firebase = { firestore: { collection: () => ({ doc: () => ({ get: async () => ({ exists, data: () => session }) }) }) } };
  return new CustomerAuthGuard(firebase as never);
}

function customerContext(token: string) {
  const request: { headers: Record<string, string>; customer?: unknown } = { headers: { authorization: `Bearer ${token}` } };
  return { context: { switchToHttp: () => ({ getRequest: () => request }) } as never, request };
}

test('customer guard accepts a valid server-issued session and resolves its owner', async () => {
  const guard = customerGuard({ customerId: 'customer-1', phone: '+919876543210', expiresAt: Date.now() + 60_000 });
  const { context, request } = customerContext('csess_synthetic_valid_session');
  assert.equal(await guard.canActivate(context), true);
  assert.equal((request.customer as { customerId: string }).customerId, 'customer-1');
});

test('customer guard rejects forged, missing, expired, revoked and unassociated sessions', async () => {
  const token = 'csess_synthetic_session';
  const notFound = customerGuard(null, false);
  const expired = customerGuard({ customerId: 'customer-1', phone: '+919876543210', expiresAt: Date.now() - 1 });
  const revoked = customerGuard({ customerId: 'customer-1', phone: '+919876543210', expiresAt: Date.now() + 60_000, revoked: true });
  const unassociated = customerGuard({ phone: '+919876543210', expiresAt: Date.now() + 60_000 });
  for (const [guard, credential] of [
    [notFound, token], [notFound, 'csess_forged_random'], [expired, token], [revoked, token], [unassociated, token],
    [notFound, 'forged_customer_token'],
  ] as const) {
    await assert.rejects(() => guard.canActivate(customerContext(credential).context), UnauthorizedException);
  }
});

test('staff guard rejects an invalid signed-token verification result', async () => {
  const guard = new StaffAuthGuard({ authenticateStaff: async () => { throw new UnauthorizedException(); } } as never);
  const context = { switchToHttp: () => ({ getRequest: () => ({ headers: { authorization: 'Bearer forged-token' } }) }) } as never;
  await assert.rejects(() => guard.canActivate(context), UnauthorizedException);
});
