import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { permissionsForRole } from '../auth/authentication.policy';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { StaffAuthGuard, StaffAuthenticatedRequest } from '../auth/guards/staff-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PLATFORM_ROLES } from '../auth/interfaces/authenticated-principal';

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  staff: 'Staff',
  sales: 'Sales',
  operations: 'Operations',
  finance_accounts: 'Finance / Accounts',
  visa_processing: 'Visa Processing',
  b2b_agent: 'B2B Agent',
  customer: 'Customer',
} as const;

@Controller('api/roles')
@UseGuards(StaffAuthGuard, PermissionsGuard)
export class RolesController {
  @Get()
  @RequirePermissions('identity.roles.read')
  list() {
    return {
      roles: PLATFORM_ROLES.map((role) => ({
        key: role,
        label: ROLE_LABELS[role],
        principalType: role === 'customer' ? 'customer' : role === 'b2b_agent' ? 'agent' : 'staff',
        permissions: permissionsForRole(role),
      })),
      definitionsMutable: false,
    };
  }

  @Get('me')
  current(@Req() request: StaffAuthenticatedRequest) {
    const principal = request.user!;
    return { role: principal.role, permissions: permissionsForRole(principal.role) };
  }
}
