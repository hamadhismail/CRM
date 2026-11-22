import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Archive, ArrowLeft, Building2, RotateCcw, UserRound } from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import './customers.css';

type CustomerRow = { id: string; customerNumber: string; type: 'INDIVIDUAL' | 'BUSINESS'; displayName: string; legalName: string | null; primaryPhone: string | null; email: string | null; status: string; ownerDisplayName: string; createdAt: string; archivedAt: string | null };
type CustomerDetail = Omit<CustomerRow, 'ownerDisplayName'> & { ownerDisplayName?: string; owner?: { user?: { displayName?: string; email?: string | null } }; city?: string | null; country?: string | null; preferredLanguage?: string | null; contacts: Contact[]; activities: Activity[]; leadLinks: Array<{ linkType: string; linkedAt: string; lead: { id: string; leadNumber: string; fullName: string; status: string; service: string; createdAt: string } }> };
type Contact = { id: string; fullName: string; designation: string | null; countryCode: string | null; phoneNumber: string | null; email: string | null; preferredMethod: string | null; isPrimary: boolean };
type Activity = { id: string; eventType: string; occurredAt: string; actor?: { user?: { displayName?: string } }; safeMetadata?: Record<string, unknown> | null };
type Page<T> = { items: T[]; nextCursor: string | null };

