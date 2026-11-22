import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';

type Preview = { eligible: boolean; blockers: string[]; matches: Array<{ id: string; customerNumber: string; displayName: string; matchedBy: string[] }> };

export function LeadCustomerConversion({ leadId, status, archived }: { leadId: string; status: string; archived: boolean }) {
  const { apiFetch } = useAuth();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [mode, setMode] = useState<'CREATE'|'LINK'>('CREATE');
  const [customerId, setCustomerId] = useState('');
  const [allowDuplicate, setAllowDuplicate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function review() {
    setBusy(true); setError('');
    try {
      const response = await apiFetch(`/api/customers/lead-conversion/${leadId}`);
      if (!response.ok) throw new Error(response.status === 403 ? 'You are not authorized to convert this lead.' : 'Conversion eligibility could not be checked.');
      const result = await response.json() as Preview;
      setPreview(result); setMode(result.matches.length ? 'LINK' : 'CREATE'); setCustomerId(result.matches[0]?.id ?? ''); setAllowDuplicate(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Conversion eligibility could not be checked.'); }
    finally { setBusy(false); }
  }

  async function convert() {
    if (!preview?.eligible || (mode === 'LINK' && !customerId)) return;
    setBusy(true); setError('');
    try {
      const response = await apiFetch(`/api/customers/convert-lead/${leadId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, ...(mode === 'LINK' ? { customerId } : {}), ...(allowDuplicate ? { allowDuplicate: true } : {}), idempotencyKey: `crm-${crypto.randomUUID()}` }),
      });
      if (response.status === 409) throw new Error('A duplicate or conversion conflict needs review. Refresh eligibility before retrying.');
      if (!response.ok) throw new Error(response.status === 403 ? 'You are not authorized to convert this lead.' : 'Lead conversion was not completed.');
      const result = await response.json() as { customerId: string };
      navigate(`/customers/${result.customerId}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Lead conversion was not completed.'); }
    finally { setBusy(false); }
  }

  return <section className="leads-page__conversion" aria-label="Lead to customer conversion">
    <h4>Customer conversion</h4>
    {status === 'WON' && !archived ? <button type="button" disabled={busy} onClick={() => void review()}>Review conversion</button> : <p>Only active won leads can be converted to a customer profile.</p>}
    {error && <p role="alert">{error}</p>}
    {preview && <div className="customer-conversion-review"><p>{preview.eligible ? 'This lead is eligible for conversion.' : `Conversion unavailable: ${preview.blockers.join(', ')}`}</p>
      {preview.matches.length > 0 && <><p>Possible matching customers are scoped to this organization.</p><label>Action<select value={mode} onChange={(event) => setMode(event.target.value as 'CREATE'|'LINK')}><option value="LINK">Link an existing customer</option><option value="CREATE">Create a new customer</option></select></label>
        {mode === 'LINK' && <label>Customer<select value={customerId} onChange={(event) => setCustomerId(event.target.value)}>{preview.matches.map((match) => <option key={match.id} value={match.id}>{match.customerNumber} · {match.displayName} · {match.matchedBy.join(', ')}</option>)}</select></label>}
        {mode === 'CREATE' && <label><input type="checkbox" checked={allowDuplicate} onChange={(event) => setAllowDuplicate(event.target.checked)} /> I reviewed the matches and confirm this is a legitimate repeat inquiry</label>}
      </>}
      {preview.eligible && <button className="leads-page__primary" type="button" disabled={busy || (mode === 'LINK' && !customerId) || (mode === 'CREATE' && preview.matches.length > 0 && !allowDuplicate)} onClick={() => void convert()}>{busy ? 'Converting…' : mode === 'LINK' ? 'Link customer' : 'Create customer profile'}</button>}
    </div>}
  </section>;
}
