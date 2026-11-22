import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { Fragment, ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { apiBase, getFirebaseAuth, signInWithStaffGoogle, signInWithStaffPassword, signOutFirebase } from '../../features/auth/lib/firebaseClient';
import { AuthContextValue, OrganizationChoice, StaffUser } from '../../features/auth/types';

const AuthContext = createContext<AuthContextValue | null>(null);
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const WARNING_TIME_MS = 28 * 60 * 1000;
const ACTIVITY_KEY = 'crm_last_activity';
const ORGANIZATION_KEY = 'crm_active_organization';
const CHANNEL_NAME = 'dolphinair-crm-session';
const DATABASE_ORGANIZATION_BOOTSTRAP = import.meta.env.DEV
  && import.meta.env.VITE_DATABASE_IDENTITY_AUTH === 'true';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationChoice[]>([]);
  const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(null);
  const [needsOrganizationSelection, setNeedsOrganizationSelection] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [providerReady, setProviderReady] = useState(false);
  const [providerError, setProviderError] = useState<string | null>(null);
  const [sessionWarning, setSessionWarning] = useState(false);
  const lastActivity = useRef(0);
  const logoutInProgress = useRef(false);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const pendingStaticUser = useRef<StaffUser | null>(null);

  const getCurrentUser = useCallback(async (firebaseUser: FirebaseUser, organizationId?: string): Promise<StaffUser> => {
    const token = await firebaseUser.getIdToken();
    const headers = new Headers({ Authorization: `Bearer ${token}` });
    if (organizationId) headers.set('X-Organization-Id', organizationId);
    const response = await fetch(`${apiBase()}/api/auth/me`, { headers });
    if (!response.ok) throw new Error('Your staff session could not be verified. Sign in again.');
    const body = (await response.json()) as { user: StaffUser };
    return body.user;
  }, []);

  const loadCurrentUser = useCallback(async (firebaseUser: FirebaseUser): Promise<StaffUser | null> => {
    pendingStaticUser.current = null;
    setAccessDenied(false);
    if (DATABASE_ORGANIZATION_BOOTSTRAP) {
      const token = await firebaseUser.getIdToken();
      const response = await fetch(`${apiBase()}/api/auth/organizations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Your staff organization access could not be verified. Sign in again.');
      const body = (await response.json()) as { organizations?: unknown };
      const choices = parseOrganizationChoices(body.organizations);
      setOrganizations(choices);
      if (choices.length === 0) {
        clearOrganizationSelection();
        setActiveOrganizationId(null);
        setAccessDenied(true);
        setNeedsOrganizationSelection(false);
        return null;
      }
      const stored = readOrganizationSelection();
      const selected = choices.length === 1 ? choices[0].id : choices.some((item) => item.id === stored) ? stored : null;
      if (!selected) {
        clearOrganizationSelection();
        setActiveOrganizationId(null);
        setNeedsOrganizationSelection(true);
        return null;
      }
      const current = await getCurrentUser(firebaseUser, selected);
      persistOrganizationSelection(selected);
      setActiveOrganizationId(selected);
      setNeedsOrganizationSelection(false);
      return current;
    }

    const current = await getCurrentUser(firebaseUser);
    const choices = (current.organizationIds ?? []).map((id, index) => ({ id, name: `Organization ${index + 1}` }));
    setOrganizations(choices);
    if (choices.length === 0) {
      clearOrganizationSelection();
      setActiveOrganizationId(null);
      setAccessDenied(true);
      setNeedsOrganizationSelection(false);
      return null;
    }
    const stored = readOrganizationSelection();
    const selected = choices.length === 1 ? choices[0].id : choices.some((item) => item.id === stored) ? stored : null;
    if (!selected) {
      pendingStaticUser.current = current;
      clearOrganizationSelection();
      setActiveOrganizationId(null);
      setNeedsOrganizationSelection(true);
      return null;
    }
    persistOrganizationSelection(selected);
    setActiveOrganizationId(selected);
    setNeedsOrganizationSelection(false);
    return current;
  }, [getCurrentUser]);

  const logout = useCallback(async () => {
    setSessionWarning(false);
    setUser(null);
    setOrganizations([]);
    setActiveOrganizationId(null);
    setNeedsOrganizationSelection(false);
    setAccessDenied(false);
    pendingStaticUser.current = null;
    clearOrganizationSelection();
    localStorage.removeItem(ACTIVITY_KEY);
    try {
      const firebaseUser = getFirebaseAuth().currentUser;
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        await fetch(`${apiBase()}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // Local sign-out still completes when remote revocation is unavailable.
    }
    try { channelRef.current?.postMessage({ type: 'LOGOUT' }); } catch { /* Cross-tab signaling is optional. */ }
    try { await signOutFirebase(); } catch { /* Local React session still clears. */ }
  }, []);

  const selectOrganization = useCallback(async (organizationId: string) => {
    const organization = organizations.find((item) => item.id === organizationId);
    if (!organization) throw new Error('Select an organization from your verified memberships.');
    const firebaseUser = getFirebaseAuth().currentUser;
    if (!firebaseUser) throw new Error('Your session has expired. Sign in again.');
    setLoading(true);
    setProviderError(null);
    try {
      let current: StaffUser;
      if (DATABASE_ORGANIZATION_BOOTSTRAP) {
        current = await getCurrentUser(firebaseUser, organization.id);
      } else {
        const pending = pendingStaticUser.current ?? user;
        if (!pending) throw new Error('Your staff identity is not ready. Sign in again.');
        current = pending;
        if (!current?.organizationIds?.includes(organization.id)) throw new Error('Organization membership is no longer available.');
      }
      persistOrganizationSelection(organization.id);
      setActiveOrganizationId(organization.id);
      setNeedsOrganizationSelection(false);
      setAccessDenied(false);
      pendingStaticUser.current = current;
      setUser(current);
      try { channelRef.current?.postMessage({ type: 'ORGANIZATION_CHANGED', organizationId: organization.id }); } catch { /* Cross-tab signaling is optional. */ }
    } catch (error) {
      clearOrganizationSelection();
      setActiveOrganizationId(null);
      setUser(null);
      const message = error instanceof Error ? error.message : 'Organization access could not be verified.';
      try {
        const refreshed = await loadCurrentUser(firebaseUser);
        setUser(refreshed);
      } catch {
        await logout();
      }
      setProviderError(message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [getCurrentUser, loadCurrentUser, logout, organizations, user]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      const auth = getFirebaseAuth();
      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        setProviderReady(true);
        setProviderError(null);
        if (!firebaseUser) {
          setUser(null);
          setOrganizations([]);
          setActiveOrganizationId(null);
          setNeedsOrganizationSelection(false);
          setAccessDenied(false);
          clearOrganizationSelection();
          setLoading(false);
          return;
        }
        setLoading(true);
        try {
          const current = await loadCurrentUser(firebaseUser);
          setUser(current);
          if (current) lastActivity.current = Number(localStorage.getItem(ACTIVITY_KEY)) || Date.now();
        } catch (error) {
          setUser(null);
          clearOrganizationSelection();
          await logout();
          setProviderError(error instanceof Error ? error.message : 'Staff session could not be verified.');
        } finally {
          setLoading(false);
        }
      });
    } catch {
      queueMicrotask(() => {
        setProviderReady(false);
        setProviderError('Local Firebase Auth is not configured. Sign-in is unavailable.');
        setLoading(false);
      });
    }
    return () => unsubscribe?.();
  }, [loadCurrentUser, logout]);

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    const firebaseUser = await signInWithStaffPassword(email, password, remember);
    const current = await loadCurrentUser(firebaseUser);
    setUser(current);
    setProviderError(null);
    lastActivity.current = Date.now();
    localStorage.setItem(ACTIVITY_KEY, String(lastActivity.current));
  }, [loadCurrentUser]);

  const loginWithGoogle = useCallback(async (remember: boolean) => {
    const firebaseUser = await signInWithStaffGoogle(remember);
    const current = await loadCurrentUser(firebaseUser);
    setUser(current);
    setProviderError(null);
    lastActivity.current = Date.now();
    localStorage.setItem(ACTIVITY_KEY, String(lastActivity.current));
  }, [loadCurrentUser]);

  const continueSession = useCallback(async () => {
    const firebaseUser = getFirebaseAuth().currentUser;
    if (!firebaseUser) return logout();
    await firebaseUser.getIdToken(true);
    lastActivity.current = Date.now();
    localStorage.setItem(ACTIVITY_KEY, String(lastActivity.current));
    try { channelRef.current?.postMessage({ type: 'SESSION_CONTINUED', at: lastActivity.current }); } catch { /* Cross-tab signaling is optional. */ }
    setSessionWarning(false);
  }, [logout]);

  useEffect(() => {
    if (!user) return;
    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channelRef.current = channel;
      channel.onmessage = (event: MessageEvent<{ type?: string; at?: number; organizationId?: string }>) => {
        if ((event.data?.type === 'ACTIVITY' || event.data?.type === 'SESSION_CONTINUED') && typeof event.data.at === 'number') {
          lastActivity.current = Math.max(lastActivity.current, event.data.at);
        } else if (event.data?.type === 'LOGOUT') {
          setUser(null);
          setOrganizations([]);
          setActiveOrganizationId(null);
          setNeedsOrganizationSelection(false);
          setAccessDenied(false);
          pendingStaticUser.current = null;
          setSessionWarning(false);
          clearOrganizationSelection();
          void signOutFirebase();
        } else if (event.data?.type === 'ORGANIZATION_CHANGED' && organizations.some((item) => item.id === event.data.organizationId)) {
          const id = event.data.organizationId!;
          persistOrganizationSelection(id);
          setActiveOrganizationId(id);
          setUser(null);
          setLoading(true);
          const firebaseUser = getFirebaseAuth().currentUser;
          if (firebaseUser) void loadCurrentUser(firebaseUser).then(setUser).catch(() => logout()).finally(() => setLoading(false));
        }
      };
    }
    const markActivity = () => {
      lastActivity.current = Date.now();
      localStorage.setItem(ACTIVITY_KEY, String(lastActivity.current));
      channel?.postMessage({ type: 'ACTIVITY', at: lastActivity.current });
    };
    for (const event of ['pointerdown', 'keydown', 'mousemove', 'touchstart']) window.addEventListener(event, markActivity, { passive: true });
    const timer = window.setInterval(() => {
      const idleFor = Date.now() - lastActivity.current;
      if (idleFor >= SESSION_TIMEOUT_MS && !logoutInProgress.current) {
        logoutInProgress.current = true;
        void logout().finally(() => { logoutInProgress.current = false; });
      } else setSessionWarning(idleFor >= WARNING_TIME_MS);
    }, 1000);
    return () => {
      window.clearInterval(timer);
      channel?.close();
      channelRef.current = null;
      for (const event of ['pointerdown', 'keydown', 'mousemove', 'touchstart']) window.removeEventListener(event, markActivity);
    };
  }, [loadCurrentUser, logout, organizations, user]);

  const apiFetch = useCallback(async (path: string, init: RequestInit = {}) => {
    const firebaseUser = getFirebaseAuth().currentUser;
    if (!firebaseUser) throw new Error('Your session has expired. Sign in again.');
    const token = await firebaseUser.getIdToken();
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token}`);
    if (activeOrganizationId && path.startsWith('/api/')) headers.set('X-Organization-Id', activeOrganizationId);
    const response = await fetch(`${apiBase()}${path}`, { ...init, headers });
    if (response.status === 401) {
      setProviderError('Your session has expired. Sign in again.');
      await logout();
    }
    return response;
  }, [activeOrganizationId, logout]);

  const value = useMemo<AuthContextValue>(() => ({
    user, organizations, activeOrganizationId, needsOrganizationSelection, accessDenied,
    loading, providerReady, providerError, sessionWarning,
    login, loginWithGoogle, logout, continueSession, selectOrganization, apiFetch,
  }), [user, organizations, activeOrganizationId, needsOrganizationSelection, accessDenied, loading, providerReady, providerError, sessionWarning, login, loginWithGoogle, logout, continueSession, selectOrganization, apiFetch]);

  return <AuthContext.Provider value={value}><Fragment key={activeOrganizationId ?? 'organization-pending'}>{children}</Fragment></AuthContext.Provider>;
}

function parseOrganizationChoices(value: unknown): OrganizationChoice[] {
  if (!Array.isArray(value)) throw new Error('Organization access response was invalid.');
  return value.filter((item): item is OrganizationChoice => Boolean(item && typeof item === 'object'
    && 'id' in item && typeof item.id === 'string' && 'name' in item && typeof item.name === 'string'));
}

function readOrganizationSelection(): string | null {
  try { return window.sessionStorage.getItem(ORGANIZATION_KEY); } catch { return null; }
}

function persistOrganizationSelection(organizationId: string): void {
  try { window.sessionStorage.setItem(ORGANIZATION_KEY, organizationId); } catch { /* Selection is verified again when the session loads. */ }
}

function clearOrganizationSelection(): void {
  try { window.sessionStorage.removeItem(ORGANIZATION_KEY); } catch { /* Selection is never trusted without server checks. */ }
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider.');
  return value;
}