export function CustomersPage() {
  const { apiFetch, user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [summary, setSummary] = useState<{ total: number; active: number; individual: number; business: number } | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [search, setSearch] = useState('');
  const [state, setState] = useState<'active' | 'archived'>('active');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [duplicateMatches, setDuplicateMatches] = useState<Array<{ id: string; customerNumber: string; displayName: string; type: string; matchedBy: string[] }>>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<'INDIVIDUAL' | 'BUSINESS'>('INDIVIDUAL');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [legalName, setLegalName] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('India');
  const [contactName, setContactName] = useState('');
  const [contactEditId, setContactEditId] = useState<string | null>(null);
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPrimary, setContactPrimary] = useState(false);

  const load = useCallback(async (cursor?: string) => {
    setLoading(true); setError('');
    try {
      if (id) {
        const response = await apiFetch(`/api/customers/${id}`);
        if (!response.ok) throw new Error(response.status === 404 ? 'Customer was not found or is not available in this organization.' : 'Customer details could not be loaded.');
        setDetail(await response.json() as CustomerDetail);
      } else {
        const suffix = new URLSearchParams({ state, take: '50', ...(search.trim() ? { search: search.trim() } : {}), ...(typeFilter ? { type: typeFilter } : {}), ...(statusFilter ? { status: statusFilter } : {}), ...(cursor ? { cursor } : {}) });
        const [listResponse, summaryResponse] = await Promise.all([apiFetch(`/api/customers?${suffix}`), state === 'active' ? apiFetch('/api/customers/summary') : Promise.resolve(null)]);
        if (!listResponse.ok) throw new Error('Customer directory could not be loaded.');
        const page = await listResponse.json() as Page<CustomerRow>;
        setRows((current) => cursor ? [...current, ...page.items] : page.items);
        setNextCursor(page.nextCursor);
        if (summaryResponse?.ok) setSummary(await summaryResponse.json());
        else if (state === 'active') setSummary(null);
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Customer information could not be loaded.'); }
    finally { setLoading(false); }
  }, [apiFetch, id, search, state, typeFilter, statusFilter]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 180); return () => window.clearTimeout(timer); }, [load]);

  function startCreate() {
    setEdit(false); setDetail(null); setName(''); setType('INDIVIDUAL'); setStatus('ACTIVE'); setLegalName(''); setPhone(''); setEmail(''); setCity(''); setCountry('India'); setFormOpen(true);
  }
  function startEdit() {
    if (!detail) return;
    setEdit(true); setName(detail.displayName); setType(detail.type); setStatus(detail.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'); setLegalName(detail.legalName ?? ''); setPhone(detail.primaryPhone ?? ''); setEmail(detail.email ?? ''); setCity(detail.city ?? ''); setCountry(detail.country ?? ''); setFormOpen(true);
  }

  async function saveCustomer(event?: FormEvent<HTMLFormElement>, confirmMatches = false) {
    event?.preventDefault(); setSaving(true); setError(''); setNotice('');
    const payload = {
      ...(edit ? {} : { type }), displayName: name.trim(), status, ...(type === 'BUSINESS' && legalName.trim() ? { legalName: legalName.trim() } : {}),
      ...(phone.trim() ? { primaryCountryCode: countryCode, primaryPhone: phone.trim() } : edit && detail?.primaryPhone ? { primaryCountryCode: null, primaryPhone: null } : {}), ...(email.trim() ? { email: email.trim() } : edit && detail?.email ? { email: null } : {}),
      ...(city.trim() ? { city: city.trim() } : {}), ...(country.trim() ? { country: country.trim() } : {}),
    };
    try {
      if (!confirmMatches && (phone.trim() || email.trim() || (type === 'BUSINESS' && legalName.trim()))) {
        const duplicateResponse = await apiFetch('/api/customers/duplicates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...(phone.trim() ? { countryCode, phoneNumber: phone.trim() } : {}), ...(email.trim() ? { email: email.trim() } : {}), ...(type === 'BUSINESS' && legalName.trim() ? { businessName: legalName.trim() } : {}), ...(edit && detail ? { excludeCustomerId: detail.id } : {}) }) });
        if (!duplicateResponse.ok) throw new Error('Possible customer matches could not be checked. No changes were saved.');
        const matches = (await duplicateResponse.json() as { matches: typeof duplicateMatches }).matches;
        if (matches.length) { setDuplicateMatches(matches); setSaving(false); return; }
      }
      const response = await apiFetch(edit && detail ? `/api/customers/${detail.id}` : '/api/customers', { method: edit ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, ...(confirmMatches ? { confirmDuplicates: true } : {}) }) });
      if (response.status === 409) throw new Error('Possible duplicate customer found. Review the match before saving.');
      if (!response.ok) throw new Error(response.status === 403 ? 'You are not authorized to save this customer.' : 'Customer was not saved. Check the details and try again.');
      const saved = await response.json() as { id: string };
      setFormOpen(false); setDuplicateMatches([]); setNotice(edit ? 'Customer updated.' : 'Customer created.');
      navigate(`/customers/${saved.id}`); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Customer was not saved.'); }
    finally { setSaving(false); }
  }

  async function archiveCustomer(restore: boolean) {
    if (!detail || !window.confirm(`${restore ? 'Restore' : 'Archive'} ${detail.displayName}?`)) return;
    setSaving(true); setError('');
    try {
      const response = await apiFetch(`/api/customers/${detail.id}/${restore ? 'restore' : 'archive'}`, { method: 'POST' });
      if (!response.ok) throw new Error(response.status === 403 ? 'You are not authorized to change this customer state.' : 'Customer state could not be changed.');
      setNotice(restore ? 'Customer restored.' : 'Customer archived.');
      if (!restore) navigate('/customers');
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Customer state could not be changed.'); }
    finally { setSaving(false); }
  }

  async function addContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!detail) return; setSaving(true); setError('');
    try {
      const response = await apiFetch(`/api/customers/${detail.id}/contacts${contactEditId ? `/${contactEditId}` : ''}`, { method: contactEditId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fullName: contactName.trim(), ...(contactPhone ? { countryCode: countryCode, phoneNumber: contactPhone } : {}), ...(contactEmail ? { email: contactEmail } : {}), isPrimary: contactPrimary }) });
      if (!response.ok) throw new Error(response.status === 403 ? 'You are not authorized to add contacts.' : 'Contact was not saved.');
      setContactName(''); setContactPhone(''); setContactEmail(''); setContactPrimary(false); setContactEditId(null); setNotice(contactEditId ? 'Contact updated.' : 'Contact added.'); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Contact was not saved.'); }
    finally { setSaving(false); }
  }

  if (id) return <main className="customers-page">
    <button type="button" className="customer-back" onClick={() => navigate('/customers')}><ArrowLeft size={16}/> Customer directory</button>
    {error && <p className="customer-alert customer-alert--error" role="alert">{error}</p>}{notice && <p className="customer-alert" role="status">{notice}</p>}
    {loading && !detail ? <p className="customer-empty" role="status">Loading customer profile…</p> : detail && <>
      <header className="customer-heading"><div><p className="customer-eyebrow">{detail.customerNumber} · {detail.archivedAt ? 'Archived' : detail.status}</p><h2>{detail.displayName}</h2><p>{detail.type === 'BUSINESS' ? detail.legalName : 'Individual customer'} · Owned by {detail.ownerDisplayName ?? detail.owner?.user?.displayName ?? 'Staff'}</p></div><div className="customer-actions">
        {user?.permissions.includes('customers.update') && !detail.archivedAt && <button type="button" onClick={startEdit}>Edit profile</button>}
        {!detail.archivedAt && user?.permissions.includes('customers.archive') && <button type="button" onClick={() => void archiveCustomer(false)} disabled={saving}><Archive size={15}/> Archive</button>}
        {detail.archivedAt && user?.permissions.includes('customers.restore') && <button type="button" onClick={() => void archiveCustomer(true)} disabled={saving}><RotateCcw size={15}/> Restore</button>}
      </div></header>
      {duplicateMatches.length>0&&<DuplicateWarning matches={duplicateMatches} busy={saving} onConfirm={()=>void saveCustomer(undefined,true)} onCancel={()=>setDuplicateMatches([])}/>}
      {formOpen && <CustomerForm {...{name,setName,type,setType,status,setStatus,legalName,setLegalName,countryCode,setCountryCode,phone,setPhone,email,setEmail,city,setCity,country,setCountry,saving,edit,onSubmit:(event)=>void saveCustomer(event),onCancel:()=>setFormOpen(false)}}/>}
      <section className="customer-grid"><article className="customer-panel"><h3>Overview</h3><dl className="customer-definition"><div><dt>Phone</dt><dd>{detail.primaryPhone ? `${detail.primaryPhone}` : 'Not provided'}</dd></div><div><dt>Email</dt><dd>{detail.email ?? 'Not provided'}</dd></div><div><dt>Location</dt><dd>{[detail.city, detail.country].filter(Boolean).join(', ') || 'Not provided'}</dd></div><div><dt>Language</dt><dd>{detail.preferredLanguage ?? 'Not provided'}</dd></div><div><dt>Created</dt><dd>{new Date(detail.createdAt).toLocaleString()}</dd></div><div><dt>Owner</dt><dd>{detail.ownerDisplayName}</dd></div></dl></article>
        <article className="customer-panel"><h3>Additional contacts</h3>{detail.contacts.length ? <ul className="customer-contact-list">{detail.contacts.map((contact) => <li key={contact.id}><strong>{contact.fullName}{contact.isPrimary ? ' · Primary' : ''}</strong>{contact.designation && <span>{contact.designation}</span>}<span>{contact.phoneNumber ?? contact.email ?? 'No contact method'}</span>{user?.permissions.includes('contacts.update')&&!detail.archivedAt&&<button type="button" aria-label={`Edit contact ${contact.fullName}`} onClick={()=>{setContactEditId(contact.id);setContactName(contact.fullName);setContactPhone(contact.phoneNumber??'');setContactEmail(contact.email??'');setContactPrimary(contact.isPrimary)}}>Edit contact</button>}</li>)}</ul> : <p className="customer-muted">No additional contacts.</p>}
          {!detail.archivedAt && user?.permissions.includes('contacts.create') && <form className="customer-inline-form" onSubmit={(event) => void addContact(event)}><h4>{contactEditId?'Edit contact':'Add contact'}</h4><label>Name<input required minLength={2} value={contactName} onChange={(event) => setContactName(event.target.value)}/></label><label>Phone<input inputMode="tel" value={contactPhone} onChange={(event)=>setContactPhone(event.target.value)}/></label><label>Email<input type="email" value={contactEmail} onChange={(event)=>setContactEmail(event.target.value)}/></label><label className="customer-check"><input type="checkbox" checked={contactPrimary} onChange={(event)=>setContactPrimary(event.target.checked)}/> Set as primary contact</label><button disabled={saving}>{contactEditId?'Save contact':'Add contact'}</button>{contactEditId&&<button type="button" onClick={()=>{setContactEditId(null);setContactName('');setContactPhone('');setContactEmail('');setContactPrimary(false)}}>Cancel contact edit</button>}</form>}
        </article>
        <article className="customer-panel"><h3>Related leads</h3>{detail.leadLinks.length ? <ul className="customer-related-list">{detail.leadLinks.map((link)=><li key={link.lead.id}><Link to={`/leads?lead=${link.lead.id}`}>{link.lead.leadNumber} · {link.lead.fullName}</Link><span>{link.lead.status.replaceAll('_',' ')} · {link.linkType.toLowerCase()}</span></li>)}</ul>:<p className="customer-muted">No linked leads.</p>}</article>
        <article className="customer-panel"><h3>Customer activity</h3>{detail.activities.length ? <ol className="customer-activity-list">{detail.activities.map((activity)=><li key={activity.id}><strong>{activity.eventType.replaceAll('_',' ').toLowerCase()}</strong><span>{activity.actor?.user?.displayName ?? 'Staff'} · {new Date(activity.occurredAt).toLocaleString()}</span></li>)}</ol>:<p className="customer-muted">Activity history is not available yet.</p>}</article>
        <article className="customer-panel customer-panel--muted"><h3>Future bookings</h3><p>Booking history will be available when the bookings module is implemented.</p></article><article className="customer-panel customer-panel--muted"><h3>Future invoices</h3><p>Invoice history will be available when the finance module is implemented.</p></article>
      </section>
    </>}
  </main>;

  return <main className="customers-page">
    <header className="customer-heading"><div><p className="customer-eyebrow">CUSTOMER RELATIONSHIPS</p><h2>CUSTOMER MANAGEMENT</h2><p>Manage customer relationships, contacts and travel history.</p></div>{user?.permissions.includes('customers.create')&&<button className="customer-primary" type="button" onClick={startCreate}><UserRound size={16}/> Add Customer</button>}</header>
    {error&&<p className="customer-alert customer-alert--error" role="alert">{error}</p>}{notice&&<p className="customer-alert" role="status">{notice}</p>}
    <section className="customer-kpis" aria-label="Customer metrics">{[['Total customers',summary?.total],['Active customers',summary?.active],['Individuals',summary?.individual],['Businesses',summary?.business]].map(([label,value])=><article key={String(label)}><span>{label}</span><strong>{typeof value==='number'?value.toLocaleString():'—'}</strong><small>{summary?'Current organization':'Metrics unavailable'}</small></article>)}</section>
    <section className="customer-directory"><div className="customer-toolbar"><label>Search customers<input type="search" value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Name, number, phone or email"/></label><label>Records<select value={state} onChange={(event)=>setState(event.target.value as 'active'|'archived')}><option value="active">Active</option><option value="archived">Archived</option></select></label><label>Type<select aria-label="Customer type filter" value={typeFilter} onChange={(event)=>setTypeFilter(event.target.value)}><option value="">All types</option><option value="INDIVIDUAL">Individual</option><option value="BUSINESS">Business</option></select></label><label>Status<select aria-label="Customer status filter" value={statusFilter} onChange={(event)=>setStatusFilter(event.target.value)}><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label></div>
      {loading?<p className="customer-empty" role="status">Loading customers…</p>:rows.length===0?<p className="customer-empty">No customers available.</p>:<div className="customer-table-scroll"><table><thead><tr><th>Customer number</th><th>Name / company</th><th>Type</th><th>Contact</th><th>Owner</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead><tbody>{rows.map((customer)=><tr key={customer.id}><td>{customer.customerNumber}</td><td><Link to={`/customers/${customer.id}`}><strong>{customer.displayName}</strong></Link>{customer.legalName&&<small>{customer.legalName}</small>}</td><td>{customer.type==='BUSINESS'?<><Building2 size={14}/> Business</>:<><UserRound size={14}/> Individual</>}</td><td>{customer.primaryPhone??customer.email??'—'}</td><td>{customer.ownerDisplayName}</td><td><span className={`customer-status customer-status--${customer.archivedAt?'archived':customer.status.toLowerCase()}`}>{customer.archivedAt?'Archived':customer.status}</span></td><td>{new Date(customer.createdAt).toLocaleDateString()}</td><td><Link to={`/customers/${customer.id}`}>View</Link></td></tr>)}</tbody></table></div>}
      {nextCursor&&<button className="customer-load-more" type="button" disabled={loading} onClick={()=>void load(nextCursor)}>Load more customers</button>}
    </section>
    {duplicateMatches.length>0&&<DuplicateWarning matches={duplicateMatches} busy={saving} onConfirm={()=>void saveCustomer(undefined,true)} onCancel={()=>setDuplicateMatches([])}/>}
    {formOpen&&<CustomerForm {...{name,setName,type,setType,status,setStatus,legalName,setLegalName,countryCode,setCountryCode,phone,setPhone,email,setEmail,city,setCity,country,setCountry,saving,edit,onSubmit:(event)=>void saveCustomer(event),onCancel:()=>{setFormOpen(false);setDuplicateMatches([])}}}/>}
  </main>;
}

