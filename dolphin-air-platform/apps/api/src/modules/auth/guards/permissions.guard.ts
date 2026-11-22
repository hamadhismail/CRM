import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { StaffAuthenticatedRequest } from './staff-auth.guard';
import { hasPermission } from '../authentication.policy';
import { REQUIRED_PERMISSIONS } from '../decorators/require-permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<readonly string[]>(REQUIRED_PERMISSIONS, [
      context.getHandler(), context.getClass(),
    ]);
    if (!required?.length) return true;
    const principal = context.switchToHttp().getRequest<StaffAuthenticatedRequest>().user;
    if (!principal || !required.every((permission) => hasPermission(principal, permission))) {
      throw new ForbiddenException({ error: 'FORBIDDEN', message: 'You are not authorized to perform this action.' });
    }
    return true;
  }
}
