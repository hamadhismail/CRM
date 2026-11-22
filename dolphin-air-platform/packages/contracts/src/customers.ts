export const CUSTOMER_TYPES = ['INDIVIDUAL', 'BUSINESS'] as const;
export const CUSTOMER_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type CustomerType = typeof CUSTOMER_TYPES[number];
export type CustomerStatus = typeof CUSTOMER_STATUSES[number];

export interface CustomerSummary {
  id: string;
  customerNumber: string;
  type: CustomerType;
  displayName: string;
  legalName: string | null;
  primaryPhone: string | null;
  email: string | null;
  status: CustomerStatus;
  ownerMembershipId: string;
  ownerDisplayName: string;
  createdAt: string;
  archivedAt: string | null;
}

export interface CustomerPage {
  items: CustomerSummary[];
  nextCursor: string | null;
}

export type CustomerConversionMode = 'CREATE' | 'LINK';
export interface CustomerLeadConversionRequest {
  mode: CustomerConversionMode;
  customerId?: string;
  allowDuplicate?: boolean;
  idempotencyKey: string;
}

export interface CustomerLeadConversionResult {
  customerId: string;
  customerNumber: string;
  leadId: string;
  linkType: 'LINKED' | 'CONVERTED';
  linkedAt: string;
  replayed: boolean;
}
