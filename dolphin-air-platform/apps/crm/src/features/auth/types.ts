export type StaffRole = 'super_admin' | 'admin' | 'staff' | 'sales' | 'operations' | 'finance_accounts' | 'visa_processing';

export interface StaffUser {
  id: string;
  displayName: string;
  email: string;
  role: StaffRole;
  active: boolean;
  permissions: string[];
  organizationIds?: string[];
}

export interface OrganizationChoice {
  id: string;
  name: string;
}

export interface AuthContextValue {
  user: StaffUser | null;
  organizations: OrganizationChoice[];
  activeOrganizationId: string | null;
  needsOrganizationSelection: boolean;
  accessDenied: boolean;
  loading: boolean;
  providerReady: boolean;
  providerError: string | null;
  sessionWarning: boolean;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  loginWithGoogle: (remember: boolean) => Promise<void>;
  logout: () => Promise<void>;
  selectOrganization: (organizationId: string) => Promise<void>;
  continueSession: () => Promise<void>;
  apiFetch: (path: string, init?: RequestInit) => Promise<Response>;
}
