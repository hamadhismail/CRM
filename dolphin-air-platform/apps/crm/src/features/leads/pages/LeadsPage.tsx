import { useCallback, useEffect, useState } from 'react';
import { Archive, Eye, Plus, RefreshCw, Save, RotateCcw } from 'lucide-react';
import { useAuth } from '../../../app/providers/AuthProvider';
import './leads.css';

type LeadRow = { id: string; leadNumber: string; fullName: string; service: string; source: string;
  status: string; priority: string; assignedMembershipId: string | null; createdAt: string };
type LeadPageResponse = { items: LeadRow[]; nextCursor: string | null };
type LeadDetail = LeadRow & { countryCode: string; phoneNumber: string; email: string | null; description: string | null; updatedAt: string; archivedAt: string | null; notes: { id:string; body:string; createdAt:string }[]; events: { id:string; eventType:string; occurredAt:string; safeMetadata?: unknown }[] };
const STATUSES = ['NEW','CONTACTED','QUALIFIED','PROPOSAL_PENDING','NEGOTIATION','WON','LOST'];
const SERVICES = [
  ['UMRAH', 'Umrah'], ['HAJJ', 'Hajj'], ['ZIYARATH', 'Ziyarath'], ['FLIGHT_TICKETS', 'Flight tickets'],
  ['HOTELS', 'Hotels'], ['VISA_ASSISTANCE', 'Visa assistance'], ['HOLIDAY_PACKAGES', 'Holiday packages'], ['OTHER_TRAVEL', 'Other travel'],
] as const;

