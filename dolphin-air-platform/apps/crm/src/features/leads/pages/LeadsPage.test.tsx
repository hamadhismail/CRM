import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeadsPage } from './LeadsPage';

const auth = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  permissions: ['leads.read', 'leads.create', 'leads.update'] as string[],
}));

vi.mock('../../../app/providers/AuthProvider', () => ({
  useAuth: () => ({ apiFetch: auth.apiFetch, user: { permissions: auth.permissions } }),
}));

const lead = {
  id: '00000000-0000-4000-8000-000000000001', leadNumber: 'LD-TEST', fullName: 'Test Pilgrim',
  service: 'UMRAH', source: 'Website', status: 'NEW', priority: 'NORMAL', assignedMembershipId: null,
  createdAt: '2026-01-01T00:00:00Z',
};
const detail = {
  ...lead, countryCode: '+91', phoneNumber: '9876543210', email: 'test@example.invalid', description: null,
  updatedAt: '2026-01-02T00:00:00Z', archivedAt: null,
  notes: [{ id: 'n1', body: 'Call next week', createdAt: '2026-01-02T00:00:00Z' }],
  events: [{ id: 'e1', eventType: 'created', occurredAt: '2026-01-01T00:00:00Z' }],
};
const page = (items = [lead]) => ({ items, nextCursor: null });
const response = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300, status, json: async () => body,
} as Response);

