import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { StaffPrincipal } from '../auth/interfaces/authenticated-principal';
import { CreateCustomerDto, CustomerContactDto, CustomerDuplicateCheckDto, CustomerLeadConversionDto, CustomerListQueryDto, UpdateCustomerDto } from './dto/customers.dto';

type Scope = { organizationId: string; membershipId: string };
type DuplicateMatch = { id: string; customerNumber: string; displayName: string; legalName: string | null; type: string; matchedBy: string[] };

@Injectable()
export class CustomersService {
  constructor(private readonly database: PrismaService) {}

  private async scope(principal: StaffPrincipal): Promise<Scope> {
    if (process.env.NODE_ENV !== 'development' || process.env.DATABASE_IDENTITY_AUTH_ENABLED !== 'true'
      || principal.organizationIds.length !== 1) {
      throw new ServiceUnavailableException({ error: 'CUSTOMERS_UNAVAILABLE', message: 'Customer access is not available.' });
    }
    const organizationId = principal.organizationIds[0];
    const membership = await this.database.client.organizationMembership.findFirst({
      where: { organizationId, status: 'ACTIVE', user: { firebaseUid: principal.uid, status: 'ACTIVE', userType: 'INTERNAL_STAFF' }, organization: { status: 'ACTIVE', type: 'INTERNAL' } },
      select: { id: true },
    });
    if (!membership) throw new ForbiddenException({ error: 'FORBIDDEN', message: 'Organization access denied.' });
    return { organizationId, membershipId: membership.id };
  }

  private recordVisibility(principal: StaffPrincipal, scope: Scope): Prisma.CustomerWhereInput {
    const own = { OR: [{ ownerMembershipId: scope.membershipId }, { createdByMembershipId: scope.membershipId }] } satisfies Prisma.CustomerWhereInput;
    return {
      organizationId: scope.organizationId,
      ...(principal.role === 'sales' ? { AND: [own] } : {}),
    };
  }

