import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../app/providers/AuthProvider';
import '../styles/organization-access.css';

export function OrganizationAccessPage() {
  const { user, loading, organizations, activeOrganizationId, needsOrganizationSelection, accessDenied, providerError, selectOrganization, logout } = useAuth();
  const [selected, setSelected] = useState(activeOrganizationId ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  if (loading) return <main className="organization-access" aria-live="polite">Verifying organization access…</main>;
  if (user) return <Navigate to="/" replace />;
  if (!needsOrganizationSelection && !accessDenied && organizations.length === 0) return <Navigate to="/login" replace />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await selectOrganization(selected);
      navigate('/', { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Organization access could not be verified.');
    } finally { setBusy(false); }
  }

  return <main className="organization-access">
    <section className="organization-access__card" aria-labelledby="organization-access-title">
      <span className="organization-access__brand">Dolphin Air Services</span>
      <p className="organization-access__eyebrow">Secure staff access</p>
      <h1 id="organization-access-title">{accessDenied ? 'Access unavailable' : 'Choose your organization'}</h1>
      {accessDenied || organizations.length === 0 ? <>
        <p>Your account has no active organization access. Contact an authorized administrator.</p>
        <button type="button" className="organization-access__primary" onClick={() => void logout()}>Sign out</button>
      </> : <>
        <p>Choose an organization you are currently authorized to access.</p>
        <form onSubmit={(event) => void submit(event)}>
          <label htmlFor="organization-choice">Organization</label>
          <select id="organization-choice" value={selected} onChange={(event) => setSelected(event.target.value)} required>
            <option value="" disabled>Select an organization</option>
            {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
          </select>
          {(error || providerError) && <p className="organization-access__error" role="alert">{error || providerError}</p>}
          <button className="organization-access__primary" type="submit" disabled={busy || !selected}>
            {busy ? 'Verifying…' : 'Continue'}
          </button>
        </form>
        <button type="button" className="organization-access__signout" onClick={() => void logout()}>Sign out</button>
      </>}
    </section>
  </main>;
}
