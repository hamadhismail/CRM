import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { PERMISSION_CATALOG, permissionsForRole } from '../auth/authentication.policy';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { StaffAuthGuard, StaffAuthenticatedRequest } from '../auth/guards/staff-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@Controller('api/permissions')
@UseGuards(StaffAuthGuard, PermissionsGuard)
export class PermissionsController {
  @Get('me')
  current(@Req() request: StaffAuthenticatedRequest) {
    const user = request.user!;
    return { role: user.role, permissions: permissionsForRole(user.role) };
  }

  @Get()
  @RequirePermissions('identity.permissions.read')
  catalog() {
    return { permissions: PERMISSION_CATALOG };
  }
}
