import { SetMetadata } from '@nestjs/common';
import { InternalRole } from '../interfaces/authenticated-principal';

export const REQUIRED_ROLES = 'identity:required-roles';
export const RequireRoles = (...roles: InternalRole[]) => SetMetadata(REQUIRED_ROLES, roles);
