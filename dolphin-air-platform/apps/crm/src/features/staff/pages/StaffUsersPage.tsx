import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Check, RefreshCw, Shield, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../app/providers/AuthProvider';
import { StaffRole, StaffUser } from '../../auth/types';

const ROLE_LABELS: Record<StaffRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  staff: 'Staff',
  sales: 'Sales',
  operations: 'Operations',
  finance_accounts: 'Finance / Accounts',
  visa_processing: 'Visa Processing',
};

const ROLE_OPTIONS: readonly StaffRole[] = Object.keys(ROLE_LABELS) as StaffRole[];

export function StaffUsersPage() {
  const { apiFetch, user: currentUser } = useAuth();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const [savedId, setSavedId] = useState('');

  const loadUsers = useCallback(async () => {
    try {
      const response = await apiFetch('/api/users');
      const body = (await response.json()) as { users?: StaffUser[]; message?: string };
      if (!response.ok || !body.users) throw new Error(body.message ?? 'User list could not be loaded.');
      setUsers(body.users);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'User list could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadUsers(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadUsers]);

  function refreshUsers() {
    setLoading(true);
    setError('');
    void loadUsers();
  }

  async function saveField(account: StaffUser, field: 'role' | 'status', value: StaffRole | boolean) {
    setSavingId(account.id);
    setError('');
    setSavedId('');
    try {
      const response = await apiFetch(`/api/users/${encodeURIComponent(account.id)}/${field}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(field === 'role' ? { role: value } : { active: value }),
      });
      const body = (await response.json()) as Partial<StaffUser> & { message?: string };
      if (!response.ok) throw new Error(body.message ?? 'The account update could not be saved.');
      setUsers((items) => items.map((item) => item.id === account.id ? { ...item, ...body } : item));
      setSavedId(account.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The account update could not be saved.');
    } finally {
      setSavingId('');
      window.setTimeout(() => setSavedId(''), 1800);
    }
  }

  const assignableRoles = currentUser?.role === 'super_admin'
    ? ROLE_OPTIONS
    : ROLE_OPTIONS.filter((role) => role !== 'super_admin' && role !== 'admin');

  return (
    <main className="staff-page">
      <header className="staff-page__topbar">
        <Link to="/" className="staff-back-link"><ArrowLeft size={17} /> Workspace</Link>
        <div className="staff-page__identity"><span>{currentUser?.displayName}</span><span className="role-pill">{currentUser ? ROLE_LABELS[currentUser.role] : 'Staff'}</span></div>
      </header>
      <section className="staff-page__content">
        <div className="staff-page__title-row">
          <div><p className="staff-page__section-label">Identity administration</p><h1>Team access</h1><p className="staff-page__description">Manage user roles and account status within your permitted organization scope.</p></div>
          <button className="button button--outline" type="button" onClick={refreshUsers} disabled={loading}><RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh</button>
        </div>
        {error && <p className="staff-error" role="alert">{error}</p>}
        <div className="staff-table-wrap">
          <table className="staff-table">
            <thead><tr><th scope="col">Staff member</th><th scope="col">Role</th><th scope="col">Account</th><th scope="col" aria-label="Save state" /></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={4} className="table-message">Loading team members...</td></tr>}
              {!loading && users.length === 0 && <tr><td colSpan={4} className="table-message">No team members are available in your organization scope.</td></tr>}
              {!loading && users.map((account) => (
                <tr key={account.id}>
                  <td><div className="staff-member"><span className="staff-avatar"><UserRound size={18} /></span><span><strong>{account.displayName}</strong><small>{account.email}</small></span></div></td>
                  <td><select aria-label={`Role for ${account.displayName}`} value={account.role} disabled={savingId === account.id || account.id === currentUser?.id || (account.role === 'admin' && currentUser?.role !== 'super_admin')} onChange={(event) => void saveField(account, 'role', event.target.value as StaffRole)}>{[...new Set([...assignableRoles, account.role])].map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}</select></td>
                  <td><button className={`status-control ${account.active ? 'is-active' : 'is-disabled'}`} type="button" aria-pressed={account.active} disabled={savingId === account.id || account.id === currentUser?.id} onClick={() => void saveField(account, 'status', !account.active)}><span />{account.active ? 'Active' : 'Disabled'}</button></td>
                  <td className="staff-save-state">{savingId === account.id ? <span className="saving-state">Saving...</span> : savedId === account.id ? <span className="saved-state"><Check size={14} /> Saved</span> : <span aria-hidden="true"><Shield size={15} /></span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="staff-note">New account invitations and organization membership changes are not available in this identity foundation.</p>
      </section>
    </main>
  );
}