export function LeadsPage() {
  const { apiFetch, user } = useAuth();
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [source, setSource] = useState('');
  const [service, setService] = useState('UMRAH');
  const [selected, setSelected] = useState<LeadDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [note, setNote] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [archiveState, setArchiveState] = useState<'active'|'archived'>('active');

  const load = useCallback(async (cursor?: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await apiFetch(`/api/leads?state=${archiveState}&take=25${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
      if (response.status === 503) { setUnavailable(true); return; }
      if (!response.ok) throw new Error('Lead records could not be loaded. Try again.');
      const page = await response.json() as LeadPageResponse;
      setUnavailable(false);
      setRows((current) => cursor ? [...current, ...page.items] : page.items);
      setNextCursor(page.nextCursor);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Lead records could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, archiveState]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true); setError('');
    try { const response = await apiFetch(`/api/leads/${id}`); if (!response.ok) throw new Error(response.status === 404 ? 'Lead not found or no longer available.' : 'Lead details could not be loaded.'); setSelected(await response.json() as LeadDetail); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Lead details could not be loaded.'); }
    finally { setDetailLoading(false); }
  }, [apiFetch]);

  async function mutate(path: string, init: RequestInit, success: string) {
    try { const response = await apiFetch(path, init); if (!response.ok) throw new Error(response.status === 403 ? 'You do not have permission for this action.' : 'The change could not be saved.'); setError(''); await load(); if (selected) await loadDetail(selected.id); return true; }
    catch (cause) { setError(cause instanceof Error ? cause.message : success); return false; }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function createLead(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await apiFetch('/api/leads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: fullName.trim(), countryCode: countryCode.trim(), phoneNumber: phoneNumber.trim(),
          ...(email.trim() ? { email: email.trim() } : {}), source: source.trim(), service }),
      });
      if (!response.ok) throw new Error(response.status === 503 ? 'Lead access is not available yet.' : 'Lead was not saved. Check the details and try again.');
      setFormOpen(false);
      setFullName(''); setPhoneNumber(''); setEmail(''); setSource('');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Lead was not saved.');
    } finally {
      setSaving(false);
    }
  }

  function closeForm() {
    if ((fullName || phoneNumber || email || source) && !window.confirm('Discard the unsaved lead details?')) return;
    setFormOpen(false);
  }

  return <div className="leads-page">
    <div className="leads-page__heading"><div><h2>Leads management</h2><p>Manage inquiries, track prospects and coordinate your sales pipeline.</p></div>
      {!unavailable && <div className="leads-page__actions"><label>View <select value={archiveState} onChange={e=>{setRows([]);setArchiveState(e.target.value as 'active'|'archived')}}><option value="active">Active leads</option><option value="archived">Archived leads</option></select></label><button type="button" onClick={() => void load()} disabled={loading} aria-label="Refresh leads"><RefreshCw size={16} /> Refresh</button>
        {user?.permissions.includes('leads.create') && <button type="button" className="leads-page__primary" onClick={() => setFormOpen(true)}><Plus size={16} /> Add lead</button>}</div>}
    </div>
    {error && <p className="leads-page__error" role="alert">{error}</p>}
    {unavailable ? <section className="leads-page__state" role="status"><h3>Lead access is unavailable</h3><p>The verified organization identity path is not enabled for this workspace. No lead records were loaded.</p></section>
      : <section className="leads-page__table-wrap" aria-label="Leads list">{loading && rows.length === 0 ? <p className="leads-page__state" role="status">Loading leads…</p>
        : rows.length === 0 ? <p className="leads-page__state" role="status">No leads available.</p>
          : <div className="leads-page__scroll"><table><thead><tr><th>Lead ID</th><th>Customer name</th><th>Service</th><th>Source</th><th>Status</th><th>Priority</th><th>Created</th></tr></thead>
            <tbody>{rows.map((lead) => <tr key={lead.id}><td>{lead.leadNumber}</td><td><strong>{lead.fullName}</strong></td><td>{lead.service.replaceAll('_', ' ')}</td><td>{lead.source}</td><td>{lead.status.replaceAll('_', ' ')}</td><td>{lead.priority}</td><td>{new Date(lead.createdAt).toLocaleDateString()}</td><td>{archiveState==='archived'?<button type="button" disabled={!user?.permissions.includes('leads.update')} onClick={()=>{if(window.confirm(`Restore ${lead.fullName}?`))void mutate(`/api/leads/${lead.id}/restore`,{method:'POST'},'Restore failed')}}><RotateCcw size={15}/> Restore</button>:<button type="button" aria-label={`View ${lead.fullName}`} onClick={() => void loadDetail(lead.id)}><Eye size={15}/></button>}</td></tr>)}</tbody></table></div>}
        {nextCursor && <button type="button" className="leads-page__more" disabled={loading} onClick={() => void load(nextCursor)}>Load more</button>}
      </section>}
    {formOpen && !unavailable && <section className="leads-page__form-panel" aria-labelledby="new-lead-heading"><div className="leads-page__form-head"><h3 id="new-lead-heading">Add lead</h3><button type="button" onClick={closeForm}>Cancel</button></div>
      <form onSubmit={(event) => void createLead(event)}><div className="leads-page__fields">
        <label>Customer name<input required minLength={2} maxLength={160} value={fullName} onChange={(event) => setFullName(event.target.value)} /></label>
        <label>Country code<input required pattern="\+[1-9][0-9]{0,3}" value={countryCode} onChange={(event) => setCountryCode(event.target.value)} /></label>
        <label>Phone number<input required inputMode="tel" pattern="[0-9]{6,15}" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} /></label>
        <label>Email (optional)<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Lead source<input required minLength={2} maxLength={60} value={source} onChange={(event) => setSource(event.target.value)} /></label>
        <label>Interested service<select value={service} onChange={(event) => setService(event.target.value)}>{SERVICES.map(([code, label]) => <option value={code} key={code}>{label}</option>)}</select></label>
      </div><button type="submit" className="leads-page__primary" disabled={saving}>{saving ? 'Saving…' : 'Save lead'}</button></form>
    </section>}
    {detailLoading && <p role="status" className="leads-page__state">Loading lead details…</p>}
    {selected && !detailLoading && <section className="leads-page__form-panel" aria-labelledby="lead-detail-heading">
      <div className="leads-page__form-head"><div><h3 id="lead-detail-heading">{selected.fullName}</h3><p>{selected.leadNumber} · {selected.status.replaceAll('_',' ')}</p></div><div><button type="button" onClick={()=>{setSelected(null);setEditMode(false)}}>Close</button>
        {user?.permissions.includes('leads.update') && <button type="button" onClick={()=>setEditMode(!editMode)}>{editMode?'Cancel edit':'Edit'}</button>}
        {archiveState==='active'&&user?.permissions.includes('leads.update') && <button type="button" onClick={()=>{if(window.confirm(`Archive ${selected.fullName}?`))void mutate(`/api/leads/${selected.id}`,{method:'DELETE'},'Archive failed')}}><Archive size={15}/> Archive</button>}
      </div></div>
      {editMode ? <form onSubmit={async e=>{e.preventDefault(); const f=new FormData(e.currentTarget); const ok=await mutate(`/api/leads/${selected.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({fullName:f.get('name'),countryCode:f.get('country'),phoneNumber:f.get('phone'),email:f.get('email')||undefined,source:f.get('source'),service:f.get('service')})},'Update failed');if(ok)setEditMode(false)}}><div className="leads-page__fields">
        <label>Name<input name="name" required minLength={2} maxLength={160} defaultValue={selected.fullName}/></label><label>Country code<input name="country" required pattern="\+[1-9][0-9]{0,3}" defaultValue={selected.countryCode}/></label><label>Phone<input name="phone" required pattern="[0-9]{6,15}" defaultValue={selected.phoneNumber}/></label><label>Email<input name="email" type="email" defaultValue={selected.email??''}/></label><label>Source<input name="source" required minLength={2} maxLength={60} defaultValue={selected.source}/></label><label>Service<select name="service" defaultValue={selected.service}>{SERVICES.map(([code,label])=><option key={code} value={code}>{label}</option>)}</select></label>
      </div><button className="leads-page__primary"><Save size={15}/> Save changes</button></form> : <div className="leads-page__detail-grid"><p><b>Contact</b><br/>{selected.countryCode} {selected.phoneNumber}<br/>{selected.email??'No email'}</p><p><b>Travel</b><br/>{selected.service.replaceAll('_',' ')} · {selected.source}<br/>{selected.description??'No additional requirements'}</p><p><b>Created</b><br/>{new Date(selected.createdAt).toLocaleString()}</p><p><b>Updated</b><br/>{new Date(selected.updatedAt).toLocaleString()}</p></div>}
      {user?.permissions.includes('leads.update') && <label className="leads-page__inline">Status<select value={selected.status} onChange={e=>void mutate(`/api/leads/${selected.id}/status`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:e.target.value})},'Status update failed')}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></label>}
      <div className="leads-page__detail-columns"><div><h4>Notes</h4>{selected.notes.length?selected.notes.map(n=><p className="leads-page__note" key={n.id}>{n.body}<small>{new Date(n.createdAt).toLocaleString()}</small></p>):<p>No notes yet.</p>}{user?.permissions.includes('leads.update')&&<form onSubmit={async e=>{e.preventDefault();if(!note.trim())return;const ok=await mutate(`/api/leads/${selected.id}/notes`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({body:note.trim()})},'Note failed');if(ok)setNote('')}}><label>Add note<textarea maxLength={4000} required value={note} onChange={e=>setNote(e.target.value)}/></label><button className="leads-page__primary">Add note</button></form>}</div><div><h4>Activity</h4>{selected.events.length?selected.events.map(ev=><p className="leads-page__note" key={ev.id}>{ev.eventType.replaceAll('_',' ')}<small>{new Date(ev.occurredAt).toLocaleString()}</small></p>):<p>Activity history unavailable.</p>}</div></div>
    </section>}
  </div>;
}
