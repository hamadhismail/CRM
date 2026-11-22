import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { StaffAuthGuard, StaffAuthenticatedRequest } from '../auth/guards/staff-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UsersService } from './users.service';

@Controller('api/users')
@UseGuards(StaffAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('identity.users.read')
  list(@Req() request: StaffAuthenticatedRequest) {
    return this.usersService.list(request.user!);
  }

  @Patch(':uid/role')
  @RequirePermissions('identity.users.update', 'identity.roles.assign')
  updateRole(@Param('uid') uid: string, @Body() body: UpdateUserRoleDto, @Req() request: StaffAuthenticatedRequest) {
    return this.usersService.updateRole(uid, body.role, request.user!);
  }

  @Patch(':uid/status')
  @RequirePermissions('identity.users.update')
  updateStatus(@Param('uid') uid: string, @Body() body: UpdateUserStatusDto, @Req() request: StaffAuthenticatedRequest) {
    return this.usersService.updateStatus(uid, body.active, request.user!);
  }
}
