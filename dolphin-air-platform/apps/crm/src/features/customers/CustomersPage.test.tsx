import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CustomersPage } from './CustomersPage';

const auth = vi.hoisted(() => ({ apiFetch: vi.fn(), permissions: ['customers.read','customers.create','customers.update','customers.archive','customers.restore','contacts.read','contacts.create'] as string[] }));
vi.mock('../../app/providers/AuthProvider', () => ({ useAuth: () => ({ apiFetch: auth.apiFetch, user: { permissions: auth.permissions } }) }));

const customer = { id:'00000000-0000-4000-8000-000000000011', customerNumber:'CU-LOCAL', type:'INDIVIDUAL' as const, displayName:'Synthetic Pilgrim', legalName:null, primaryPhone:'9876543210', email:'pilgrim@example.invalid', status:'ACTIVE', ownerMembershipId:'membership-a', ownerDisplayName:'Synthetic Sales', createdAt:'2026-01-01T00:00:00Z', archivedAt:null };
const detail = { ...customer, countryCode:'+91', city:'Kochi', country:'India', preferredLanguage:'Malayalam', owner:{user:{displayName:'Synthetic Sales'}}, contacts:[], activities:[], leadLinks:[] };
const page=(items: unknown[]=[customer])=>({items,nextCursor:null});
const response=(body:unknown,status=200)=>({ok:status>=200&&status<300,status,json:async()=>body} as Response);

