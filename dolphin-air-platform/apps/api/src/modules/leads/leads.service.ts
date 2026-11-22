import { BadRequestException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import { StaffPrincipal } from '../auth/interfaces/authenticated-principal';
import { CreateLeadDto, UpdateLeadDto } from './dto/create-lead.dto';
import { LeadDuplicateCheckDto } from './dto/lead-operations.dto';

@Injectable()
export class LeadsService {
  constructor(private readonly database: PrismaService) {}

  private async scope(principal: StaffPrincipal) {
    // Live lead access is explicitly limited to the verified development identity path.
    if (process.env.NODE_ENV !== 'development' || process.env.DATABASE_IDENTITY_AUTH_ENABLED !== 'true'
      || principal.organizationIds.length !== 1) {
      throw new ServiceUnavailableException({ error: 'LEADS_UNAVAILABLE', message: 'Lead access is not available.' });
    }
    const organizationId = principal.organizationIds[0];
    const membership = await this.database.client.organizationMembership.findFirst({
      where: { organizationId, status: 'ACTIVE', user: { firebaseUid: principal.uid, status: 'ACTIVE', userType: 'INTERNAL_STAFF' }, organization: { status: 'ACTIVE', type: 'INTERNAL' } },
      select: { id: true },
    });
    if (!membership) throw new ForbiddenException({ error: 'FORBIDDEN', message: 'Organization access denied.' });
    return { organizationId, membershipId: membership.id };
  }

  async list(principal: StaffPrincipal, take: number, cursor?: string, state: 'active' | 'archived' = 'active') {
    const { organizationId, membershipId } = await this.scope(principal);
    const visible = { organizationId, archivedAt: state === 'active' ? null : { not: null }, OR: [
      { createdByMembershipId: membershipId }, { assignedMembershipId: membershipId },
    ] };
    if (cursor) {
      const ownedCursor = await this.database.client.lead.findFirst({ where: { ...visible, id: cursor }, select: { id: true } });
      if (!ownedCursor) throw new BadRequestException({ error: 'INVALID_CURSOR', message: 'Invalid pagination cursor.' });
    }
    const items = await this.database.client.lead.findMany({
      where: visible,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, organizationId: true, leadNumber: true, fullName: true, service: true, source: true,
        status: true, priority: true, assignedMembershipId: true, createdAt: true, archivedAt: true },
    });
    return { items: items.slice(0, take), nextCursor: items.length > take ? items[take - 1].id : null };
  }

  async create(principal: StaffPrincipal, body: CreateLeadDto) {
    const { organizationId, membershipId } = await this.scope(principal);
    const leadNumber = `LD-${randomUUID().replaceAll('-', '').slice(0, 20).toUpperCase()}`;
    return this.database.client.$transaction(async (tx) => {
      const activeMembership = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT m.id FROM organization_memberships m
        JOIN organizations o ON o.id = m.organization_id
        JOIN users u ON u.id = m.user_id
        WHERE m.id = ${membershipId}::uuid AND m.organization_id = ${organizationId}::uuid
          AND m.status = 'ACTIVE' AND o.status = 'ACTIVE' AND o.type = 'INTERNAL'
          AND u.status = 'ACTIVE' AND u.user_type = 'INTERNAL_STAFF'
        FOR SHARE OF m, o, u
      `;
      if (activeMembership.length !== 1) throw new ForbiddenException({ error: 'FORBIDDEN', message: 'Organization access denied.' });
      const lead = await tx.lead.create({ data: {
        organizationId, leadNumber, fullName: body.fullName.trim(), countryCode: body.countryCode,
        phoneNumber: body.phoneNumber, phoneNormalized: `${body.countryCode.slice(1)}${body.phoneNumber}`,
        email: body.email?.trim().toLowerCase(), emailNormalized: body.email?.trim().toLowerCase(),
        source: body.source.trim(), service: body.service, expectedPassengers: body.expectedPassengers,
        description: body.description?.trim(), createdByMembershipId: membershipId,
      } });
      await tx.leadEvent.create({ data: { leadId: lead.id, organizationId, actorMembershipId: membershipId, eventType: 'created' } });
      return { id: lead.id, leadNumber: lead.leadNumber };
    });
  }

  async detail(principal: StaffPrincipal, id: string) {
    const { organizationId, membershipId } = await this.scope(principal);
    const lead = await this.database.client.lead.findFirst({ where: { id, organizationId, archivedAt: null,
      OR: [{ createdByMembershipId: membershipId }, { assignedMembershipId: membershipId }] },
      include: {
        notes: { orderBy: { createdAt: 'desc' } },
        events: { orderBy: { occurredAt: 'desc' } },
        assignee: { select: { id: true, user: { select: { displayName: true, email: true } } } },
      } });
    if (!lead) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Lead not found.' });
    return lead;
  }

  async eligibleAssignees(principal: StaffPrincipal) {
    const { organizationId } = await this.scope(principal);
    const memberships = await this.database.client.organizationMembership.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
        organization: { status: 'ACTIVE', type: 'INTERNAL' },
        user: { status: 'ACTIVE', userType: 'INTERNAL_STAFF' },
        roleAssignments: {
          some: {
            status: 'ACTIVE',
            role: { permissions: { some: { permission: { code: 'leads.read' } } } },
          },
        },
      },
      orderBy: { user: { displayName: 'asc' } },
      select: { id: true, user: { select: { displayName: true, email: true } } },
    });
    return memberships.map(({ id, user }) => ({ membershipId: id, displayName: user.displayName, email: user.email }));
  }

  async assignmentHistory(principal: StaffPrincipal, id: string) {
    const { organizationId, membershipId } = await this.scope(principal);
    const visible = await this.database.client.lead.findFirst({
      where: { id, organizationId, OR: [{ createdByMembershipId: membershipId }, { assignedMembershipId: membershipId }] },
      select: { id: true },
    });
    if (!visible) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Lead not found.' });
    const history = await this.database.client.leadAssignmentHistory.findMany({
      where: { organizationId, leadId: id },
      orderBy: { assignedAt: 'desc' },
      take: 100,
      include: {
        previousAssignee: { select: { id: true, user: { select: { displayName: true } } } },
        assignee: { select: { id: true, user: { select: { displayName: true } } } },
        actor: { select: { id: true, user: { select: { displayName: true } } } },
      },
    });
    return history.map((entry) => ({
      id: entry.id,
      previousAssignee: entry.previousAssignee
        ? { membershipId: entry.previousAssignee.id, displayName: entry.previousAssignee.user.displayName }
        : null,
      assignee: { membershipId: entry.assignee.id, displayName: entry.assignee.user.displayName },
      actor: { membershipId: entry.actor.id, displayName: entry.actor.user.displayName },
      assignedAt: entry.assignedAt,
    }));
  }

  async assign(principal: StaffPrincipal, id: string, targetMembershipId: string) {
    const { organizationId, membershipId: actorMembershipId } = await this.scope(principal);
    return this.database.client.$transaction(async (tx) => {
      const lockedMemberships = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT m.id
        FROM organization_memberships m
        JOIN organizations o ON o.id = m.organization_id
        JOIN users u ON u.id = m.user_id
        WHERE m.id IN (${actorMembershipId}::uuid, ${targetMembershipId}::uuid)
          AND m.organization_id = ${organizationId}::uuid
          AND m.status = 'ACTIVE' AND o.status = 'ACTIVE' AND o.type = 'INTERNAL'
          AND u.status = 'ACTIVE' AND u.user_type = 'INTERNAL_STAFF'
        ORDER BY m.id
        FOR SHARE OF m, o, u
      `;
      const lockedIds = new Set(lockedMemberships.map(({ id: lockedId }) => lockedId));
      if (!lockedIds.has(actorMembershipId) || !lockedIds.has(targetMembershipId)) {
        throw new ForbiddenException({ error: 'INELIGIBLE_ASSIGNEE', message: 'Lead assignment is not available for that staff member.' });
      }

      const permission = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT ur.id
        FROM user_roles ur
        JOIN role_permissions rp ON rp.role_id = ur.role_id
        JOIN permissions p ON p.id = rp.permission_id
        WHERE ur.membership_id = ${targetMembershipId}::uuid
          AND ur.organization_id = ${organizationId}::uuid
          AND ur.status = 'ACTIVE' AND p.code = 'leads.read'
        LIMIT 1 FOR SHARE OF ur
      `;
      if (permission.length === 0) {
        throw new ForbiddenException({ error: 'INELIGIBLE_ASSIGNEE', message: 'Lead assignment is not available for that staff member.' });
      }

      const [lead] = await tx.$queryRaw<Array<{ id: string; assignedMembershipId: string | null }>>`
        SELECT id, assigned_membership_id AS "assignedMembershipId"
        FROM leads
        WHERE id = ${id}::uuid AND organization_id = ${organizationId}::uuid
          AND archived_at IS NULL
          AND (created_by_membership_id = ${actorMembershipId}::uuid
            OR assigned_membership_id = ${actorMembershipId}::uuid)
        FOR UPDATE
      `;
      if (!lead) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Lead not found.' });
      if (lead.assignedMembershipId === targetMembershipId) {
        return { id, assignedMembershipId: targetMembershipId, unchanged: true };
      }

      await tx.lead.update({ where: { id }, data: { assignedMembershipId: targetMembershipId, updatedByMembershipId: actorMembershipId } });
      const history = await tx.leadAssignmentHistory.create({ data: {
        leadId: id,
        organizationId,
        previousAssignedMembershipId: lead.assignedMembershipId,
        assignedMembershipId: targetMembershipId,
        actorMembershipId,
      } });
      await tx.leadEvent.create({ data: {
        leadId: id,
        organizationId,
        actorMembershipId,
        eventType: 'assigned',
        safeMetadata: { previousMembershipId: lead.assignedMembershipId, assignedMembershipId: targetMembershipId },
      } });
      return { id, assignedMembershipId: targetMembershipId, historyId: history.id, unchanged: false };
    });
  }

  async findDuplicates(principal: StaffPrincipal, input: LeadDuplicateCheckDto) {
    const { organizationId, membershipId } = await this.scope(principal);
    const emailNormalized = input.email?.trim().toLowerCase();
    const hasPhone = Boolean(input.countryCode && input.phoneNumber);
    if (Boolean(input.phoneNumber) !== Boolean(input.countryCode) || (!hasPhone && !emailNormalized)) {
      throw new BadRequestException({ error: 'INVALID_DUPLICATE_CHECK', message: 'Provide a complete phone number or an email address.' });
    }
    if (input.excludeLeadId) {
      const editable = await this.database.client.lead.findFirst({
        where: { id: input.excludeLeadId, organizationId, archivedAt: null,
          OR: [{ createdByMembershipId: membershipId }, { assignedMembershipId: membershipId }] },
        select: { id: true },
      });
      if (!editable) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Lead not found.' });
    }

    const conditions: Array<Record<string, string>> = [];
    const normalizedPhone = hasPhone ? `${input.countryCode!.slice(1)}${input.phoneNumber}` : undefined;
    if (normalizedPhone) conditions.push({ phoneNormalized: normalizedPhone });
    if (emailNormalized) conditions.push({ emailNormalized });
    const found = await this.database.client.lead.findMany({
      where: {
        organizationId,
        ...(input.excludeLeadId ? { id: { not: input.excludeLeadId } } : {}),
        AND: [
          { OR: [{ createdByMembershipId: membershipId }, { assignedMembershipId: membershipId }] },
          { OR: conditions },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: 6,
      select: { id: true, leadNumber: true, fullName: true, status: true, service: true, archivedAt: true, phoneNormalized: true, emailNormalized: true },
    });
    return {
      matches: found.slice(0, 5).map((lead) => ({
        id: lead.id,
        leadNumber: lead.leadNumber,
        fullName: lead.fullName,
        status: lead.status,
        service: lead.service,
        matchedBy: [
          ...(normalizedPhone && lead.phoneNormalized === normalizedPhone ? ['phone' as const] : []),
          ...(emailNormalized && lead.emailNormalized === emailNormalized ? ['email' as const] : []),
        ],
        archived: lead.archivedAt !== null,
      })),
      truncated: found.length > 5,
    };
  }

  async update(principal: StaffPrincipal, id: string, body: UpdateLeadDto) {
    const { organizationId, membershipId } = await this.scope(principal);
    const prior = await this.database.client.lead.findFirst({ where: { id, organizationId, archivedAt: null,
      OR: [{ createdByMembershipId: membershipId }, { assignedMembershipId: membershipId }] }, select: { id: true } });
    if (!prior) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Lead not found.' });
    return this.database.client.$transaction(async (tx) => {
      const updated = await tx.lead.update({ where: { id }, data: {
        ...body, fullName: body.fullName?.trim(), source: body.source?.trim(), email: body.email?.trim().toLowerCase(),
        emailNormalized: body.email?.trim().toLowerCase(), phoneNumber: body.phoneNumber,
        phoneNormalized: body.phoneNumber && body.countryCode ? `${body.countryCode.slice(1)}${body.phoneNumber}` : undefined,
        countryCode: body.countryCode, updatedByMembershipId: membershipId,
      } });
      await tx.leadEvent.create({ data: { leadId: id, organizationId, actorMembershipId: membershipId, eventType: 'updated' } });
      return { id: updated.id };
    });
  }

  async setStatus(principal: StaffPrincipal, id: string, status: string) {
    const { organizationId, membershipId } = await this.scope(principal);
    const allowed = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_PENDING', 'NEGOTIATION', 'WON', 'LOST'];
    if (!allowed.includes(status)) throw new BadRequestException({ error: 'INVALID_STATUS', message: 'Invalid lead status.' });
    const lead = await this.database.client.lead.findFirst({ where: { id, organizationId, archivedAt: null,
      OR: [{ createdByMembershipId: membershipId }, { assignedMembershipId: membershipId }] }, select: { status: true } });
    if (!lead) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Lead not found.' });
    await this.database.client.$transaction(async (tx) => {
      await tx.lead.update({ where: { id }, data: { status: status as never, updatedByMembershipId: membershipId } });
      await tx.leadEvent.create({ data: { leadId: id, organizationId, actorMembershipId: membershipId, eventType: 'status_changed', safeMetadata: { from: lead.status, to: status } } });
    });
    return { id, status };
  }

  async addNote(principal: StaffPrincipal, id: string, body: string) {
    const { organizationId, membershipId } = await this.scope(principal);
    const lead = await this.database.client.lead.findFirst({ where: { id, organizationId, archivedAt: null, OR: [{ createdByMembershipId: membershipId }, { assignedMembershipId: membershipId }] }, select: { id: true } });
    if (!lead) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Lead not found.' });
    return this.database.client.$transaction(async (tx) => {
      const note = await tx.leadNote.create({ data: { leadId: id, organizationId, authorMembershipId: membershipId, body: body.trim() } });
      await tx.leadEvent.create({ data: { leadId: id, organizationId, actorMembershipId: membershipId, eventType: 'note_added' } });
      return { id: note.id, createdAt: note.createdAt };
    });
  }

  async archive(principal: StaffPrincipal, id: string, restore = false) {
    const { organizationId, membershipId } = await this.scope(principal);
    const result = await this.database.client.$transaction(async (tx) => {
      const lead = await tx.lead.findFirst({ where: { id, organizationId, OR: [{ createdByMembershipId: membershipId }, { assignedMembershipId: membershipId }] }, select: { id: true, archivedAt: true } });
      if (!lead || (restore ? !lead.archivedAt : Boolean(lead.archivedAt))) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Lead not found.' });
      await tx.lead.update({ where: { id }, data: { archivedAt: restore ? null : new Date(), updatedByMembershipId: membershipId } });
      await tx.leadEvent.create({ data: { leadId: id, organizationId, actorMembershipId: membershipId, eventType: restore ? 'restored' : 'archived' } });
      return { id, archived: !restore };
    });
    return result;
  }
}