export function ContactsPage() {
  const { apiFetch } = useAuth();
  const [contacts, setContacts] = useState<Array<Contact & { customer: { id: string; customerNumber: string; displayName: string } }>>([]);
  const [search, setSearch] = useState(''); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  useEffect(() => { let mounted = true; const timer=window.setTimeout(()=>{ void (async()=>{setLoading(true);setError('');try { const response=await apiFetch(`/api/customers/contacts?take=50${search.trim()?`&search=${encodeURIComponent(search.trim())}`:''}`);if(!response.ok)throw new Error('Contacts could not be loaded.');const page=await response.json() as Page<Contact & {customer:{id:string;customerNumber:string;displayName:string}}>;if(mounted)setContacts(page.items);}catch(cause){if(mounted)setError(cause instanceof Error?cause.message:'Contacts could not be loaded.');}finally{if(mounted)setLoading(false);}})();},160);return()=>{mounted=false;window.clearTimeout(timer)};},[apiFetch,search]);
  return <main className="customers-page"><header className="customer-heading"><div><p className="customer-eyebrow">CUSTOMER RELATIONSHIPS</p><h2>CONTACTS</h2><p>People associated with customers in your authorized organization.</p></div></header><section className="customer-directory"><div className="customer-toolbar"><label>Search contacts<input type="search" value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Name, customer, phone or email"/></label></div>{error&&<p role="alert" className="customer-alert customer-alert--error">{error}</p>}{loading?<p role="status" className="customer-empty">Loading contacts…</p>:contacts.length===0?<p className="customer-empty">No contacts available.</p>:<div className="customer-table-scroll"><table><thead><tr><th>Name</th><th>Customer</th><th>Phone</th><th>Email</th><th>Preferred method</th></tr></thead><tbody>{contacts.map((contact)=><tr key={contact.id}><td>{contact.fullName}{contact.isPrimary?' · Primary':''}</td><td><Link to={`/customers/${contact.customer.id}`}>{contact.customer.customerNumber} · {contact.customer.displayName}</Link></td><td>{contact.phoneNumber??'—'}</td><td>{contact.email??'—'}</td><td>{contact.preferredMethod??'—'}</td></tr>)}</tbody></table></div>}</section></main>;
}