  async list(principal: StaffPrincipal, query: CustomerListQueryDto) {
    const scope = await this.scope(principal);
    const visible = this.recordVisibility(principal, scope);
    const archivedAt: Prisma.CustomerWhereInput['archivedAt'] = query.state === 'archived' ? { not: null } : null;
    const where: Prisma.CustomerWhereInput = {
      ...visible,
      archivedAt,
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search?.trim() ? { OR: [
        { customerNumber: { contains: query.search.trim(), mode: 'insensitive' } },
        { displayName: { contains: query.search.trim(), mode: 'insensitive' } },
        { legalName: { contains: query.search.trim(), mode: 'insensitive' } },
        { primaryPhone: { contains: query.search.trim() } },
        { emailNormalized: { contains: query.search.trim().toLowerCase() } },
      ] } : {}),
    };
    if (query.cursor) {
      const cursor = await this.database.client.customer.findFirst({ where: { ...where, id: query.cursor }, select: { id: true } });
      if (!cursor) throw new BadRequestException({ error: 'INVALID_CURSOR', message: 'Invalid pagination cursor.' });
    }
    const rows = await this.database.client.customer.findMany({
      where,
      orderBy: [{ [query.sort]: query.order }, { id: 'asc' }],
      take: query.take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: { owner: { include: { user: { select: { displayName: true } } } } },
    });
    return {
      items: rows.slice(0, query.take).map((row) => this.toSummary(row)),
      nextCursor: rows.length > query.take ? rows[query.take - 1].id : null,
    };
  }

  async summary(principal: StaffPrincipal) {
    const scope = await this.scope(principal);
    const where = { ...this.recordVisibility(principal, scope), archivedAt: null };
    const [total, active, individual, business] = await Promise.all([
      this.database.client.customer.count({ where }),
      this.database.client.customer.count({ where: { ...where, status: 'ACTIVE' } }),
      this.database.client.customer.count({ where: { ...where, type: 'INDIVIDUAL' } }),
      this.database.client.customer.count({ where: { ...where, type: 'BUSINESS' } }),
    ]);
    return { total, active, individual, business };
  }

  async detail(principal: StaffPrincipal, id: string) {
    const scope = await this.scope(principal);
    const customer = await this.database.client.customer.findFirst({
      where: { ...this.recordVisibility(principal, scope), id },
      include: {
        owner: { include: { user: { select: { displayName: true, email: true } } } },
        contacts: { where: { archivedAt: null }, orderBy: [{ isPrimary: 'desc' }, { fullName: 'asc' }] },
        activities: { orderBy: { occurredAt: 'desc' }, take: 100, include: { actor: { include: { user: { select: { displayName: true } } } } } },
        leadLinks: { orderBy: { linkedAt: 'desc' }, include: { lead: { select: { id: true, leadNumber: true, fullName: true, status: true, service: true, createdAt: true } } } },
      },
    });
    if (!customer) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Customer not found.' });
    return customer;
  }

  async listActivities(principal: StaffPrincipal, id: string) {
    const scope = await this.scope(principal);
    const visible = await this.database.client.customer.findFirst({ where: { ...this.recordVisibility(principal, scope), id }, select: { id: true } });
    if (!visible) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Customer not found.' });
    return this.database.client.customerActivity.findMany({
      where: { organizationId: scope.organizationId, customerId: id }, orderBy: { occurredAt: 'desc' }, take: 100,
      include: { actor: { include: { user: { select: { displayName: true } } } } },
    });
  }

  async create(principal: StaffPrincipal, dto: CreateCustomerDto) {
    const scope = await this.scope(principal);
    if (dto.type === 'BUSINESS' && !dto.legalName?.trim()) throw new BadRequestException({ error: 'LEGAL_NAME_REQUIRED', message: 'Business customers require a legal name.' });
    if (Boolean(dto.primaryCountryCode) !== Boolean(dto.primaryPhone)) throw new BadRequestException({ error: 'INVALID_PHONE', message: 'Country code and phone must be supplied together.' });
    const ownerMembershipId = dto.ownerMembershipId ?? scope.membershipId;
    if (principal.role === 'sales' && ownerMembershipId !== scope.membershipId) throw new ForbiddenException({ error: 'FORBIDDEN', message: 'Sales users cannot transfer customer ownership.' });
    return this.database.client.$transaction(async (tx) => {
      await this.lockActiveMemberships(tx, scope, [scope.membershipId, ownerMembershipId]);
      await this.assertEligibleOwner(tx, scope.organizationId, ownerMembershipId);
      const matches = await this.customerDuplicates(tx, principal, scope, {
        countryCode: dto.primaryCountryCode, phoneNumber: dto.primaryPhone, email: dto.email,
        businessName: dto.type === 'BUSINESS' ? dto.legalName : undefined,
      });
      if (matches.length && !dto.confirmDuplicates) {
        throw new ConflictException({ error: 'CUSTOMER_DUPLICATES', message: 'Possible matching customers need review.', matches });
      }
      const customer = await tx.customer.create({ data: {
        organizationId: scope.organizationId,
        customerNumber: this.customerNumber(),
        type: dto.type,
        displayName: dto.displayName.trim(),
        legalName: dto.legalName?.trim() || null,
        primaryCountryCode: dto.primaryCountryCode ?? null,
        primaryPhone: dto.primaryPhone ?? null,
        phoneNormalized: normalizePhone(dto.primaryCountryCode, dto.primaryPhone),
        email: normalizeEmail(dto.email),
        emailNormalized: normalizeEmail(dto.email),
        preferredLanguage: dto.preferredLanguage?.trim() || null,
        country: dto.country?.trim() || null,
        city: dto.city?.trim() || null,
        status: dto.status ?? 'ACTIVE',
        ownerMembershipId,
        createdByMembershipId: scope.membershipId,
      } });
      await tx.customerActivity.create({ data: {
        organizationId: scope.organizationId, customerId: customer.id, actorMembershipId: scope.membershipId,
        eventType: 'CREATED', safeMetadata: { customerType: dto.type },
      } });
      return { id: customer.id, customerNumber: customer.customerNumber };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async update(principal: StaffPrincipal, id: string, dto: UpdateCustomerDto) {
    const scope = await this.scope(principal);
    return this.database.client.$transaction(async (tx) => {
      const prior = await tx.customer.findFirst({ where: { ...this.recordVisibility(principal, scope), id, archivedAt: null }, select: { type: true, legalName: true, primaryCountryCode: true, primaryPhone: true, email: true } });
      if (!prior) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Customer not found.' });
      const type = dto.type ?? prior.type;
      const legalName = dto.legalName === undefined ? prior.legalName : dto.legalName?.trim() || null;
      if (type === 'BUSINESS' && !legalName) throw new BadRequestException({ error: 'LEGAL_NAME_REQUIRED', message: 'Business customers require a legal name.' });
      const countryCode = dto.primaryCountryCode === undefined ? prior.primaryCountryCode : dto.primaryCountryCode;
      const phone = dto.primaryPhone === undefined ? prior.primaryPhone : dto.primaryPhone;
      if ((countryCode === null) !== (phone === null)) throw new BadRequestException({ error: 'INVALID_PHONE', message: 'Country code and phone must be supplied or cleared together.' });
      const email = dto.email === undefined ? prior.email : dto.email;
      const matches = await this.customerDuplicates(tx, principal, scope, {
        countryCode: countryCode ?? undefined, phoneNumber: phone ?? undefined, email: email ?? undefined,
        businessName: type === 'BUSINESS' ? legalName ?? undefined : undefined, excludeCustomerId: id,
      });
      if (matches.length && !dto.confirmDuplicates) throw new ConflictException({ error: 'CUSTOMER_DUPLICATES', message: 'Possible matching customers need review.', matches });
      const ownerMembershipId = dto.ownerMembershipId;
      if (ownerMembershipId) {
        if (principal.role === 'sales' && ownerMembershipId !== scope.membershipId) throw new ForbiddenException({ error: 'FORBIDDEN', message: 'Sales users cannot transfer customer ownership.' });
        await this.lockActiveMemberships(tx, scope, [scope.membershipId, ownerMembershipId]);
        await this.assertEligibleOwner(tx, scope.organizationId, ownerMembershipId);
      }
      const data: Prisma.CustomerUpdateInput = {
        ...(dto.type ? { type: dto.type } : {}),
        ...(dto.displayName !== undefined ? { displayName: dto.displayName.trim() } : {}),
        ...(dto.legalName !== undefined ? { legalName } : {}),
        ...(dto.primaryCountryCode !== undefined ? { primaryCountryCode: countryCode } : {}),
        ...(dto.primaryPhone !== undefined ? { primaryPhone: phone, phoneNormalized: normalizePhone(countryCode ?? undefined, phone ?? undefined) } : {}),
        ...(dto.email !== undefined ? { email: normalizeEmail(email ?? undefined), emailNormalized: normalizeEmail(email ?? undefined) } : {}),
        ...(dto.preferredLanguage !== undefined ? { preferredLanguage: dto.preferredLanguage?.trim() || null } : {}),
        ...(dto.country !== undefined ? { country: dto.country?.trim() || null } : {}),
        ...(dto.city !== undefined ? { city: dto.city?.trim() || null } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(ownerMembershipId ? { owner: { connect: { id_organizationId: { id: ownerMembershipId, organizationId: scope.organizationId } } } } : {}),
        updater: { connect: { id_organizationId: { id: scope.membershipId, organizationId: scope.organizationId } } },
      };
      await tx.customer.update({ where: { id_organizationId: { id, organizationId: scope.organizationId } }, data });
      await tx.customerActivity.create({ data: {
        organizationId: scope.organizationId, customerId: id, actorMembershipId: scope.membershipId,
        eventType: 'UPDATED', safeMetadata: { changedFields: Object.keys(dto).filter((key) => key !== 'confirmDuplicates') },
      } });
      return { id };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async archive(principal: StaffPrincipal, id: string, restore = false) {
    const scope = await this.scope(principal);
    return this.database.client.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({ where: { ...this.recordVisibility(principal, scope), id }, select: { id: true, archivedAt: true } });
      if (!customer || (restore ? !customer.archivedAt : Boolean(customer.archivedAt))) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Customer not found.' });
      await tx.customer.update({ where: { id_organizationId: { id, organizationId: scope.organizationId } }, data: { archivedAt: restore ? null : new Date(), updatedByMembershipId: scope.membershipId } });
      await tx.customerActivity.create({ data: {
        organizationId: scope.organizationId, customerId: id, actorMembershipId: scope.membershipId,
        eventType: restore ? 'RESTORED' : 'ARCHIVED',
      } });
      return { id, archived: !restore };
    });
  }

  async contacts(principal: StaffPrincipal, customerId: string) {
    const { organizationId } = await this.visibleCustomer(principal, customerId, true);
    return this.database.client.customerContact.findMany({ where: { organizationId, customerId, archivedAt: null }, orderBy: [{ isPrimary: 'desc' }, { fullName: 'asc' }] });
  }

  async listContacts(principal: StaffPrincipal, query: CustomerListQueryDto) {
    const scope = await this.scope(principal);
    const where: Prisma.CustomerContactWhereInput = {
      organizationId: scope.organizationId,
      archivedAt: null,
      ...(principal.role === 'sales' ? { customer: { OR: [{ ownerMembershipId: scope.membershipId }, { createdByMembershipId: scope.membershipId }] } } : {}),
      ...(query.search?.trim() ? { OR: [
        { fullName: { contains: query.search.trim(), mode: 'insensitive' } },
        { emailNormalized: { contains: query.search.trim().toLowerCase() } },
        { phoneNumber: { contains: query.search.trim() } },
        { customer: { displayName: { contains: query.search.trim(), mode: 'insensitive' } } },
      ] } : {}),
    };
    if (query.cursor) {
      const cursor = await this.database.client.customerContact.findFirst({ where: { ...where, id: query.cursor }, select: { id: true } });
      if (!cursor) throw new BadRequestException({ error: 'INVALID_CURSOR', message: 'Invalid pagination cursor.' });
    }
    const rows = await this.database.client.customerContact.findMany({
      where, orderBy: [{ fullName: query.order }, { id: 'asc' }], take: query.take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: { customer: { select: { id: true, customerNumber: true, displayName: true, type: true } } },
    });
    return { items: rows.slice(0, query.take), nextCursor: rows.length > query.take ? rows[query.take - 1].id : null };
  }

  async addContact(principal: StaffPrincipal, customerId: string, dto: CustomerContactDto) {
    const scope = await this.visibleCustomer(principal, customerId, true);
    validateContact(dto);
    return this.database.client.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM customers WHERE id = ${customerId}::uuid AND organization_id = ${scope.organizationId}::uuid AND archived_at IS NULL FOR UPDATE`;
      if (dto.isPrimary) await tx.customerContact.updateMany({ where: { organizationId: scope.organizationId, customerId, isPrimary: true, archivedAt: null }, data: { isPrimary: false } });
      const contact = await tx.customerContact.create({ data: {
        organizationId: scope.organizationId, customerId, fullName: dto.fullName.trim(), designation: dto.designation?.trim() || null,
        countryCode: dto.countryCode ?? null, phoneNumber: dto.phoneNumber ?? null, phoneNormalized: normalizePhone(dto.countryCode, dto.phoneNumber),
        email: normalizeEmail(dto.email), emailNormalized: normalizeEmail(dto.email), preferredMethod: dto.preferredMethod ?? null,
        isPrimary: dto.isPrimary ?? false, createdByMembershipId: scope.membershipId,
      } });
      if (contact.isPrimary) await tx.customer.update({ where: { id_organizationId: { id: customerId, organizationId: scope.organizationId } }, data: {
        primaryCountryCode: contact.countryCode, primaryPhone: contact.phoneNumber, phoneNormalized: contact.phoneNormalized,
        email: contact.email, emailNormalized: contact.emailNormalized,
        updatedByMembershipId: scope.membershipId,
      } });
      await tx.customerActivity.create({ data: { organizationId: scope.organizationId, customerId, actorMembershipId: scope.membershipId, eventType: 'CONTACT_ADDED', safeMetadata: { isPrimary: contact.isPrimary } } });
      return { id: contact.id };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async updateContact(principal: StaffPrincipal, customerId: string, contactId: string, dto: CustomerContactDto) {
    const scope = await this.visibleCustomer(principal, customerId, true);
    validateContact(dto);
    return this.database.client.$transaction(async (tx) => {
      const old = await tx.customerContact.findFirst({ where: { id: contactId, organizationId: scope.organizationId, customerId, archivedAt: null } });
      if (!old) throw new NotFoundException({ error: 'CONTACT_NOT_FOUND', message: 'Contact not found.' });
      await tx.$queryRaw`SELECT id FROM customers WHERE id = ${customerId}::uuid AND organization_id = ${scope.organizationId}::uuid FOR UPDATE`;
      if (dto.isPrimary) await tx.customerContact.updateMany({ where: { organizationId: scope.organizationId, customerId, isPrimary: true, archivedAt: null, id: { not: contactId } }, data: { isPrimary: false } });
      const contact = await tx.customerContact.update({ where: { id_organizationId: { id: contactId, organizationId: scope.organizationId } }, data: {
        fullName: dto.fullName.trim(), designation: dto.designation?.trim() || null,
        countryCode: dto.countryCode ?? null, phoneNumber: dto.phoneNumber ?? null, phoneNormalized: normalizePhone(dto.countryCode, dto.phoneNumber),
        email: normalizeEmail(dto.email), emailNormalized: normalizeEmail(dto.email), preferredMethod: dto.preferredMethod ?? null,
        isPrimary: dto.isPrimary ?? false, updatedByMembershipId: scope.membershipId,
      } });
      if (contact.isPrimary || old.isPrimary) await tx.customer.update({ where: { id_organizationId: { id: customerId, organizationId: scope.organizationId } }, data: {
        primaryCountryCode: contact.isPrimary ? contact.countryCode : null,
        primaryPhone: contact.isPrimary ? contact.phoneNumber : null,
        phoneNormalized: contact.isPrimary ? contact.phoneNormalized : null,
        email: contact.isPrimary ? contact.email : null,
        emailNormalized: contact.isPrimary ? contact.emailNormalized : null,
        updatedByMembershipId: scope.membershipId,
      } });
      await tx.customerActivity.create({ data: { organizationId: scope.organizationId, customerId, actorMembershipId: scope.membershipId, eventType: 'CONTACT_UPDATED', safeMetadata: { isPrimary: contact.isPrimary } } });
      return { id: contact.id };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async customerLeads(principal: StaffPrincipal, customerId: string) {
    const scope = await this.visibleCustomer(principal, customerId, false);
    const links = await this.database.client.customerLeadLink.findMany({
      where: { organizationId: scope.organizationId, customerId }, orderBy: { linkedAt: 'desc' },
      include: { lead: { select: { id: true, leadNumber: true, fullName: true, status: true, service: true, createdAt: true, archivedAt: true } } },
    });
    return links.map(({ lead, linkType, linkedAt }) => ({ ...lead, linkType, linkedAt }));
  }

  async duplicates(principal: StaffPrincipal, dto: CustomerDuplicateCheckDto) {
    const scope = await this.scope(principal);
    return { matches: await this.customerDuplicates(this.database.client, principal, scope, dto) };
  }

  async leadConversionPreview(principal: StaffPrincipal, leadId: string) {
    const scope = await this.scope(principal);
    const lead = await this.visibleLead(principal, scope, leadId);
    const blockers: string[] = [];
    if (lead.archivedAt) blockers.push('LEAD_ARCHIVED');
    if (lead.status !== 'WON') blockers.push('LEAD_NOT_WON');
    const existingLink = await this.database.client.customerLeadLink.findUnique({ where: { organizationId_leadId: { organizationId: scope.organizationId, leadId } }, include: { customer: { select: { id: true, customerNumber: true, displayName: true } } } });
    if (existingLink) blockers.push('CUSTOMER_ALREADY_LINKED');
    const matches = await this.customerDuplicates(this.database.client, principal, scope, {
      countryCode: lead.countryCode, phoneNumber: lead.phoneNumber, email: lead.email ?? undefined,
    });
    return { leadId, eligible: blockers.length === 0, blockers, matches, existingLink: existingLink ? { id: existingLink.customer.id, customerNumber: existingLink.customer.customerNumber, displayName: existingLink.customer.displayName } : null };
  }

  async convertLead(principal: StaffPrincipal, leadId: string, dto: CustomerLeadConversionDto) {
    const scope = await this.scope(principal);
    if ((dto.mode === 'LINK') !== Boolean(dto.customerId)) throw new BadRequestException({ error: 'INVALID_CONVERSION', message: 'Link mode requires a customer ID; create mode must not supply one.' });
    try {
      return await this.database.client.$transaction(async (tx) => {
        const priorKey = await tx.customerLeadLink.findUnique({ where: { organizationId_idempotencyKey: { organizationId: scope.organizationId, idempotencyKey: dto.idempotencyKey } }, include: { customer: { select: { id: true, customerNumber: true } } } });
        if (priorKey) {
          if (priorKey.leadId !== leadId || (dto.customerId && dto.customerId !== priorKey.customerId)) throw new ConflictException({ error: 'IDEMPOTENCY_KEY_REUSED', message: 'This idempotency key belongs to a different conversion.' });
          return conversionResult(priorKey, true);
        }
        await this.lockActiveMemberships(tx, scope, [scope.membershipId]);
        const lead = await this.visibleLeadForUpdate(principal, tx, scope, leadId);
        const linked = await tx.customerLeadLink.findUnique({ where: { organizationId_leadId: { organizationId: scope.organizationId, leadId } }, include: { customer: { select: { id: true, customerNumber: true } } } });
        if (linked) {
          if (dto.mode === 'CREATE' || dto.customerId === linked.customerId) return conversionResult(linked, true);
          throw new ConflictException({ error: 'LEAD_ALREADY_LINKED', message: 'This lead is already linked to another customer.' });
        }
        if (lead.archivedAt) throw new ConflictException({ error: 'LEAD_ARCHIVED', message: 'Archived leads cannot be converted.' });
        if (lead.status !== 'WON') throw new ConflictException({ error: 'LEAD_NOT_WON', message: 'Only won leads are eligible for customer conversion.' });

        let customerId: string;
        let customerNumber: string;
        let linkType: 'CONVERTED' | 'LINKED';
        if (dto.mode === 'LINK') {
          const target = await tx.customer.findFirst({ where: { ...this.recordVisibility(principal, scope), id: dto.customerId, archivedAt: null, status: 'ACTIVE' }, select: { id: true, customerNumber: true } });
          if (!target) throw new NotFoundException({ error: 'CUSTOMER_NOT_FOUND', message: 'Eligible customer not found.' });
          customerId = target.id; customerNumber = target.customerNumber; linkType = 'LINKED';
        } else {
          const matches = await this.customerDuplicates(tx, principal, scope, { countryCode: lead.countryCode, phoneNumber: lead.phoneNumber, email: lead.email ?? undefined });
          if (matches.length && !dto.allowDuplicate) throw new ConflictException({ error: 'CUSTOMER_DUPLICATES', message: 'Review matching customers before creating a new profile.', matches });
          const customer = await tx.customer.create({ data: {
            organizationId: scope.organizationId, customerNumber: this.customerNumber(), type: 'INDIVIDUAL',
            displayName: lead.fullName, primaryCountryCode: lead.countryCode, primaryPhone: lead.phoneNumber,
            phoneNormalized: normalizePhone(lead.countryCode, lead.phoneNumber), email: normalizeEmail(lead.email ?? undefined),
            emailNormalized: normalizeEmail(lead.email ?? undefined), status: 'ACTIVE', ownerMembershipId: scope.membershipId,
            createdByMembershipId: scope.membershipId,
          } });
          customerId = customer.id; customerNumber = customer.customerNumber; linkType = 'CONVERTED';
          await tx.customerActivity.create({ data: {
            organizationId: scope.organizationId, customerId, actorMembershipId: scope.membershipId,
            eventType: 'LEAD_CONVERTED', safeMetadata: { sourceLeadId: lead.id },
          } });
        }
        const link = await tx.customerLeadLink.create({ data: {
          organizationId: scope.organizationId, customerId, leadId, actorMembershipId: scope.membershipId,
          linkType, idempotencyKey: dto.idempotencyKey,
        }, include: { customer: { select: { id: true, customerNumber: true } } } });
        if (linkType === 'LINKED') await tx.customerActivity.create({ data: {
          organizationId: scope.organizationId, customerId, actorMembershipId: scope.membershipId,
          eventType: 'LEAD_LINKED', safeMetadata: { sourceLeadId: leadId },
        } });
        return conversionResult({ ...link, customer: { id: customerId, customerNumber } }, false);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (isPrismaConflict(error)) {
        const winner = await this.database.client.customerLeadLink.findUnique({ where: { organizationId_leadId: { organizationId: scope.organizationId, leadId } }, include: { customer: { select: { id: true, customerNumber: true } } } });
        if (winner && (dto.mode === 'CREATE' || dto.customerId === winner.customerId)) return conversionResult(winner, true);
        if (winner) throw new ConflictException({ error: 'LEAD_ALREADY_LINKED', message: 'This lead was converted by another request.' });
      }
      throw error;
    }
  }

  private async visibleCustomer(principal: StaffPrincipal, id: string, requireActive: boolean) {
    const scope = await this.scope(principal);
    const found = await this.database.client.customer.findFirst({ where: {
      ...this.recordVisibility(principal, scope), id,
      ...(requireActive ? { archivedAt: null } : {}),
    }, select: { id: true } });
    if (!found) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Customer not found.' });
    return scope;
  }

  private async customerDuplicates(client: Prisma.TransactionClient | PrismaService['client'], principal: StaffPrincipal, scope: Scope, input: CustomerDuplicateCheckDto) {
    const normalizedPhone = normalizePhone(input.countryCode, input.phoneNumber);
    const normalizedEmail = normalizeEmail(input.email);
    const businessName = input.businessName?.trim();
    if (!normalizedPhone && !normalizedEmail && !businessName) return [];
    if (input.excludeCustomerId) {
      const visible = await client.customer.findFirst({ where: { ...this.recordVisibility(principal, scope), id: input.excludeCustomerId }, select: { id: true } });
      if (!visible) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Customer not found.' });
    }
    const conditions: Prisma.CustomerWhereInput[] = [];
    if (normalizedPhone) conditions.push({ phoneNormalized: normalizedPhone }, { contacts: { some: { phoneNormalized: normalizedPhone, archivedAt: null } } });
    if (normalizedEmail) conditions.push({ emailNormalized: normalizedEmail }, { contacts: { some: { emailNormalized: normalizedEmail, archivedAt: null } } });
    if (businessName) conditions.push({ type: 'BUSINESS', legalName: { equals: businessName, mode: 'insensitive' } });
    const rows = await client.customer.findMany({
      where: {
        ...this.recordVisibility(principal, scope), archivedAt: null,
        ...(input.excludeCustomerId ? { id: { not: input.excludeCustomerId } } : {}),
        OR: conditions,
      }, take: 6, orderBy: { updatedAt: 'desc' },
      include: { contacts: { where: { archivedAt: null }, select: { phoneNormalized: true, emailNormalized: true } } },
    });
    return rows.slice(0, 5).map((row): DuplicateMatch => ({
      id: row.id, customerNumber: row.customerNumber, displayName: row.displayName, legalName: row.legalName, type: row.type,
      matchedBy: [
        ...(normalizedPhone && (row.phoneNormalized === normalizedPhone || row.contacts.some((contact) => contact.phoneNormalized === normalizedPhone)) ? ['phone'] : []),
        ...(normalizedEmail && (row.emailNormalized === normalizedEmail || row.contacts.some((contact) => contact.emailNormalized === normalizedEmail)) ? ['email'] : []),
        ...(businessName && row.type === 'BUSINESS' && row.legalName?.toLocaleLowerCase() === businessName.toLocaleLowerCase() ? ['businessName'] : []),
      ],
    }));
  }

  private async visibleLead(principal: StaffPrincipal, scope: Scope, leadId: string) {
    const lead = await this.database.client.lead.findFirst({ where: leadVisibility(principal, scope, leadId), select: { id: true, status: true, archivedAt: true, fullName: true, countryCode: true, phoneNumber: true, email: true } });
    if (!lead) throw new NotFoundException({ error: 'LEAD_NOT_FOUND', message: 'Lead not found.' });
    return lead;
  }

  private async visibleLeadForUpdate(principal: StaffPrincipal, tx: Prisma.TransactionClient, scope: Scope, leadId: string) {
    const [lead] = await tx.$queryRaw<Array<{ id: string; status: string; archivedAt: Date | null; fullName: string; countryCode: string; phoneNumber: string; email: string | null }>>`
      SELECT l.id, l.status, l.archived_at AS "archivedAt", l.full_name AS "fullName", l.country_code AS "countryCode", l.phone_number AS "phoneNumber", l.email
      FROM leads l
      WHERE l.id = ${leadId}::uuid AND l.organization_id = ${scope.organizationId}::uuid
        AND (${principal.role !== 'sales'} OR l.created_by_membership_id = ${scope.membershipId}::uuid OR l.assigned_membership_id = ${scope.membershipId}::uuid)
      FOR UPDATE OF l
    `;
    if (!lead) throw new NotFoundException({ error: 'LEAD_NOT_FOUND', message: 'Lead not found.' });
    return lead;
  }

  private async lockActiveMemberships(tx: Prisma.TransactionClient, scope: Scope, membershipIds: string[]) {
    const unique = [...new Set(membershipIds)];
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT m.id FROM organization_memberships m
      JOIN organizations o ON o.id = m.organization_id JOIN users u ON u.id = m.user_id
      WHERE m.id = ANY(${unique}::uuid[]) AND m.organization_id = ${scope.organizationId}::uuid
        AND m.status = 'ACTIVE' AND o.status = 'ACTIVE' AND o.type = 'INTERNAL'
        AND u.status = 'ACTIVE' AND u.user_type = 'INTERNAL_STAFF'
      ORDER BY m.id FOR SHARE OF m, o, u
    `;
    if (rows.length !== unique.length) throw new ForbiddenException({ error: 'FORBIDDEN', message: 'Active organization membership required.' });
  }

  private async assertEligibleOwner(tx: Prisma.TransactionClient, organizationId: string, membershipId: string) {
    const eligible = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT ur.id FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.organization_id = ${organizationId}::uuid AND ur.membership_id = ${membershipId}::uuid
        AND ur.status = 'ACTIVE' AND p.code = 'customers.read'
      LIMIT 1 FOR SHARE OF ur
    `;
    if (!eligible.length) throw new ForbiddenException({ error: 'INELIGIBLE_OWNER', message: 'The relationship owner must have active customer access in this organization.' });
  }

  private customerNumber() { return `CU-${randomUUID().replaceAll('-', '').slice(0, 20).toUpperCase()}`; }

  private toSummary(row: { id: string; customerNumber: string; type: string; displayName: string; legalName: string | null; primaryPhone: string | null; email: string | null; status: string; ownerMembershipId: string; createdAt: Date; archivedAt: Date | null; owner: { user: { displayName: string } } }) {
    return { id: row.id, customerNumber: row.customerNumber, type: row.type, displayName: row.displayName, legalName: row.legalName,
      primaryPhone: row.primaryPhone, email: row.email, status: row.status, ownerMembershipId: row.ownerMembershipId,
      ownerDisplayName: row.owner.user.displayName, createdAt: row.createdAt, archivedAt: row.archivedAt };
  }
}

function normalizePhone(countryCode?: string | null, number?: string | null): string | null {
  if (!countryCode || !number) return null;
  return `${countryCode.slice(1)}${number}`;
}

function normalizeEmail(email?: string | null): string | null { return email?.trim().toLowerCase() || null; }

function validateContact(dto: CustomerContactDto) {
  if (Boolean(dto.countryCode) !== Boolean(dto.phoneNumber)) throw new BadRequestException({ error: 'INVALID_PHONE', message: 'Country code and phone must be supplied together.' });
  if (!dto.phoneNumber && !dto.email) throw new BadRequestException({ error: 'CONTACT_METHOD_REQUIRED', message: 'Provide a phone number or email address.' });
  if (dto.preferredMethod === 'PHONE' && !dto.phoneNumber) throw new BadRequestException({ error: 'INVALID_PREFERRED_METHOD', message: 'Phone must be present for the selected contact method.' });
  if (dto.preferredMethod === 'EMAIL' && !dto.email) throw new BadRequestException({ error: 'INVALID_PREFERRED_METHOD', message: 'Email must be present for the selected contact method.' });
}

function leadVisibility(principal: StaffPrincipal, scope: Scope, leadId: string): Prisma.LeadWhereInput {
  return { id: leadId, organizationId: scope.organizationId, ...(principal.role === 'sales' ? { OR: [{ createdByMembershipId: scope.membershipId }, { assignedMembershipId: scope.membershipId }] } : {}) };
}

function isPrismaConflict(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && ['P2002', 'P2034'].includes(String(error.code)));
}

function conversionResult(link: { id: string; leadId: string; linkType: string; linkedAt: Date; customer: { id: string; customerNumber: string } }, replayed: boolean) {
  return { customerId: link.customer.id, customerNumber: link.customer.customerNumber, leadId: link.leadId, linkType: link.linkType, linkedAt: link.linkedAt, replayed };
}
