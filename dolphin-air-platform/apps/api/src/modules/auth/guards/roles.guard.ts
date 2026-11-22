import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { StaffAuthenticatedRequest } from './staff-auth.guard';
import { InternalRole } from '../interfaces/authenticated-principal';
import { REQUIRED_ROLES } from '../decorators/require-roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<readonly InternalRole[]>(REQUIRED_ROLES, [
      context.getHandler(), context.getClass(),
    ]);
    if (!required?.length) return true;
    const request = context.switchToHttp().getRequest<StaffAuthenticatedRequest>();
    if (!request.user || !required.includes(request.user.role)) {
      throw new ForbiddenException({ error: 'FORBIDDEN', message: 'You are not authorized to perform this action.' });
    }
    return true;
  }
}
