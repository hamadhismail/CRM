import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { loadEnvFile } from 'node:process';
import { resolve } from 'node:path';

type E2EUser = { id: string; uid: string; email: string; password: string };
type E2EFixture = {
  orgIds: Record<string, string>;
  membershipIds: Record<string, string>;
  foreignLeadId: string;
  users: Record<string, E2EUser>;
  orgNames: Record<string, string>;
};

let fixture: E2EFixture;
let multiToken = '';

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  fixture = JSON.parse(await readFile(resolve('.playwright/fixture.json'), 'utf8')) as E2EFixture;
});

async function signIn(page: Page, user: E2EUser) {
  const tokenPromise = new Promise<string>((resolveToken, reject) => {
    const timeout = setTimeout(() => reject(new Error('CRM did not make a signed authenticated API request.')), 15_000);
    page.on('request', (request) => {
      if (!request.url().includes('/api/') || !request.headers()['authorization']) return;
      clearTimeout(timeout);
      resolveToken(request.headers()['authorization'].replace(/^Bearer\s+/i, ''));
    });
  });
  await page.goto('/login');
  await page.getByLabel('Work email').fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  return tokenPromise;
}

test('multi-organization staff completes authenticated Leads workflows, switching, restoration and revocation', async ({ page, request: apiRequest }) => {
  const profileRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/api/auth/me')) profileRequests.push(request.url());
  });
  const tokenPromise = signIn(page, fixture.users.multi);
  await expect(page).toHaveURL(/select-organization/);
  await expect(page.getByLabel('Main navigation')).toHaveCount(0);
  expect(profileRequests).toHaveLength(0);
  const selector = page.getByLabel('Organization', { exact: true });
  await expect(selector.locator('option')).toHaveCount(3);
  await expect(page.getByRole('heading', { name: 'Choose your organization' })).toBeVisible();
  await selector.selectOption(fixture.orgIds.multiA);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  expect(profileRequests.length).toBeGreaterThan(0);
  multiToken = await tokenPromise;

  await page.getByRole('link', { name: 'Leads', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Leads management' })).toBeVisible();
  await expect(page.getByText('No leads available.')).toBeVisible();
  await page.getByRole('button', { name: 'Add lead' }).click();
  await page.getByLabel('Customer name').fill('Synthetic Browser Lead');
  await page.getByLabel('Phone number').fill('9876505678');
  await page.getByLabel('Lead source').fill('Playwright Local');
  await page.getByRole('button', { name: 'Save lead' }).click();
  await expect(page.getByText('Synthetic Browser Lead')).toBeVisible();

  // Duplicate detection is an advisory API check; cancel here to prove the
  // warning is scoped and no lead is saved until the user explicitly proceeds.
  await page.getByRole('button', { name: 'Add lead' }).click();
  await page.getByLabel('Customer name').fill('Synthetic Browser Repeat Inquiry');
  await page.getByLabel('Phone number').fill('9876505678');
  await page.getByLabel('Lead source').fill('Playwright Local Repeat');
  await page.getByRole('button', { name: 'Save lead' }).click();
  await expect(page.getByRole('heading', { name: 'Possible matching leads' })).toBeVisible();
  await expect(page.getByRole('alert', { name: 'Possible matching leads' }).getByText('Synthetic Browser Lead')).toBeVisible();
  await page.getByRole('alert', { name: 'Possible matching leads' }).getByRole('button', { name: 'Cancel', exact: true }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('section[aria-labelledby="new-lead-heading"]').getByRole('button', { name: 'Cancel', exact: true }).click();

  await page.getByRole('button', { name: 'View Synthetic Browser Lead' }).click();
  await expect(page.getByRole('heading', { name: 'Synthetic Browser Lead' })).toBeVisible();

  await page.getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('Name', { exact: true }).fill('Synthetic Browser Lead Edited');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('heading', { name: 'Synthetic Browser Lead Edited' })).toBeVisible();

  await page.getByRole('button', { name: 'Assign', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Assign lead' })).toBeVisible();
  await page.getByLabel('Eligible staff').selectOption({ label: 'Synthetic Eligible E2E Assignee' });
  await page.getByRole('button', { name: 'Assign lead' }).click();
  await expect(page.getByText('Synthetic Eligible E2E Assignee')).toBeVisible();
  await page.getByRole('button', { name: 'Reassign', exact: true }).click();
  await page.getByLabel('Eligible staff').selectOption(fixture.membershipIds.multiA);
  await page.getByRole('button', { name: 'Save reassignment' }).click();
  await page.getByRole('button', { name: 'Reassign', exact: true }).click();
  await expect(page.getByRole('dialog').getByText(`Synthetic Eligible E2E Assignee → Synthetic ${fixture.users.multi.uid}`)).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();

  await page.getByLabel('Status').selectOption('CONTACTED');
  await expect(page.getByLabel('Status')).toHaveValue('CONTACTED');
  await page.getByLabel('Add note').fill('Synthetic browser test note');
  await page.getByRole('button', { name: 'Add note' }).click();
  await expect(page.getByText('Synthetic browser test note')).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Archive' }).click();
  await expect(page.getByText('No leads available.')).toBeVisible();
  await page.getByLabel('View').selectOption('archived');
  await expect(page.getByText('Synthetic Browser Lead Edited')).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Restore' }).click();
  await expect(page.getByText('No leads available.')).toBeVisible();
  await page.getByLabel('View').selectOption('active');
  await expect(page.getByText('Synthetic Browser Lead Edited')).toBeVisible();

  await page.getByLabel('Status').selectOption('WON');
  await page.getByRole('button', { name: 'Review conversion' }).click();
  await expect(page.getByText('This lead is eligible for conversion.')).toBeVisible();
  await page.getByRole('button', { name: 'Create customer profile' }).click();
  await expect(page).toHaveURL(/customers\//);
  await expect(page.getByRole('heading', { name: 'Synthetic Browser Lead Edited' })).toBeVisible();
  await page.getByRole('button', { name: 'Edit profile' }).click();
  await page.getByLabel('City').fill('Kochi');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Kochi')).toBeVisible();
  await page.getByLabel('Name', { exact: true }).fill('Synthetic Browser Customer Contact');
  await page.getByLabel('Email', { exact: true }).last().fill('browser-contact@example.invalid');
  await page.getByRole('button', { name: 'Add contact' }).click();
  await expect(page.getByText('Synthetic Browser Customer Contact')).toBeVisible();
  await page.getByRole('link', { name: 'Customers', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'CUSTOMER MANAGEMENT' })).toBeVisible();
  await page.getByRole('button', { name: 'Add Customer' }).click();
  await page.getByLabel('Display name').fill('Synthetic Browser Manual Customer');
  const manualCustomerResponse = page.waitForResponse((response) => response.url().endsWith('/api/customers') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Create customer' }).click();
  const createdManually = await manualCustomerResponse;
  expect(createdManually.ok(), `Manual customer creation returned ${createdManually.status()}: ${await createdManually.text()}`).toBeTruthy();
  await expect(page.getByRole('heading', { name: 'Synthetic Browser Manual Customer' })).toBeVisible();
  await page.getByRole('link', { name: 'Contacts', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'CONTACTS', exact: true })).toBeVisible();
  await expect(page.getByText('Synthetic Browser Customer Contact')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Contacts', exact: true })).toBeVisible();
  await expect(page.getByLabel('Active organization')).toHaveValue(fixture.orgIds.multiA);
  await page.getByLabel('Active organization').selectOption(fixture.orgIds.multiB);
  await expect(page.getByLabel('Active organization')).toHaveValue(fixture.orgIds.multiB);
  await page.getByRole('link', { name: 'Leads', exact: true }).click();
  await expect(page.getByText('No leads available.')).toBeVisible();
  await page.getByLabel('Active organization').selectOption(fixture.orgIds.multiA);
  await page.getByRole('link', { name: 'Leads', exact: true }).click();
  await expect(page.getByText('Synthetic Browser Lead Edited')).toBeVisible();

  const missingAuth = await apiRequest.get('http://127.0.0.1:3001/api/leads');
  expect(missingAuth.status()).toBe(401);
  const forged = await apiRequest.get('http://127.0.0.1:3001/api/auth/organizations', { headers: { Authorization: 'Bearer forged.invalid.token' } });
  expect(forged.status()).toBe(401);
  const missingOrganization = await apiRequest.get('http://127.0.0.1:3001/api/auth/me', { headers: { Authorization: `Bearer ${multiToken}` } });
  expect(missingOrganization.status()).toBe(401);
  const arbitraryOrganization = await apiRequest.get('http://127.0.0.1:3001/api/auth/me', {
    headers: { Authorization: `Bearer ${multiToken}`, 'X-Organization-Id': '22222222-2222-4222-8222-222222222222' },
  });
  expect(arbitraryOrganization.status()).toBe(401);
  const wrongTenantLead = await apiRequest.get('http://127.0.0.1:3001/api/leads', {
    headers: { Authorization: `Bearer ${multiToken}`, 'X-Organization-Id': fixture.orgIds.multiB },
  });
  expect(wrongTenantLead.status()).toBe(200);
  expect(JSON.stringify(await wrongTenantLead.json())).not.toContain('Synthetic Browser Lead Edited');
  const foreignTenantLead = await apiRequest.get(`http://127.0.0.1:3001/api/leads/${fixture.foreignLeadId}`, {
    headers: { Authorization: `Bearer ${multiToken}`, 'X-Organization-Id': fixture.orgIds.foreign },
  });
  expect(foreignTenantLead.status()).toBe(401);
  const crossOrganizationAssignee = await apiRequest.post(`http://127.0.0.1:3001/api/leads/${fixture.foreignLeadId}/assign`, {
    headers: { Authorization: `Bearer ${multiToken}`, 'X-Organization-Id': fixture.orgIds.multiA },
    data: { membershipId: fixture.membershipIds.foreign },
  });
  expect(crossOrganizationAssignee.status()).toBe(403);

  await revokeMembership(fixture.membershipIds.multiB);
  const refreshedBootstrap = await apiRequest.get('http://127.0.0.1:3001/api/auth/organizations', {
    headers: { Authorization: `Bearer ${multiToken}` },
  });
  expect(refreshedBootstrap.status()).toBe(200);
  expect((await refreshedBootstrap.json()).organizations.map((organization: { id: string }) => organization.id)).toEqual([fixture.orgIds.multiA]);
  const revokedOrganization = await apiRequest.get('http://127.0.0.1:3001/api/auth/me', {
    headers: { Authorization: `Bearer ${multiToken}`, 'X-Organization-Id': fixture.orgIds.multiB },
  });
  expect(revokedOrganization.status()).toBe(401);
  await page.getByLabel('Active organization').selectOption(fixture.orgIds.multiB);
  await expect(page.getByText(fixture.orgNames.multiA)).toBeVisible();
  await expect(page.getByLabel('Active organization')).toHaveCount(0);

  await page.locator('summary[aria-label="Open account menu"]').click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/login/);
  const revokedToken = await apiRequest.get('http://127.0.0.1:3001/api/leads', {
    headers: { Authorization: `Bearer ${multiToken}`, 'X-Organization-Id': fixture.orgIds.multiA },
  });
  expect(revokedToken.status()).toBe(401);
});

function revokeMembership(membershipId: string) {
  if (!process.env.MIGRATION_DATABASE_URL) loadEnvFile(resolve(process.cwd(), '../../.env'));
  const requireApi = createRequire(resolve(process.cwd(), '../api/package.json'));
  const { Pool } = requireApi('pg');
  const databaseUrl = new URL(process.env.MIGRATION_DATABASE_URL!);
  expect(databaseUrl.hostname).toBe('127.0.0.1');
  expect(databaseUrl.port).toBe('5432');
  expect(databaseUrl.pathname).toBe('/dolphin_crm_dev');
  expect(decodeURIComponent(databaseUrl.username)).toBe('dolphin_crm_dev_migrator');
  const pool = new Pool({ connectionString: process.env.MIGRATION_DATABASE_URL, max: 1 });
  return pool.connect().then(async (client: { query: (sql: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, string>> }>; release: () => void }) => {
    try {
      const identity = await client.query('SELECT current_database() AS database,current_user AS role,inet_server_addr()::text AS address');
      expect(identity.rows[0]?.database).toBe('dolphin_crm_dev');
      expect(identity.rows[0]?.role).toBe('dolphin_crm_dev_migrator');
      expect(identity.rows[0]?.address?.split('/')[0]).toMatch(/^127\./);
      await client.query(`UPDATE organization_memberships SET status='REVOKED',revoked_at=now(),updated_at=now() WHERE id=$1`, [membershipId]);
    } finally {
      client.release();
      await pool.end();
    }
  });
}

test('single eligible organization is selected automatically', async ({ page }) => {
  await signIn(page, fixture.users.single);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByText(fixture.orgNames.single)).toBeVisible();
  await expect(page).not.toHaveURL(/select-organization/);
});

test('authorized administrator can archive and restore customer records', async ({ page }) => {
  await signIn(page, fixture.users.admin);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await page.getByRole('link', { name: 'Customers', exact: true }).click();
  await page.getByRole('button', { name: 'Add Customer' }).click();
  await page.getByLabel('Display name').fill('Synthetic Archive Restore Customer');
  await page.getByRole('button', { name: 'Create customer' }).click();
  await expect(page.getByRole('heading', { name: 'Synthetic Archive Restore Customer' })).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Archive' }).click();
  await expect(page.getByText('Customer archived.')).toBeVisible();
  await page.getByRole('link', { name: 'Customers', exact: true }).click();
  await page.getByLabel('Records').selectOption('archived');
  await page.getByRole('link', { name: 'Synthetic Archive Restore Customer' }).click();
  await expect(page.getByRole('button', { name: 'Restore' })).toBeVisible();
  await expect(page.locator('.customer-activity-list').getByText('archived', { exact: true })).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Restore' }).click();
  await expect(page.getByText('Customer restored.')).toBeVisible();
  await expect(page.locator('.customer-activity-list').getByText('restored', { exact: true })).toBeVisible();
});

test('active identity without membership is denied access', async ({ page }) => {
  await signIn(page, fixture.users.noMembership);
  await expect(page.getByRole('heading', { name: 'Access unavailable' })).toBeVisible();
  await expect(page.getByText(/no active organization access/i)).toBeVisible();
});

test('unknown and disabled database identities fail closed after Firebase sign-in', async ({ browser }) => {
  for (const key of ['disabled', 'unknown'] as const) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, fixture.users[key]);
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL(/login/);
    await context.close();
  }
});

test('staff without lead permissions is denied by the guarded Leads API and UI', async ({ browser, request: apiRequest }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const tokenPromise = signIn(page, fixture.users.restricted);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  const token = await tokenPromise;
  await expect(page.getByRole('link', { name: 'Leads' })).toHaveCount(0);
  const denied = await apiRequest.get('http://127.0.0.1:3001/api/leads', {
    headers: { Authorization: `Bearer ${token}`, 'X-Organization-Id': fixture.orgIds.restricted },
  });
  expect(denied.status()).toBe(403);
  const assignmentDenied = await apiRequest.post(`http://127.0.0.1:3001/api/leads/${fixture.foreignLeadId}/assign`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Organization-Id': fixture.orgIds.restricted },
    data: { membershipId: fixture.membershipIds.restricted },
  });
  expect(assignmentDenied.status()).toBe(403);
  await context.close();
});
