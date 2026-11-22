import { HttpException, HttpStatus, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { DecodedIdToken } from 'firebase-admin/auth';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../../database/prisma.service';
import { StaffPrincipal, isInternalRole, toStaffPrincipal } from '../interfaces/authenticated-principal';
import { evaluateRolePermissionContext } from '../../roles/role-scope.policy';

@Injectable()
export class DatabaseStaffIdentityService {
  private readonly bootstrapRequests = new Map<string, { startedAt: number; count: number }>();

  constructor(private readonly database: PrismaService) {}

  async listAvailableOrganizations(decoded: DecodedIdToken): Promise<{ organizations: Array<{ id: string; name: string }> }> {
    this.enforceBootstrapRateLimit(decoded.uid);
    if (!decoded.uid || decoded.email_verified !== true) throw unauthorized();
    try {
      const account = await this.database.client.user.findUnique({
        where: { firebaseUid: decoded.uid },
        select: {
          id: true,
          status: true,
          userType: true,
          memberships: {
            where: { status: 'ACTIVE' },
            include: {
              organization: true,
              roleAssignments: {
                where: { status: 'ACTIVE' },
                include: { role: { include: { permissions: { include: { permission: true } } } } },
              },
            },
          },
        },
      });
      if (!account || account.status !== 'ACTIVE' || account.userType !== 'INTERNAL_STAFF') throw unauthorized();

      const eligible = account.memberships.filter((membership) => {
        const organization = membership.organization;
        if (membership.status !== 'ACTIVE' || organization.status !== 'ACTIVE' || organization.type !== 'INTERNAL'
          || membership.roleAssignments.length !== 1) return false;
        const assignment = membership.roleAssignments[0];
        const role = assignment.role;
        const permissions = role.permissions.map(({ permission }) => permission.code);
        return isInternalRole(role.code) && role.isSystemRole
          && assignment.organizationType === organization.type
          && assignment.roleScope === role.scope
          && role.allowedOrganizationType === organization.type
          && evaluateRolePermissionContext({
            userActive: account.status === 'ACTIVE',
            userType: account.userType,
            organizationId: organization.id,
            organizationType: organization.type,
            organizationStatus: organization.status,
            membershipStatus: membership.status,
            roleCode: role.code,
            roleScope: assignment.roleScope,
            roleAllowedOrganizationType: role.allowedOrganizationType,
            databasePermissionCodes: permissions,
          });
      }).map(({ organization }) => ({ id: organization.id, name: organization.name }))
        .sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id));

      return { organizations: eligible };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof HttpException) throw error;
      throw new ServiceUnavailableException({
        error: 'IDENTITY_STORE_UNAVAILABLE',
        message: 'Identity service is temporarily unavailable.',
      });
    }
  }

  async recordSessionRevocation(firebaseUid: string): Promise<boolean> {
    try {
      await this.database.client.$transaction(async (tx) => {
        const user = await tx.user.findUnique({ where: { firebaseUid }, select: { id: true } });
        await tx.auditEvent.create({ data: {
          actorUserId: user?.id,
          action: 'auth.session.revoked',
          targetType: user ? 'User' : 'FirebaseIdentity',
          targetId: user?.id ?? createHash('sha256').update(firebaseUid).digest('hex'),
          safeMetadata: { source: 'firebase_refresh_token_revocation' },
        } });
      });
      return true;
    } catch {
      return false;
    }
  }

  async resolveVerifiedIdentity(decoded: DecodedIdToken, organizationId: string): Promise<StaffPrincipal> {
    const email = typeof decoded.email === 'string' ? decoded.email.trim().toLowerCase() : '';
    const displayName = typeof decoded.name === 'string' ? decoded.name.trim() : '';
    if (!decoded.uid || !email || decoded.email_verified !== true || !isUuid(organizationId)) throw unauthorized();

    try {
      return await this.database.client.$transaction(async (tx) => {
        const identity = await tx.user.findUnique({
          where: { firebaseUid: decoded.uid },
          select: { id: true },
        });
        if (!identity) {
          await tx.auditEvent.create({ data: {
            action: 'auth.identity.denied.unprovisioned',
            targetType: 'FirebaseIdentity',
            targetId: createHash('sha256').update(decoded.uid).digest('hex'),
            safeMetadata: { reason: 'unprovisioned' },
          } });
          throw unauthorized();
        }

        // Lock in the same organization -> membership -> user order used by the
        // role-assignment trigger so concurrent deactivation cannot race auth.
        const organizationRows = await tx.$queryRaw<Array<{ id: string; type: string; status: string }>>`
          SELECT id, type, status FROM organizations WHERE id = ${organizationId}::uuid FOR SHARE
        `;
        const membershipRows = await tx.$queryRaw<Array<{ id: string; status: string }>>`
          SELECT id, status FROM organization_memberships
          WHERE organization_id = ${organizationId}::uuid AND user_id = ${identity.id}::uuid
          FOR SHARE
        `;
        const userRows = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM users WHERE id = ${identity.id}::uuid FOR UPDATE
        `;
        if (organizationRows.length !== 1 || membershipRows.length !== 1 || userRows.length !== 1) throw unauthorized();

        const account = await tx.user.findUnique({
          where: { id: identity.id },
          include: {
            memberships: {
              where: { organizationId, status: 'ACTIVE' },
              include: {
                organization: true,
                roleAssignments: {
                  where: { status: 'ACTIVE' },
                  include: { role: { include: { permissions: { include: { permission: true } } } } },
                },
              },
            },
          },
        });
        const organization = organizationRows[0];
        const membership = account?.memberships[0];
        if (!account || account.status !== 'ACTIVE' || account.userType !== 'INTERNAL_STAFF'
          || organization.status !== 'ACTIVE' || organization.type !== 'INTERNAL'
          || membership?.status !== 'ACTIVE' || membership.organization.status !== 'ACTIVE') throw unauthorized();

        // Current API principals have one role. Multiple simultaneous roles
        // are rejected until the authorization contract supports aggregation.
        if (membership.roleAssignments.length !== 1) throw unauthorized();
        const assignment = membership.roleAssignments[0];
        const roleCode = assignment.role.code;
        if (!isInternalRole(roleCode) || assignment.role.isSystemRole !== true
          || assignment.organizationType !== organization.type
          || assignment.roleScope !== assignment.role.scope
          || assignment.role.allowedOrganizationType !== organization.type) throw unauthorized();
        const databasePermissionCodes = assignment.role.permissions.map(({ permission }) => permission.code);
        if (!evaluateRolePermissionContext({
          userActive: account.status === 'ACTIVE',
          userType: account.userType,
          organizationId,
          organizationType: organization.type,
          organizationStatus: organization.status,
          membershipStatus: membership.status,
          roleCode,
          roleScope: assignment.roleScope,
          roleAllowedOrganizationType: assignment.role.allowedOrganizationType,
          databasePermissionCodes,
        })) throw unauthorized();

        const emailNormalized = email;
        const profileChanged = account.email !== email || account.emailNormalized !== emailNormalized
          || (displayName.length > 0 && account.displayName !== displayName);
        if (profileChanged) {
          await tx.user.update({
            where: { id: account.id },
            data: {
              email,
              emailNormalized,
              ...(displayName ? { displayName } : {}),
            },
          });
        }
        await tx.auditEvent.create({ data: {
          organizationId,
          actorUserId: account.id,
          action: profileChanged ? 'auth.identity.profile_synchronized' : 'auth.identity.resolved',
          targetType: 'User',
          targetId: account.id,
          safeMetadata: { roleCode, organizationType: organization.type },
        } });

        const principal = toStaffPrincipal(decoded.uid, {
          email,
          displayName: displayName || account.displayName,
          role: roleCode,
          active: true,
          organizationIds: [organizationId],
        }, email);
        if (!principal) throw unauthorized();
        return principal;
      }, { isolationLevel: 'Serializable' });
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new ServiceUnavailableException({
        error: 'IDENTITY_STORE_UNAVAILABLE',
        message: 'Identity service is temporarily unavailable.',
      });
    }
  }

  private enforceBootstrapRateLimit(firebaseUid: string): void {
    const now = Date.now();
    const key = createHash('sha256').update(firebaseUid || 'missing').digest('hex');
    const windowMs = 60_000;
    const limit = 30;
    for (const [candidate, value] of this.bootstrapRequests) {
      if (now - value.startedAt >= windowMs) this.bootstrapRequests.delete(candidate);
    }
    if (this.bootstrapRequests.size > 5_000) this.bootstrapRequests.clear();
    const current = this.bootstrapRequests.get(key);
    if (current && now - current.startedAt < windowMs) {
      if (current.count >= limit) throw new HttpException({
        error: 'BOOTSTRAP_RATE_LIMITED',
        message: 'Please wait before requesting organization access again.',
      }, HttpStatus.TOO_MANY_REQUESTS);
      current.count += 1;
      return;
    }
    this.bootstrapRequests.set(key, { startedAt: now, count: 1 });
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function unauthorized(): UnauthorizedException {
  return new UnauthorizedException({ error: 'UNAUTHORIZED', message: 'Authentication required.' });
}
