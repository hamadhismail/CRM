import { ForbiddenException, Injectable } from '@nestjs/common';
import { canAccessOrganization } from '../auth/authentication.policy';
import { AuthenticatedPrincipal } from '../auth/interfaces/authenticated-principal';

@Injectable()
export class OrganizationScopeService {
  assertMembership(principal: AuthenticatedPrincipal | undefined, organizationId: string): void {
    if (principal?.kind !== 'staff' || !canAccessOrganization(principal, organizationId)) {
      throw new ForbiddenException({ error: 'ORGANIZATION_SCOPE_UNVERIFIED', message: 'Organization access is not configured for this account.' });
    }
  }
}