function renderAt(path='/customers') { return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/customers" element={<CustomersPage/>}/><Route path="/customers/:id" element={<CustomersPage/>}/></Routes></MemoryRouter>); }

beforeEach(()=>{ auth.apiFetch.mockReset();auth.permissions=['customers.read','customers.create','customers.update','customers.archive','customers.restore','contacts.read','contacts.create'];vi.stubGlobal('confirm',vi.fn(()=>true)); });
afterEach(()=>{cleanup();vi.unstubAllGlobals();});

describe('CustomersPage',()=>{
  it('shows only customer records returned by the organization-scoped API',async()=>{
    auth.apiFetch.mockImplementation(async(path:string)=>path==='/api/customers/summary'?response({total:1,active:1,individual:1,business:0}):response(page()));
    renderAt();
    expect(await screen.findByText('CU-LOCAL')).toBeInTheDocument();
    expect(screen.getByText('Synthetic Pilgrim')).toBeInTheDocument();
    expect(screen.getAllByText('1',{selector:'strong'})).toHaveLength(3);
  });

  it('creates a customer and opens the real profile route after a successful response',async()=>{
    auth.apiFetch.mockImplementation(async(path:string,init?:RequestInit)=>{
      if(path==='/api/customers/summary')return response({total:0,active:0,individual:0,business:0});
      if(path.startsWith('/api/customers?'))return response(page([]));
      if(path==='/api/customers'&&init?.method==='POST')return response({id:customer.id},201);
      if(path===`/api/customers/${customer.id}`)return response(detail);
      return response({});
    });
    renderAt(); await userEvent.click(await screen.findByRole('button',{name:/add customer/i}));
    await userEvent.type(screen.getByLabelText('Display name'),'Synthetic Pilgrim');
    await userEvent.click(screen.getByRole('button',{name:'Create customer'}));
    await waitFor(()=>expect(auth.apiFetch).toHaveBeenCalledWith('/api/customers',expect.objectContaining({method:'POST'})));
    expect(await screen.findByRole('heading',{name:'Synthetic Pilgrim'})).toBeInTheDocument();
  });

  it('requires duplicate review before permitting an intentional separate record',async()=>{
    auth.apiFetch.mockImplementation(async(path:string,init?:RequestInit)=>{
      if(path==='/api/customers/summary')return response({total:0,active:0,individual:0,business:0});
      if(path.startsWith('/api/customers?'))return response(page([]));
      if(path==='/api/customers/duplicates')return response({matches:[{id:customer.id,customerNumber:customer.customerNumber,displayName:customer.displayName,type:'INDIVIDUAL',matchedBy:['phone']}]});
      if(path==='/api/customers'&&init?.method==='POST')return response({id:customer.id},201);
      if(path===`/api/customers/${customer.id}`)return response(detail);
      return response({});
    });
    renderAt(); await userEvent.click(await screen.findByRole('button',{name:/add customer/i}));
    await userEvent.type(screen.getByLabelText('Display name'),'Another Pilgrim'); await userEvent.type(screen.getByLabelText('Phone'),'9876543210');
    await userEvent.click(screen.getByRole('button',{name:'Create customer'}));
    expect(await screen.findByText('Possible matching customers')).toBeInTheDocument();
    expect(auth.apiFetch).not.toHaveBeenCalledWith('/api/customers',expect.objectContaining({method:'POST'}));
    await userEvent.click(screen.getByRole('button',{name:'Continue with separate customer'}));
    await waitFor(()=>expect(auth.apiFetch).toHaveBeenCalledWith('/api/customers',expect.objectContaining({method:'POST',body:expect.stringContaining('confirmDuplicates')})));
  });

  it('renders contacts, activity and related leads in a customer profile',async()=>{
    auth.apiFetch.mockResolvedValue(response(detail));
    renderAt(`/customers/${customer.id}`);
    expect(await screen.findByRole('heading',{name:'Synthetic Pilgrim'})).toBeInTheDocument();
    expect(screen.getByText('Additional contacts')).toBeInTheDocument();
    expect(screen.getByText('Related leads')).toBeInTheDocument();
    expect(screen.getByText('Customer activity')).toBeInTheDocument();
    expect(screen.getByText(/Future bookings/)).toBeInTheDocument();
  });

  it('prefills profile edits and persists a customer status change',async()=>{
    let current = detail;
    auth.apiFetch.mockImplementation(async(path:string,init?:RequestInit)=>{
      if(path==='/api/customers/duplicates')return response({matches:[]});
      if(path===`/api/customers/${customer.id}`&&init?.method==='PATCH'){
        const body=JSON.parse(String(init.body)) as {status:string}; current={...current,status:body.status}; return response({id:customer.id});
      }
      if(path===`/api/customers/${customer.id}`)return response(current);
      return response({});
    });
    renderAt(`/customers/${customer.id}`);
    await screen.findByRole('heading',{name:'Synthetic Pilgrim'});
    await userEvent.click(screen.getByRole('button',{name:'Edit profile'}));
    expect(screen.getByLabelText('Display name')).toHaveValue('Synthetic Pilgrim');
    await userEvent.selectOptions(screen.getByLabelText('Customer status'),'INACTIVE');
    await userEvent.click(screen.getByRole('button',{name:'Save changes'}));
    await waitFor(()=>expect(auth.apiFetch).toHaveBeenCalledWith(`/api/customers/${customer.id}`,expect.objectContaining({method:'PATCH',body:expect.stringContaining('INACTIVE')})));
    expect(await screen.findByText(/· INACTIVE/)).toBeInTheDocument();
  });

  it('keeps the server error visible and does not navigate on failed create',async()=>{
    auth.apiFetch.mockImplementation(async(path:string)=>path==='/api/customers/summary'?response({total:0,active:0,individual:0,business:0}):path.startsWith('/api/customers?')?response(page([])):response({},403));
    renderAt(); await userEvent.click(await screen.findByRole('button',{name:/add customer/i}));
    await userEvent.type(screen.getByLabelText('Display name'),'Blocked customer'); await userEvent.click(screen.getByRole('button',{name:'Create customer'}));
    expect(await screen.findByRole('alert')).toHaveTextContent(/not authorized to save/i);
    expect(screen.getByRole('heading',{name:'Add customer'})).toBeInTheDocument();
  });

  it('hides customer creation when permission is absent',async()=>{
    auth.permissions=['customers.read']; auth.apiFetch.mockImplementation(async(path:string)=>path==='/api/customers/summary'?response({total:0,active:0,individual:0,business:0}):response(page([])));
    renderAt(); await screen.findByText('No customers available.');
    expect(screen.queryByRole('button',{name:/add customer/i})).not.toBeInTheDocument();
  });
});
