// Stage 4.2 contract boundary. No live endpoint is enabled until tenant context is verified.
export const LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_PENDING', 'NEGOTIATION', 'WON', 'LOST'] as const;
export const LEAD_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;
export const LEAD_SERVICES = ['UMRAH', 'HAJJ', 'ZIYARATH', 'FLIGHT_TICKETS', 'HOTELS', 'VISA_ASSISTANCE', 'HOLIDAY_PACKAGES', 'OTHER_TRAVEL'] as const;

export type LeadStatus = typeof LEAD_STATUSES[number];
export type LeadPriority = typeof LEAD_PRIORITIES[number];
export type LeadService = typeof LEAD_SERVICES[number];

export interface LeadSummary {
  id: string;
  organizationId: string;
  leadNumber: string;
  fullName: string;
  service: LeadService;
  source: string;
  status: LeadStatus;
  priority: LeadPriority;
  assignedMembershipId: string | null;
  createdAt: string;
  archivedAt: string | null;
}

export interface LeadPage {
  items: LeadSummary[];
  nextCursor: string | null;
}

export interface LeadAssignmentTarget {
  membershipId: string;
}

export interface EligibleLeadAssignee {
  membershipId: string;
  displayName: string;
  email: string | null;
}

export interface LeadAssignmentHistoryEntry {
  id: string;
  previousAssignee: { membershipId: string; displayName: string } | null;
  assignee: { membershipId: string; displayName: string };
  actor: { membershipId: string; displayName: string };
  assignedAt: string;
}

export interface LeadDuplicateCheckInput {
  countryCode?: string;
  phoneNumber?: string;
  email?: string;
  excludeLeadId?: string;
}

export interface LeadDuplicateMatch {
  id: string;
  leadNumber: string;
  fullName: string;
  status: LeadStatus;
  service: LeadService;
  matchedBy: ('phone' | 'email')[];
  archived: boolean;
}

export interface LeadDuplicateCheckResult {
  matches: LeadDuplicateMatch[];
  truncated: boolean;
}

export const LEAD_CONVERSION_TARGETS = ['CUSTOMER', 'OPPORTUNITY'] as const;
export type LeadConversionTarget = typeof LEAD_CONVERSION_TARGETS[number];

/** Contract only; no conversion endpoint or target records exist in Stage 4.2. */
export interface LeadConversionRequest {
  leadId: string;
  target: LeadConversionTarget;
  idempotencyKey: string;
}

export type LeadConversionBlocker = 'LEAD_ARCHIVED' | 'LEAD_NOT_WON' | 'CUSTOMER_ALREADY_LINKED' | 'OPPORTUNITY_ALREADY_LINKED' | 'TARGET_PERMISSION_REQUIRED';

export interface LeadConversionPreview {
  leadId: string;
  target: LeadConversionTarget;
  eligible: boolean;
  blockers: LeadConversionBlocker[];
}

export interface LeadConversionResult {
  leadId: string;
  target: LeadConversionTarget;
  targetRecordId: string;
  createdAt: string;
}

export function isLeadConversionRequest(value: unknown): value is LeadConversionRequest {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.leadId === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate.leadId)
    && typeof candidate.target === 'string'
    && (LEAD_CONVERSION_TARGETS as readonly string[]).includes(candidate.target)
    && typeof candidate.idempotencyKey === 'string'
    && /^[A-Za-z0-9._:-]{16,128}$/.test(candidate.idempotencyKey);
}
