import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { FirebaseAdminService } from '../../infrastructure/firebase/firebase-admin.service';
import { canAssignRole, canManageUserInScope, hasPermission, permissionsForRole } from '../auth/authentication.policy';
import { StaffPrincipal, UserRecord, isInternalRole, toSafeUser, toStaffPrincipal } from '../auth/interfaces/authenticated-principal';

@Injectable()
export class UsersService {
  constructor(private readonly firebase: FirebaseAdminService) {}

  async list(actor: StaffPrincipal) {
    try {
      const snapshot = await this.firebase.firestore.collection('users').get();
      const users = snapshot.docs.flatMap((doc) => {
        const record = doc.data() as UserRecord;
        const orgIds = stringList(record.organizationIds);
        if (!canManageUserInScope(actor, orgIds)) return [];
        const view = toUserView(doc.id, record);
        return view ? [view] : [];
      });
      return { users };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException({ error: 'USER_DIRECTORY_UNAVAILABLE', message: 'User directory is temporarily unavailable.' });
    }
  }

  async updateRole(uid: string, roleValue: unknown, actor: StaffPrincipal) {
    if (!isInternalRole(roleValue)) {
      throw new BadRequestException({ error: 'INVALID_ROLE', message: 'Choose a supported internal role.' });
    }
    if (!canAssignRole(actor, roleValue)) {
      throw new ForbiddenException({ error: 'ROLE_ASSIGNMENT_DENIED', message: 'You cannot assign that role.' });
    }
    const target = await this.findTarget(uid);
    this.assertManagementScope(actor, target.record);
    if (target.uid === actor.uid) {
      throw new ForbiddenException({ error: 'SELF_ROLE_CHANGE', message: 'You cannot change your own role.' });
    }
    if (target.record.role === 'super_admin' && actor.role !== 'super_admin') {
      throw new ForbiddenException({ error: 'PRIVILEGED_ACCOUNT', message: 'This account requires Super Admin access to manage.' });
    }
    await this.firebase.firestore.runTransaction(async (transaction) => {
      const currentSnapshot = await transaction.get(target.reference);
      const currentRecord = currentSnapshot.data() as UserRecord | undefined;
      if (!currentSnapshot.exists || !currentRecord || !toUserView(target.uid, currentRecord)) {
        throw new ConflictException({ error: 'USER_CHANGED', message: 'The account changed; refresh and try again.' });
      }
      this.assertManagementScope(actor, currentRecord);
      if ((currentRecord.role === 'super_admin' || currentRecord.role === 'admin') && actor.role !== 'super_admin') {
        throw new ForbiddenException({ error: 'PRIVILEGED_ACCOUNT', message: 'This account requires Super Admin access to manage.' });
      }
      if (currentRecord.role === 'super_admin' && roleValue !== 'super_admin') {
        const activeAdmins = await transaction.get(this.firebase.firestore.collection('users')
          .where('role', '==', 'super_admin').where('active', '==', true));
        if (activeAdmins.size <= 1) {
          throw new ConflictException({ error: 'LAST_SUPER_ADMIN', message: 'At least one active Super Admin must remain.' });
        }
      }
      transaction.update(target.reference, { role: roleValue });
    });
    return toUserView(target.uid, { ...target.record, role: roleValue });
  }

  async updateStatus(uid: string, activeValue: unknown, actor: StaffPrincipal) {
    if (typeof activeValue !== 'boolean') {
      throw new BadRequestException({ error: 'INVALID_STATUS', message: 'Active status must be true or false.' });
    }
    const target = await this.findTarget(uid);
    this.assertManagementScope(actor, target.record);
    if (!activeValue && target.uid === actor.uid) {
      throw new ForbiddenException({ error: 'SELF_DISABLE', message: 'You cannot disable your own account.' });
    }
    if (!activeValue && !hasPermission(actor, 'identity.users.disable')) {
      throw new ForbiddenException({ error: 'USER_DISABLE_DENIED', message: 'You cannot disable this account.' });
    }
    await this.firebase.firestore.runTransaction(async (transaction) => {
      const currentSnapshot = await transaction.get(target.reference);
      const currentRecord = currentSnapshot.data() as UserRecord | undefined;
      if (!currentSnapshot.exists || !currentRecord || !toUserView(target.uid, currentRecord)) {
        throw new ConflictException({ error: 'USER_CHANGED', message: 'The account changed; refresh and try again.' });
      }
      this.assertManagementScope(actor, currentRecord);
      if (!activeValue && currentRecord.role === 'super_admin') {
        if (actor.role !== 'super_admin') {
          throw new ForbiddenException({ error: 'PRIVILEGED_ACCOUNT', message: 'This account requires Super Admin access to manage.' });
        }
        const activeAdmins = await transaction.get(this.firebase.firestore.collection('users')
          .where('role', '==', 'super_admin').where('active', '==', true));
        if (activeAdmins.size <= 1) {
          throw new ConflictException({ error: 'LAST_SUPER_ADMIN', message: 'At least one active Super Admin must remain.' });
        }
      }
      transaction.update(target.reference, { active: activeValue });
    });
    return toUserView(target.uid, { ...target.record, active: activeValue });
  }

  private assertManagementScope(actor: StaffPrincipal, target: UserRecord): void {
    if (!canManageUserInScope(actor, stringList(target.organizationIds))) {
      throw new ForbiddenException({ error: 'ORGANIZATION_SCOPE_DENIED', message: 'This account is outside your organization scope.' });
    }
  }

  private async findTarget(uidValue: string) {
    const uid = uidValue.trim();
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid)) {
      throw new BadRequestException({ error: 'INVALID_USER_ID', message: 'A valid user ID is required.' });
    }
    const reference = this.firebase.firestore.collection('users').doc(uid);
    const snapshot = await reference.get();
    if (!snapshot.exists) throw new NotFoundException({ error: 'USER_NOT_FOUND', message: 'User was not found.' });
    const record = snapshot.data() as UserRecord;
    if (!toUserView(uid, record)) throw new BadRequestException({ error: 'INVALID_USER_RECORD', message: 'The user record is invalid.' });
    return { uid, reference, record };
  }
}

function toUserView(uid: string, record: UserRecord) {
  if (typeof record.email !== 'string' || typeof record.active !== 'boolean' || !isInternalRole(record.role)) return null;
  const principal = toStaffPrincipal(uid, { ...record, active: true }, record.email);
  if (!principal) return null;
  return { ...toSafeUser(principal, permissionsForRole(principal.role)), active: record.active };
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0))];
}
