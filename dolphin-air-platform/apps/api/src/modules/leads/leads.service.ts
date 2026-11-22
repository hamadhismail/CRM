import { BadRequestException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import { StaffPrincipal } from '../auth/interfaces/authenticated-principal';
import { CreateLeadDto, UpdateLeadDto } from './dto/create-lead.dto';

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
      include: { notes: { orderBy: { createdAt: 'desc' } }, events: { orderBy: { occurredAt: 'desc' } } } });
    if (!lead) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Lead not found.' });
    return lead;
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
