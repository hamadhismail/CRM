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