beforeEach(() => {
  auth.apiFetch.mockReset();
  auth.permissions = ['leads.read', 'leads.create', 'leads.update'];
  vi.stubGlobal('confirm', vi.fn(() => true));
});

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('LeadsPage', () => {
  it('loads the active list by default and renders returned lead data', async () => {
    auth.apiFetch.mockResolvedValue(response(page()));
    render(<LeadsPage />);
    expect(await screen.findByText('Test Pilgrim')).toBeInTheDocument();
    expect(auth.apiFetch).toHaveBeenCalledWith('/api/leads?state=active&take=25');
  });

  it('exposes an accessible loading state while the list request is pending', async () => {
    auth.apiFetch.mockReturnValue(new Promise(() => undefined));
    render(<LeadsPage />);
    expect(await screen.findByRole('status')).toHaveTextContent(/loading leads/i);
  });

  it('switches to the archived list and restores a lead after confirmation', async () => {
    auth.apiFetch.mockResolvedValueOnce(response(page([])))
      .mockResolvedValueOnce(response(page()))
      .mockResolvedValueOnce(response({ archived: false }))
      .mockResolvedValue(response(page([])));
    render(<LeadsPage />);
    await screen.findByText('No leads available.');
    await userEvent.selectOptions(screen.getByLabelText('View'), 'archived');
    await userEvent.click(await screen.findByRole('button', { name: /restore/i }));
    expect(window.confirm).toHaveBeenCalledWith('Restore Test Pilgrim?');
    expect(auth.apiFetch).toHaveBeenCalledWith('/api/leads?state=archived&take=25');
    expect(auth.apiFetch).toHaveBeenCalledWith(expect.stringContaining('/restore'), expect.objectContaining({ method: 'POST' }));
    await waitFor(() => expect(auth.apiFetch).toHaveBeenCalledTimes(4));
  });

  it('creates a lead with validated form fields and reloads the list', async () => {
    auth.apiFetch.mockResolvedValue(response(page([])));
    render(<LeadsPage />);
    await screen.findByText('No leads available.');
    await userEvent.click(screen.getByRole('button', { name: /add lead/i }));
    await userEvent.type(screen.getByLabelText('Customer name'), 'Test Pilgrim');
    await userEvent.type(screen.getByLabelText('Phone number'), '9876543210');
    await userEvent.type(screen.getByLabelText('Lead source'), 'Website');
    await userEvent.click(screen.getByRole('button', { name: 'Save lead' }));
    await waitFor(() => expect(auth.apiFetch).toHaveBeenCalledWith('/api/leads', expect.objectContaining({ method: 'POST' })));
    expect(await screen.findByText('No leads available.')).toBeInTheDocument();
  });

  it('renders details and history, submits edits, and refreshes detail data', async () => {
    auth.apiFetch.mockImplementation(async (path: string) => path === `/api/leads/${lead.id}`
      ? response(detail) : path.includes('?') ? response(page()) : response({}));
    render(<LeadsPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'View Test Pilgrim' }));
    expect(await screen.findByText('Call next week')).toBeInTheDocument();
    expect(screen.getByText('created')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Edited Pilgrim' } });
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(auth.apiFetch).toHaveBeenCalledWith(`/api/leads/${lead.id}`, expect.objectContaining({ method: 'PATCH' })));
    expect(await screen.findByRole('heading', { name: 'Test Pilgrim' })).toBeInTheDocument();
  });

  it('sends status changes to the guarded status endpoint', async () => {
    auth.apiFetch.mockImplementation(async (path: string) => path === `/api/leads/${lead.id}`
      ? response(detail) : path.includes('?') ? response(page()) : response({}));
    render(<LeadsPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'View Test Pilgrim' }));
    await screen.findByText('Call next week');
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'CONTACTED');
    await waitFor(() => expect(auth.apiFetch).toHaveBeenCalledWith(`/api/leads/${lead.id}/status`, expect.objectContaining({ method: 'PATCH' })));
  });

  it('shows and submits notes, then reloads the selected lead', async () => {
    auth.apiFetch.mockImplementation(async (path: string) => path === `/api/leads/${lead.id}`
      ? response(detail) : path.includes('?') ? response(page()) : response({}));
    render(<LeadsPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'View Test Pilgrim' }));
    await userEvent.type(await screen.findByLabelText('Add note'), 'Discuss dates');
    await userEvent.click(screen.getByRole('button', { name: 'Add note' }));
    await waitFor(() => expect(auth.apiFetch).toHaveBeenCalledWith(`/api/leads/${lead.id}/notes`, expect.objectContaining({ method: 'POST' })));
  });

  it('requires confirmation before archiving', async () => {
    auth.apiFetch.mockImplementation(async (path: string) => path === `/api/leads/${lead.id}`
      ? response(detail) : path.includes('?') ? response(page()) : response({}));
    render(<LeadsPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'View Test Pilgrim' }));
    await screen.findByText('Call next week');
    await userEvent.click(screen.getByRole('button', { name: /archive/i }));
    expect(window.confirm).toHaveBeenCalledWith('Archive Test Pilgrim?');
    expect(auth.apiFetch).toHaveBeenCalledWith(`/api/leads/${lead.id}`, expect.objectContaining({ method: 'DELETE' }));
  });

  it('shows a server error without pretending a failed create succeeded', async () => {
    auth.apiFetch.mockResolvedValueOnce(response(page([]))).mockResolvedValueOnce(response({}, 403));
    render(<LeadsPage />);
    await screen.findByText('No leads available.');
    await userEvent.click(screen.getByRole('button', { name: /add lead/i }));
    await userEvent.type(screen.getByLabelText('Customer name'), 'Test Pilgrim');
    await userEvent.type(screen.getByLabelText('Phone number'), '9876543210');
    await userEvent.type(screen.getByLabelText('Lead source'), 'Website');
    await userEvent.click(screen.getByRole('button', { name: 'Save lead' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Lead was not saved.');
    expect(screen.getByRole('heading', { name: 'Add lead' })).toBeInTheDocument();
  });

  it('shows an unavailable state for a blocked API and hides create actions', async () => {
    auth.apiFetch.mockResolvedValue(response({}, 503));
    render(<LeadsPage />);
    expect(await screen.findByText(/lead access is unavailable/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add lead/i })).not.toBeInTheDocument();
  });

  it('hides mutation controls without update permission', async () => {
    auth.permissions = ['leads.read'];
    auth.apiFetch.mockImplementation(async (path: string) => path === `/api/leads/${lead.id}`
      ? response(detail) : path.includes('?') ? response(page()) : response({}));
    render(<LeadsPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'View Test Pilgrim' }));
    await screen.findByText('Call next week');
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add lead/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /archive/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add note' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Status')).not.toBeInTheDocument();
  });
});
