import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { OrganizationAccessPage } from './OrganizationAccessPage';

const state = vi.hoisted(() => ({
  auth: {
    user: null as unknown,
    loading: false,
    organizations: [{ id: 'org-a', name: 'Internal Branch A' }, { id: 'org-b', name: 'Internal Branch B' }],
    activeOrganizationId: null as string | null,
    needsOrganizationSelection: true,
    accessDenied: false,
    providerError: null as string | null,
    selectOrganization: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock('../../../app/providers/AuthProvider', () => ({ useAuth: () => state.auth }));

function renderPage(path = '/select-organization') {
  return render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/select-organization" element={<OrganizationAccessPage />} />
    <Route path="/access-denied" element={<OrganizationAccessPage />} />
    <Route path="/" element={<p>Workspace ready</p>} />
  </Routes></MemoryRouter>);
}

afterEach(() => {
  cleanup();
  state.auth.user = null;
  state.auth.loading = false;
  state.auth.organizations = [{ id: 'org-a', name: 'Internal Branch A' }, { id: 'org-b', name: 'Internal Branch B' }];
  state.auth.activeOrganizationId = null;
  state.auth.needsOrganizationSelection = true;
  state.auth.accessDenied = false;
  state.auth.providerError = null;
  state.auth.selectOrganization.mockReset();
  state.auth.logout.mockReset();
});

describe('OrganizationAccessPage', () => {
  it('offers only bootstrap-provided memberships and selects the chosen organization', async () => {
    state.auth.selectOrganization.mockResolvedValue(undefined);
    renderPage();
    const choice = screen.getByRole('combobox', { name: 'Organization' });
    expect(choice).toHaveTextContent('Internal Branch A');
    expect(choice).toHaveTextContent('Internal Branch B');
    await userEvent.selectOptions(choice, 'org-b');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(state.auth.selectOrganization).toHaveBeenCalledWith('org-b'));
    expect(await screen.findByText('Workspace ready')).toBeInTheDocument();
  });

  it('shows access denied when no eligible membership is returned', () => {
    state.auth.organizations = [];
    state.auth.needsOrganizationSelection = false;
    state.auth.accessDenied = true;
    renderPage('/access-denied');
    expect(screen.getByRole('heading', { name: 'Access unavailable' })).toBeInTheDocument();
    expect(screen.getByText(/no active organization access/i)).toBeInTheDocument();
  });

  it('keeps the selection screen open and reports authorization failure', async () => {
    state.auth.selectOrganization.mockRejectedValue(new Error('Organization access could not be verified.'));
    renderPage();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Organization' }), 'org-a');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Organization access could not be verified.');
  });
});
