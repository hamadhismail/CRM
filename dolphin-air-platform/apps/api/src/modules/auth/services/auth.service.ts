import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { DecodedIdToken } from 'firebase-admin/auth';
import { FirebaseAdminService } from '../../../infrastructure/firebase/firebase-admin.service';
import { DatabaseStaffIdentityService } from './database-staff-identity.service';
import { permissionsForRole } from '../authentication.policy';
import { StaffPrincipal, UserRecord, toSafeUser, toStaffPrincipal } from '../interfaces/authenticated-principal';

const STAFF_IDENTITY_PROVIDERS = new Set(['password', 'google.com']);

@Injectable()
export class AuthService {
  constructor(
    private readonly firebase: FirebaseAdminService,
    private readonly databaseIdentity: DatabaseStaffIdentityService,
  ) {}

  async authenticateStaff(idToken: string, organizationId?: string): Promise<StaffPrincipal> {
    const decoded = await this.verifyStaffIdentityToken(idToken);
    const email = decoded.email as string;

    if (process.env.DATABASE_IDENTITY_AUTH_ENABLED === 'true') {
      if (process.env.NODE_ENV !== 'development' || !organizationId) throw unauthorized();
      const principal = await this.databaseIdentity.resolveVerifiedIdentity(decoded, organizationId);
      this.audit('staff.database_identity.accepted', decoded.uid);
      return principal;
    }

    try {
      const snapshot = await this.firebase.firestore.collection('users').doc(decoded.uid).get();
      const record = snapshot.exists ? snapshot.data() as UserRecord : null;
      const principal = record ? toStaffPrincipal(decoded.uid, record, email) : null;
      if (!principal) {
        this.audit('staff.account.denied', decoded.uid);
        throw unauthorized();
      }
      this.audit('staff.session.accepted', decoded.uid);
      return principal;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException({ error: 'IDENTITY_STORE_UNAVAILABLE', message: 'Identity service is temporarily unavailable.' });
    }
  }

  async verifyStaffIdentityToken(idToken: string): Promise<DecodedIdToken> {
    const decoded = await this.verifyToken(idToken);
    const email = typeof decoded.email === 'string' ? decoded.email : '';
    const provider = (decoded.firebase as { sign_in_provider?: string } | undefined)?.sign_in_provider;
    if (!decoded.uid || !email || decoded.email_verified !== true || !provider || !STAFF_IDENTITY_PROVIDERS.has(provider)) {
      this.audit('staff.session.denied', decoded.uid || 'unknown');
      throw unauthorized();
    }
    return decoded;
  }

  async listStaffOrganizations(decoded: DecodedIdToken) {
    if (process.env.NODE_ENV !== 'development' || process.env.DATABASE_IDENTITY_AUTH_ENABLED !== 'true') throw unauthorized();
    return this.databaseIdentity.listAvailableOrganizations(decoded);
  }

  me(principal: StaffPrincipal) {
    return { user: toSafeUser(principal, permissionsForRole(principal.role)) };
  }

  async logoutStaff(principal: StaffPrincipal): Promise<void> {
    await this.logoutStaffUid(principal.uid);
  }

  async logoutStaffUid(uid: string): Promise<void> {
    try {
      await this.firebase.auth.revokeRefreshTokens(uid);
      this.audit('staff.session.revoked', uid);
      const auditStored = await this.databaseIdentity.recordSessionRevocation(uid);
      if (!auditStored) this.audit('staff.session.revocation_audit_unavailable', uid);
    } catch {
      throw new ServiceUnavailableException({
        error: 'SESSION_REVOCATION_UNAVAILABLE',
        message: 'Session revocation is temporarily unavailable.',
      });
    }
  }

  async verifyToken(token: string): Promise<DecodedIdToken> {
    try {
      return await this.firebase.verifyIdToken(token, true);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw unauthorized();
    }
  }

  private audit(event: string, actorReference: string): void {
    const pseudonymousActor = createHash('sha256').update(actorReference).digest('hex').slice(0, 16);
    process.stdout.write(`${JSON.stringify({ level: 'info', category: 'security', event, actor: pseudonymousActor, at: new Date().toISOString() })}\n`);
  }
}

function unauthorized(): UnauthorizedException {
  return new UnauthorizedException({ error: 'UNAUTHORIZED', message: 'Authentication required.' });
}
