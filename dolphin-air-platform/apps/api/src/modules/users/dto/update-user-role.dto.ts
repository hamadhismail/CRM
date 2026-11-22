import { IsIn } from 'class-validator';
import { InternalRole } from '../../auth/interfaces/authenticated-principal';

const ASSIGNABLE_INTERNAL_ROLES: readonly InternalRole[] = [
  'super_admin', 'admin', 'staff', 'sales', 'operations', 'finance_accounts', 'visa_processing',
];

export class UpdateUserRoleDto {
  @IsIn(ASSIGNABLE_INTERNAL_ROLES)
  role!: InternalRole;
}