type CustomerFormProps = {
  name: string; setName: (value: string) => void;
  type: 'INDIVIDUAL' | 'BUSINESS'; setType: (value: 'INDIVIDUAL' | 'BUSINESS') => void;
  status: 'ACTIVE' | 'INACTIVE'; setStatus: (value: 'ACTIVE' | 'INACTIVE') => void;
  legalName: string; setLegalName: (value: string) => void;
  countryCode: string; setCountryCode: (value: string) => void;
  phone: string; setPhone: (value: string) => void;
  email: string; setEmail: (value: string) => void;
  city: string; setCity: (value: string) => void;
  country: string; setCountry: (value: string) => void;
  saving: boolean; edit: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void;
};

function CustomerForm(props: CustomerFormProps) {
  return <section className="customer-form-panel" aria-labelledby="customer-form-heading"><div className="customer-form-heading"><h3 id="customer-form-heading">{props.edit?'Edit customer':'Add customer'}</h3><button type="button" onClick={props.onCancel} disabled={props.saving}>Cancel</button></div><form onSubmit={props.onSubmit}><div className="customer-form-grid"><label>Customer type<select disabled={props.edit} value={props.type} onChange={(e)=>props.setType(e.target.value as 'INDIVIDUAL'|'BUSINESS')}><option value="INDIVIDUAL">Individual</option><option value="BUSINESS">Business / Corporate</option></select></label><label>Customer status<select value={props.status} onChange={(e)=>props.setStatus(e.target.value as 'ACTIVE'|'INACTIVE')}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label><label>Display name<input required minLength={2} maxLength={160} value={props.name} onChange={(e)=>props.setName(e.target.value)}/></label>{props.type==='BUSINESS'&&<label>Legal business name<input required maxLength={180} value={props.legalName} onChange={(e)=>props.setLegalName(e.target.value)}/></label>}<label>Country calling code<input pattern="\+[1-9]\d{0,3}" value={props.countryCode} onChange={(e)=>props.setCountryCode(e.target.value)}/></label><label>Phone<input inputMode="tel" pattern="\d{6,15}" value={props.phone} onChange={(e)=>props.setPhone(e.target.value)}/></label><label>Email<input type="email" maxLength={320} value={props.email} onChange={(e)=>props.setEmail(e.target.value)}/></label><label>City<input maxLength={100} value={props.city} onChange={(e)=>props.setCity(e.target.value)}/></label><label>Country<input maxLength={80} value={props.country} onChange={(e)=>props.setCountry(e.target.value)}/></label></div><p className="customer-muted">This creates a CRM profile only. It does not create a portal login.</p><button className="customer-primary" type="submit" disabled={props.saving}>{props.saving?'Saving…':props.edit?'Save changes':'Create customer'}</button></form></section>;
}

function DuplicateWarning({ matches, busy, onConfirm, onCancel }: { matches: Array<{ id:string; customerNumber:string; displayName:string; matchedBy:string[] }>; busy:boolean; onConfirm:()=>void; onCancel:()=>void }) {
  return <section className="customer-duplicate-warning" role="alert"><h3>Possible matching customers</h3><p>Review these organization-scoped matches. Continue only if this is a legitimate separate customer record.</p><ul>{matches.map((match)=><li key={match.id}>{match.customerNumber} · {match.displayName} · {match.matchedBy.join(', ')}</li>)}</ul><button type="button" disabled={busy} onClick={onConfirm}>Continue with separate customer</button><button type="button" disabled={busy} onClick={onCancel}>Cancel</button></section>;
}
