import 'reflect-metadata';
import assert from 'node:assert/strict';
import { spawn, ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { loadEnvFile } from 'node:process';
import { resolve } from 'node:path';
import test from 'node:test';
import { Pool } from 'pg';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

if (!process.env.DATABASE_URL && existsSync('../../.env')) loadEnvFile('../../.env');

const enabled = process.env.RUN_LOCAL_AUTH_LEADS_E2E === '1';

test('verified local Firebase staff identity accesses only its organization Leads through NestJS HTTP', {
  skip: !enabled,
  timeout: 60_000,
}, async (t) => {
  assert.equal(process.env.FIREBASE_PROJECT_ID, 'dolphin-air-local');
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099');
  assert.notEqual(process.env.NODE_ENV, 'production');
  assert.ok(process.env.DATABASE_URL && isApprovedDatabaseUrl(process.env.DATABASE_URL, 'dolphin_crm_dev_app'));
  assert.ok(process.env.MIGRATION_DATABASE_URL && isApprovedDatabaseUrl(process.env.MIGRATION_DATABASE_URL, 'dolphin_crm_dev_migrator'));

  const oldEnv = new Map(['NODE_ENV', 'DATABASE_IDENTITY_AUTH_ENABLED'].map((name) => [name, process.env[name]]));
  process.env.NODE_ENV = 'development';
  process.env.DATABASE_IDENTITY_AUTH_ENABLED = 'true';

  const migrator = new Pool({ connectionString: process.env.MIGRATION_DATABASE_URL, max: 1 });
  const fixture = {
    org: randomUUID(), secondOrg: randomUUID(), otherOrg: randomUUID(), actor: randomUUID(), staff: randomUUID(), otherStaff: randomUUID(),
    disabledStaff: randomUUID(), noOrgStaff: randomUUID(), assigneeStaff: randomUUID(), inactiveAssigneeStaff: randomUUID(),
    noPermissionStaff: randomUUID(), restrictedActor: randomUUID(),
    membership: randomUUID(), secondMembership: randomUUID(), otherMembership: randomUUID(), assigneeMembership: randomUUID(),
    inactiveAssigneeMembership: randomUUID(), noPermissionMembership: randomUUID(), restrictedMembership: randomUUID(), otherLead: randomUUID(),
    firebaseUid: `stage333-${randomUUID()}`, otherFirebaseUid: `stage333-other-${randomUUID()}`,
    disabledFirebaseUid: `stage333-disabled-${randomUUID()}`, noOrgFirebaseUid: `stage333-no-org-${randomUUID()}`,
    unprovisionedFirebaseUid: `stage333-unprovisioned-${randomUUID()}`,
    restrictedFirebaseUid: `stage333-restricted-${randomUUID()}`,
  };
  const email = `${fixture.firebaseUid}@dolphin-air.test`;
  const password = `Local-E2E-${randomUUID()}-Only`;
  const otherEmail = `${fixture.otherFirebaseUid}@dolphin-air.test`;
  const otherPassword = `Local-E2E-${randomUUID()}-Only`;
  const disabledEmail = `${fixture.disabledFirebaseUid}@dolphin-air.test`;
  const disabledPassword = `Local-E2E-${randomUUID()}-Only`;
  const noOrgEmail = `${fixture.noOrgFirebaseUid}@dolphin-air.test`;
  const noOrgPassword = `Local-E2E-${randomUUID()}-Only`;
  const unprovisionedEmail = `${fixture.unprovisionedFirebaseUid}@dolphin-air.test`;
  const unprovisionedPassword = `Local-E2E-${randomUUID()}-Only`;
  const restrictedEmail = `${fixture.restrictedFirebaseUid}@dolphin-air.test`;
  const restrictedPassword = `Local-E2E-${randomUUID()}-Only`;
  const firebaseApp = getApps().find((app) => app.name === 'dolphin-air-local')
    ?? initializeApp({ projectId: 'dolphin-air-local' }, 'dolphin-air-local');
  const firebaseAuth = getAuth(firebaseApp);
  let created = false;
  let apiProcess: ChildProcess | undefined;
  let apiExit: { code: number | null; signal: NodeJS.Signals | null } | undefined;
  let baseUrl = '';
  let cleanupError: unknown;

  try {
    const dbIdentity = await migrator.query<{ database: string; role: string; address: string | null }>(
      'SELECT current_database() AS database,current_user AS role,inet_server_addr()::text AS address',
    );
    assert.equal(dbIdentity.rows[0]?.database, 'dolphin_crm_dev');
    assert.equal(dbIdentity.rows[0]?.role, 'dolphin_crm_dev_migrator');
    assert.match(dbIdentity.rows[0]?.address ?? '', /^127\./);

    const roleResult = await migrator.query<{ id: string; scope: string; allowed_organization_type: string; permissions: string[] }>(
      `SELECT r.id,r.scope,r.allowed_organization_type,
        array_agg(p.code ORDER BY p.code) FILTER (WHERE p.code IS NOT NULL) AS permissions
       FROM roles r LEFT JOIN role_permissions rp ON rp.role_id=r.id
       LEFT JOIN permissions p ON p.id=rp.permission_id WHERE r.code='sales'
       GROUP BY r.id,r.scope,r.allowed_organization_type`,
    );
    assert.equal(roleResult.rowCount, 1, 'the existing sales role must be provisioned');
    const role = roleResult.rows[0]!;
    assert.equal(role.allowed_organization_type, 'INTERNAL');
    assert.ok(role.permissions.includes('leads.read') && role.permissions.includes('leads.create') && role.permissions.includes('leads.update'));
    const staffRoleResult = await migrator.query<{ id: string; scope: string }>('SELECT id,scope FROM roles WHERE code=$1', ['staff']);
    assert.equal(staffRoleResult.rowCount, 1, 'the existing staff role must be provisioned');
    const staffRole = staffRoleResult.rows[0]!;

    await firebaseAuth.createUser({ uid: fixture.firebaseUid, email, password, emailVerified: true, displayName: 'Synthetic Leads E2E Staff' });
    await firebaseAuth.createUser({ uid: fixture.otherFirebaseUid, email: otherEmail, password: otherPassword, emailVerified: true, displayName: 'Synthetic Other Organization Staff' });
    await firebaseAuth.createUser({ uid: fixture.disabledFirebaseUid, email: disabledEmail, password: disabledPassword, emailVerified: true, displayName: 'Synthetic Disabled Database Staff' });
    await firebaseAuth.createUser({ uid: fixture.noOrgFirebaseUid, email: noOrgEmail, password: noOrgPassword, emailVerified: true, displayName: 'Synthetic No Organization Staff' });
    await firebaseAuth.createUser({ uid: fixture.unprovisionedFirebaseUid, email: unprovisionedEmail, password: unprovisionedPassword, emailVerified: true, displayName: 'Synthetic Unprovisioned Staff' });
    await firebaseAuth.createUser({ uid: fixture.restrictedFirebaseUid, email: restrictedEmail, password: restrictedPassword, emailVerified: true, displayName: 'Synthetic Restricted Staff' });

    const setup = await migrator.connect();
    try {
      await setup.query('BEGIN');
      await setup.query(
        `INSERT INTO organizations (id,name,type,status,updated_at) VALUES
          ($1,'Synthetic Stage 3.3.3 E2E Internal A','INTERNAL','ACTIVE',now()),
          ($2,'Synthetic Stage 3.3.3 E2E Internal B','INTERNAL','ACTIVE',now()),
          ($3,'Synthetic Stage 3.3.3 E2E Other Internal','INTERNAL','ACTIVE',now())`,
        [fixture.org, fixture.secondOrg, fixture.otherOrg],
      );
      await setup.query(
        `INSERT INTO users (id,firebase_uid,display_name,email,email_normalized,status,user_type,disabled_at,updated_at) VALUES
          ($1,$3,'Synthetic E2E Role Actor',NULL,NULL,'ACTIVE','INTERNAL_STAFF',NULL,now()),
          ($2,$4,'Synthetic E2E Staff',NULL,NULL,'ACTIVE','INTERNAL_STAFF',NULL,now()),
          ($5,$6,'Synthetic Other E2E Staff',NULL,NULL,'ACTIVE','INTERNAL_STAFF',NULL,now()),
          ($7,$8,'Synthetic Disabled E2E Staff',NULL,NULL,'DISABLED','INTERNAL_STAFF',now(),now()),
          ($9,$10,'Synthetic No Organization E2E Staff',NULL,NULL,'ACTIVE','INTERNAL_STAFF',NULL,now())`,
        [fixture.actor, fixture.staff, `stage333-actor-${randomUUID()}`, fixture.firebaseUid, fixture.otherStaff, fixture.otherFirebaseUid,
          fixture.disabledStaff, fixture.disabledFirebaseUid, fixture.noOrgStaff, fixture.noOrgFirebaseUid],
      );
      await setup.query(
        `INSERT INTO users (id,firebase_uid,display_name,email,email_normalized,status,user_type,disabled_at,updated_at) VALUES
          ($1,NULL,'Synthetic Eligible Assignee',NULL,NULL,'ACTIVE','INTERNAL_STAFF',NULL,now()),
          ($2,NULL,'Synthetic Inactive Assignee',NULL,NULL,'DISABLED','INTERNAL_STAFF',now(),now()),
          ($3,NULL,'Synthetic No Lead Permission',NULL,NULL,'ACTIVE','INTERNAL_STAFF',NULL,now()),
          ($4,$5,'Synthetic Restricted Assignment Actor',$6,$6,'ACTIVE','INTERNAL_STAFF',NULL,now())`,
        [fixture.assigneeStaff, fixture.inactiveAssigneeStaff, fixture.noPermissionStaff, fixture.restrictedActor, fixture.restrictedFirebaseUid, restrictedEmail],
      );
      await setup.query(
        `INSERT INTO organization_memberships (id,organization_id,user_id,status,joined_at,updated_at) VALUES
          ($1,$3,$6,'ACTIVE',now(),now()),($2,$4,$6,'ACTIVE',now(),now()),($5,$7,$8,'ACTIVE',now(),now())`,
        [fixture.membership, fixture.secondMembership, fixture.org, fixture.secondOrg, fixture.otherMembership, fixture.staff, fixture.otherOrg, fixture.otherStaff],
      );
      await setup.query(
        `INSERT INTO organization_memberships (id,organization_id,user_id,status,joined_at,updated_at) VALUES
          ($1,$5,$6,'ACTIVE',now(),now()),($2,$5,$7,'ACTIVE',now(),now()),
          ($3,$5,$8,'ACTIVE',now(),now()),($4,$5,$9,'ACTIVE',now(),now())`,
        [fixture.assigneeMembership, fixture.inactiveAssigneeMembership, fixture.noPermissionMembership, fixture.restrictedMembership,
          fixture.org, fixture.assigneeStaff, fixture.inactiveAssigneeStaff, fixture.noPermissionStaff, fixture.restrictedActor],
      );
      await setup.query(
        `INSERT INTO user_roles (id,organization_id,organization_type,membership_id,role_id,role_scope,status,assigned_by_id) VALUES
          ($1,$2,'INTERNAL',$3,$4,$5,'ACTIVE',$6),($7,$8,'INTERNAL',$9,$4,$5,'ACTIVE',$6),
          ($10,$11,'INTERNAL',$12,$4,$5,'ACTIVE',$6)`,
        [randomUUID(), fixture.org, fixture.membership, role.id, role.scope, fixture.actor,
          randomUUID(), fixture.otherOrg, fixture.otherMembership,
          randomUUID(), fixture.secondOrg, fixture.secondMembership],
      );
      await setup.query(
        `INSERT INTO user_roles (id,organization_id,organization_type,membership_id,role_id,role_scope,status,assigned_by_id) VALUES
          ($1,$2,'INTERNAL',$3,$4,$5,'ACTIVE',$6),($7,$2,'INTERNAL',$8,$9,$10,'ACTIVE',$6),
          ($11,$2,'INTERNAL',$12,$9,$10,'ACTIVE',$6)`,
        [randomUUID(), fixture.org, fixture.assigneeMembership, role.id, role.scope, fixture.actor,
          randomUUID(), fixture.noPermissionMembership, staffRole.id, staffRole.scope,
          randomUUID(), fixture.restrictedMembership],
      );
      await setup.query(
        `INSERT INTO leads (id,organization_id,lead_number,full_name,country_code,phone_number,phone_normalized,source,service,created_by_membership_id,updated_at)
         VALUES ($1,$2,$3,'Synthetic Other Organization Lead','+91','9000000000','919000000000','Test','UMRAH',$4,now())`,
        [fixture.otherLead, fixture.otherOrg, `E2E-${randomUUID().slice(0, 16)}`, fixture.otherMembership],
      );
      await setup.query('COMMIT');
      created = true;
    } catch (error) {
      await setup.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      setup.release();
    }

    const signIn = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-local`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    assert.equal(signIn.ok, true, 'synthetic staff should sign in only to the local Auth Emulator');
    const credentials = await signIn.json() as { idToken?: string };
    assert.ok(credentials.idToken);
    const token = credentials.idToken!;
    const headers = { Authorization: `Bearer ${token}`, 'X-Organization-Id': fixture.org };

    const apiPort = await reserveLocalPort();
    baseUrl = `http://127.0.0.1:${apiPort}`;
    const apiEnvironment = { ...process.env, NODE_ENV: 'development', DATABASE_IDENTITY_AUTH_ENABLED: 'true',
      FIREBASE_PROJECT_ID: 'dolphin-air-local', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
      API_PORT: String(apiPort) };
    delete apiEnvironment.MIGRATION_DATABASE_URL;
    delete apiEnvironment.FIRESTORE_EMULATOR_HOST;
    delete apiEnvironment.NODE_OPTIONS;
    apiProcess = spawn(process.execPath, [resolve('dist/src/main.js')], { cwd: process.cwd(), env: apiEnvironment, stdio: 'ignore' });
    apiProcess.once('exit', (code, signal) => { apiExit = { code, signal }; });
    await waitForApi(baseUrl, apiProcess, () => apiExit);

    const noToken = await fetch(`${baseUrl}/api/leads`);
    assert.equal(noToken.status, 401);
    assert.equal((await fetch(`${baseUrl}/api/auth/organizations`)).status, 401);
    const forgedBootstrap = await fetch(`${baseUrl}/api/auth/organizations`, { headers: { Authorization: 'Bearer forged.token.value' } });
    assert.equal(forgedBootstrap.status, 401);
    const bootstrap = await fetch(`${baseUrl}/api/auth/organizations`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(bootstrap.status, 200);
    const bootstrapBody = await bootstrap.json() as { organizations: Array<{ id: string; name: string }> };
    assert.deepEqual(bootstrapBody.organizations.map(({ id }) => id), [fixture.org, fixture.secondOrg]);
    assert.ok(bootstrapBody.organizations.every((item) => typeof item.name === 'string' && !('role' in item) && !('permissions' in item)));
    const noOrgToken = await signInAtEmulator(fixture.noOrgFirebaseUid, noOrgEmail, noOrgPassword);
    const noOrgBootstrap = await fetch(`${baseUrl}/api/auth/organizations`, { headers: { Authorization: `Bearer ${noOrgToken}` } });
    assert.equal(noOrgBootstrap.status, 200);
    assert.deepEqual((await noOrgBootstrap.json() as { organizations: unknown[] }).organizations, []);
    const disabledToken = await signInAtEmulator(fixture.disabledFirebaseUid, disabledEmail, disabledPassword);
    const disabledBootstrap = await fetch(`${baseUrl}/api/auth/organizations`, { headers: { Authorization: `Bearer ${disabledToken}` } });
    assert.equal(disabledBootstrap.status, 401);
    const unprovisionedToken = await signInAtEmulator(fixture.unprovisionedFirebaseUid, unprovisionedEmail, unprovisionedPassword);
    const unprovisionedBootstrap = await fetch(`${baseUrl}/api/auth/organizations`, { headers: { Authorization: `Bearer ${unprovisionedToken}` } });
    assert.equal(unprovisionedBootstrap.status, 401);
    const noOrg = await fetch(`${baseUrl}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(noOrg.status, 401);
    const currentUser = await fetch(`${baseUrl}/api/auth/me`, { headers });
    const currentBodyText = await currentUser.text();
    assert.equal(currentUser.status, 200, currentBodyText);
    const currentBody = JSON.parse(currentBodyText) as { user: { role: string; organizationIds: string[]; permissions: string[] } };
    assert.equal(currentBody.user.role, 'sales');
    assert.deepEqual(currentBody.user.organizationIds, [fixture.org]);
    assert.ok(currentBody.user.permissions.includes('leads.read'));
    const selectedSecondOrg = await fetch(`${baseUrl}/api/auth/me`, { headers: { Authorization: `Bearer ${token}`, 'X-Organization-Id': fixture.secondOrg } });
    assert.equal(selectedSecondOrg.status, 200);
    const arbitraryOrganization = await fetch(`${baseUrl}/api/auth/me`, { headers: { Authorization: `Bearer ${token}`, 'X-Organization-Id': randomUUID() } });
    assert.equal(arbitraryOrganization.status, 401);

    const emptyList = await fetch(`${baseUrl}/api/leads?state=active`, { headers });
    assert.equal(emptyList.status, 200);
    assert.deepEqual((await emptyList.json() as { items: unknown[] }).items, []);

    const createResponse = await fetch(`${baseUrl}/api/leads`, {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: 'Synthetic E2E Lead', countryCode: '+91', phoneNumber: '9876501234', email: 'repeat@example.invalid', source: 'Local E2E', service: 'UMRAH' }),
    });
    assert.equal(createResponse.status, 201);
    const createdLead = await createResponse.json() as { id: string; leadNumber: string };
    assert.match(createdLead.leadNumber, /^LD-/);

    const duplicateMatchesResponse = await fetch(`${baseUrl}/api/leads/duplicates`, {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ countryCode: '+91', phoneNumber: '9876501234', email: 'REPEAT@example.invalid' }),
    });
    assert.equal(duplicateMatchesResponse.status, 201);
    const duplicateMatches = await duplicateMatchesResponse.json() as { matches: Array<{ id: string; matchedBy: string[] }>; truncated: boolean };
    assert.equal(duplicateMatches.matches.length, 1);
    assert.equal(duplicateMatches.matches[0]?.id, createdLead.id);
    assert.deepEqual(duplicateMatches.matches[0]?.matchedBy.sort(), ['email', 'phone']);
    assert.equal(duplicateMatches.truncated, false);
    const foreignDuplicate = await fetch(`${baseUrl}/api/leads/duplicates`, {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ countryCode: '+91', phoneNumber: '9000000000' }),
    });
    assert.equal(foreignDuplicate.status, 201);
    assert.deepEqual((await foreignDuplicate.json() as { matches: unknown[] }).matches, [], 'duplicate results must not leak another organization records');

    const assigneeListResponse = await fetch(`${baseUrl}/api/leads/assignees`, { headers });
    assert.equal(assigneeListResponse.status, 200);
    const assignees = await assigneeListResponse.json() as Array<{ membershipId: string; displayName: string }>;
    assert.ok(assignees.some((candidate) => candidate.membershipId === fixture.assigneeMembership));
    assert.ok(!assignees.some((candidate) => [fixture.inactiveAssigneeMembership, fixture.noPermissionMembership, fixture.otherMembership].includes(candidate.membershipId as never)));

    const assignment = await fetch(`${baseUrl}/api/leads/${createdLead.id}/assign`, {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ membershipId: fixture.assigneeMembership }),
    });
    assert.equal(assignment.status, 201);
    assert.equal((await assignment.json() as { assignedMembershipId: string }).assignedMembershipId, fixture.assigneeMembership);
    const assignmentHistoryResponse = await fetch(`${baseUrl}/api/leads/${createdLead.id}/assignment-history`, { headers });
    assert.equal(assignmentHistoryResponse.status, 200);
    const assignmentHistory = await assignmentHistoryResponse.json() as Array<{ previousAssignee: unknown; assignee: { membershipId: string }; actor: { membershipId: string } }>;
    assert.equal(assignmentHistory.length, 1);
    assert.equal(assignmentHistory[0]?.previousAssignee, null);
    assert.equal(assignmentHistory[0]?.assignee.membershipId, fixture.assigneeMembership);
    assert.equal(assignmentHistory[0]?.actor.membershipId, fixture.membership);

    const reassignment = await fetch(`${baseUrl}/api/leads/${createdLead.id}/assign`, {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ membershipId: fixture.membership }),
    });
    assert.equal(reassignment.status, 201);
    const reassignmentHistory = await fetch(`${baseUrl}/api/leads/${createdLead.id}/assignment-history`, { headers });
    const reassignmentEntries = await reassignmentHistory.json() as Array<{ previousAssignee: { membershipId: string } | null }>;
    assert.equal(reassignmentEntries.length, 2);
    assert.equal(reassignmentEntries[0]?.previousAssignee?.membershipId, fixture.assigneeMembership);

    for (const ineligibleMembership of [fixture.inactiveAssigneeMembership, fixture.noPermissionMembership, fixture.otherMembership]) {
      const deniedAssignment = await fetch(`${baseUrl}/api/leads/${createdLead.id}/assign`, {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ membershipId: ineligibleMembership }),
      });
      assert.equal(deniedAssignment.status, 403);
    }
    const restrictedToken = await signInAtEmulator(fixture.restrictedFirebaseUid, restrictedEmail, restrictedPassword);
    const restrictedAssignment = await fetch(`${baseUrl}/api/leads/${createdLead.id}/assign`, {
      method: 'POST', headers: { Authorization: `Bearer ${restrictedToken}`, 'X-Organization-Id': fixture.org, 'Content-Type': 'application/json' },
      body: JSON.stringify({ membershipId: fixture.assigneeMembership }),
    });
    assert.equal(restrictedAssignment.status, 403, 'assignment requires the existing leads.update permission');

    await assert.rejects(migrator.query(
      `INSERT INTO lead_assignment_history (id,lead_id,organization_id,previous_assigned_membership_id,assigned_membership_id,actor_membership_id)
       VALUES ($1,$2,$3,NULL,$4,$5)`,
      [randomUUID(), createdLead.id, fixture.org, fixture.otherMembership, fixture.membership],
    ), (error: unknown) => Boolean(error && typeof error === 'object' && 'code' in error && error.code === '23503'));

    const repeatInquiry = await fetch(`${baseUrl}/api/leads`, {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: 'Synthetic Legitimate Repeat', countryCode: '+91', phoneNumber: '9876501234', email: 'repeat@example.invalid', source: 'Local E2E Repeat', service: 'UMRAH' }),
    });
    assert.equal(repeatInquiry.status, 201, 'duplicate detection is advisory and repeat inquiries remain permitted by leads.create');

    const detailResponse = await fetch(`${baseUrl}/api/leads/${createdLead.id}`, { headers });
    assert.equal(detailResponse.status, 200);
    const edit = await fetch(`${baseUrl}/api/leads/${createdLead.id}`, {
      method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ fullName: 'Synthetic E2E Lead Edited' }),
    });
    assert.equal(edit.status, 200);
    const status = await fetch(`${baseUrl}/api/leads/${createdLead.id}/status`, {
      method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'CONTACTED' }),
    });
    assert.equal(status.status, 200);
    const note = await fetch(`${baseUrl}/api/leads/${createdLead.id}/notes`, {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ body: 'Synthetic integration note' }),
    });
    assert.equal(note.status, 201);

    const foreign = await fetch(`${baseUrl}/api/leads/${fixture.otherLead}`, { headers });
    assert.equal(foreign.status, 404, 'a lead owned by another organization must not be disclosed');
    const wrongOrganization = await fetch(`${baseUrl}/api/auth/me`, { headers: { Authorization: `Bearer ${token}`, 'X-Organization-Id': fixture.otherOrg } });
    assert.equal(wrongOrganization.status, 401);

    const archive = await fetch(`${baseUrl}/api/leads/${createdLead.id}`, { method: 'DELETE', headers });
    assert.equal(archive.status, 200);
    const archivedList = await fetch(`${baseUrl}/api/leads?state=archived`, { headers });
    assert.equal(archivedList.status, 200);
    assert.ok((await archivedList.json() as { items: Array<{ id: string }> }).items.some((item) => item.id === createdLead.id));
    const restore = await fetch(`${baseUrl}/api/leads/${createdLead.id}/restore`, { method: 'POST', headers });
    assert.equal(restore.status, 201);
    const activeList = await fetch(`${baseUrl}/api/leads?state=active`, { headers });
    assert.ok((await activeList.json() as { items: Array<{ id: string }> }).items.some((item) => item.id === createdLead.id));

    const noCustomerToken = await fetch(`${baseUrl}/api/customers/summary`);
    assert.equal(noCustomerToken.status, 401, 'customer endpoints require Firebase authentication');
    const customersSummary = await fetch(`${baseUrl}/api/customers/summary`, { headers });
    assert.equal(customersSummary.status, 200);
    const customerCreate = await fetch(`${baseUrl}/api/customers`, {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'INDIVIDUAL', displayName: 'Synthetic E2E Customer', primaryCountryCode: '+91', primaryPhone: '9765432111', email: 'customer@example.invalid' }),
    });
    assert.equal(customerCreate.status, 201);
    const createdCustomer = await customerCreate.json() as { id: string; customerNumber: string };
    assert.match(createdCustomer.customerNumber, /^CU-/);
    const phoneDuplicate = await fetch(`${baseUrl}/api/customers/duplicates`, {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ countryCode: '+91', phoneNumber: '9765432111' }),
    });
    assert.equal(phoneDuplicate.status, 201);
    assert.equal((await phoneDuplicate.json() as { matches: Array<{ id: string; matchedBy: string[] }> }).matches[0]?.matchedBy[0], 'phone');
    const createdActivity = await fetch(`${baseUrl}/api/customers/${createdCustomer.id}/activities`, { headers });
    assert.equal(createdActivity.status, 200);
    assert.equal((await createdActivity.json() as Array<{ eventType: string }>)[0]?.eventType, 'CREATED');
    const customerContact = await fetch(`${baseUrl}/api/customers/${createdCustomer.id}/contacts`, {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: 'Synthetic E2E Contact', email: 'contact@example.invalid', isPrimary: true }),
    });
    assert.equal(customerContact.status, 201);
    const contactId = (await customerContact.json() as { id: string }).id;
    const contacts = await fetch(`${baseUrl}/api/customers/${createdCustomer.id}/contacts`, { headers });
    assert.equal(contacts.status, 200);
    assert.equal((await contacts.json() as Array<{ fullName: string; isPrimary: boolean }>)[0]?.fullName, 'Synthetic E2E Contact');
    const contactUpdate = await fetch(`${baseUrl}/api/customers/${createdCustomer.id}/contacts/${contactId}`, {
      method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: 'Synthetic E2E Contact Updated', email: 'contact@example.invalid', isPrimary: true }),
    });
    assert.equal(contactUpdate.status, 200);
    const contactUpdateHistory = await fetch(`${baseUrl}/api/customers/${createdCustomer.id}/activities`, { headers });
    const activityEvents = (await contactUpdateHistory.json() as Array<{ eventType: string }>).map(({ eventType }) => eventType);
    assert.ok(activityEvents.includes('CONTACT_ADDED') && activityEvents.includes('CONTACT_UPDATED'));
    const customerDuplicate = await fetch(`${baseUrl}/api/customers/duplicates`, {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'CONTACT@example.invalid' }),
    });
    assert.equal(customerDuplicate.status, 201);
    assert.equal((await customerDuplicate.json() as { matches: Array<{ id: string; matchedBy: string[] }> }).matches[0]?.id, createdCustomer.id);
    const customerUpdate = await fetch(`${baseUrl}/api/customers/${createdCustomer.id}`, {
      method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: 'Synthetic E2E Customer Edited' }),
    });
    assert.equal(customerUpdate.status, 200);
    const customerDetail = await fetch(`${baseUrl}/api/customers/${createdCustomer.id}`, { headers });
    assert.equal(customerDetail.status, 200);
    assert.equal((await customerDetail.json() as { displayName: string }).displayName, 'Synthetic E2E Customer Edited');

    const foreignCustomerId = randomUUID();
    await migrator.query(`INSERT INTO customers
      (id,organization_id,customer_number,type,display_name,email,email_normalized,status,owner_membership_id,created_by_membership_id,updated_at)
      VALUES ($1,$2,$3,'INDIVIDUAL','Synthetic Foreign Customer','foreign@example.invalid','foreign@example.invalid','ACTIVE',$4,$4,now())`,
      [foreignCustomerId, fixture.otherOrg, `CU-${randomUUID().slice(0,20).toUpperCase()}`, fixture.otherMembership]);
    const crossOrganizationCustomer = await fetch(`${baseUrl}/api/customers/${foreignCustomerId}`, { headers });
    assert.equal(crossOrganizationCustomer.status, 404, 'customer profile must be hidden across organizations');
    const crossOrganizationUpdate = await fetch(`${baseUrl}/api/customers/${foreignCustomerId}`, {
      method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ displayName: 'Unauthorized cross-organization update' }),
    });
    assert.equal(crossOrganizationUpdate.status, 404, 'customer update must remain organization scoped');
    const crossOrganizationContact = await fetch(`${baseUrl}/api/customers/${foreignCustomerId}/contacts`, {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ fullName: 'Synthetic Unauthorized Contact', email: 'unauthorized@example.invalid' }),
    });
    assert.equal(crossOrganizationContact.status, 404, 'contact writes cannot cross customer organization scope');
    const crossOrgDuplicate = await fetch(`${baseUrl}/api/customers/duplicates`, {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'foreign@example.invalid' }),
    });
    assert.equal(crossOrgDuplicate.status, 201);
    assert.deepEqual((await crossOrgDuplicate.json() as { matches: unknown[] }).matches, []);

    const archiveCustomer = await fetch(`${baseUrl}/api/customers/${createdCustomer.id}/archive`, { method: 'POST', headers });
    assert.equal(archiveCustomer.status, 403, 'sales users cannot use administrator-only customer archive access');
    const restoreCustomer = await fetch(`${baseUrl}/api/customers/${createdCustomer.id}/restore`, { method: 'POST', headers });
    assert.equal(restoreCustomer.status, 403, 'sales users cannot use administrator-only customer restore access');

    const markWon = await fetch(`${baseUrl}/api/leads/${createdLead.id}/status`, {
      method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'WON' }),
    });
    assert.equal(markWon.status, 200);
    const conversionPreview = await fetch(`${baseUrl}/api/customers/lead-conversion/${createdLead.id}`, { headers });
    assert.equal(conversionPreview.status, 200);
    assert.equal((await conversionPreview.json() as { eligible: boolean }).eligible, true);
    const conversionKey = `e2e-${randomUUID()}`;
    const converted = await fetch(`${baseUrl}/api/customers/convert-lead/${createdLead.id}`, {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'CREATE', idempotencyKey: conversionKey }),
    });
    assert.equal(converted.status, 201);
    const convertedCustomer = await converted.json() as { customerId: string; replayed: boolean };
    assert.equal(convertedCustomer.replayed, false);
    const retryConversion = await fetch(`${baseUrl}/api/customers/convert-lead/${createdLead.id}`, {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'CREATE', idempotencyKey: conversionKey }),
    });
    assert.equal(retryConversion.status, 201);
    assert.equal((await retryConversion.json() as { customerId: string; replayed: boolean }).replayed, true);
    const linkedLeadHistory = await fetch(`${baseUrl}/api/customers/${convertedCustomer.customerId}/leads`, { headers });
    assert.equal(linkedLeadHistory.status, 200);
    assert.equal((await linkedLeadHistory.json() as Array<{ id: string }>)[0]?.id, createdLead.id);
    const conversionActivityResponse = await fetch(`${baseUrl}/api/customers/${convertedCustomer.customerId}/activities`, { headers });
    const conversionActivityTypes = (await conversionActivityResponse.json() as Array<{ eventType: string }>).map(({ eventType }) => eventType);
    assert.ok(conversionActivityTypes.includes('LEAD_CONVERTED'));

    const createWonLead = async (name: string, phone: string, email: string) => {
      const response = await fetch(`${baseUrl}/api/leads`, {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: name, countryCode: '+91', phoneNumber: phone, email, source: 'Synthetic conversion test', service: 'UMRAH' }),
      });
      assert.equal(response.status, 201);
      const lead = await response.json() as { id: string };
      for (const status of ['CONTACTED', 'QUALIFIED', 'WON']) {
        const transition = await fetch(`${baseUrl}/api/leads/${lead.id}/status`, {
          method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
        });
        assert.equal(transition.status, 200);
      }
      return lead.id;
    };

    const linkLeadId = await createWonLead('Synthetic Link Conversion Lead', '9765432101', 'link-conversion@example.invalid');
    const crossOrganizationLink = await fetch(`${baseUrl}/api/customers/convert-lead/${linkLeadId}`, {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'LINK', customerId: foreignCustomerId, idempotencyKey: `foreign-link-${randomUUID()}` }),
    });
    assert.equal(crossOrganizationLink.status, 404, 'Lead conversion must reject customers from another organization');
    const linkedCustomerResult = await fetch(`${baseUrl}/api/customers/convert-lead/${linkLeadId}`, {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'LINK', customerId: createdCustomer.id, idempotencyKey: `link-${randomUUID()}` }),
    });
    assert.equal(linkedCustomerResult.status, 201);
    const linkedCustomerBody = await linkedCustomerResult.json() as { customerId: string; linkType: string; replayed: boolean };
    assert.equal(linkedCustomerBody.customerId, createdCustomer.id);
    assert.equal(linkedCustomerBody.linkType, 'LINKED');
    assert.equal(linkedCustomerBody.replayed, false);
    const linkActivityResponse = await fetch(`${baseUrl}/api/customers/${createdCustomer.id}/activities`, { headers });
    assert.ok((await linkActivityResponse.json() as Array<{ eventType: string }>).some(({ eventType }) => eventType === 'LEAD_LINKED'));

    const concurrentLeadId = await createWonLead('Synthetic Concurrent Conversion Lead', '9765432102', 'concurrent-conversion@example.invalid');
    const concurrentConversions = await Promise.all([randomUUID(), randomUUID()].map((idempotencyKey) => fetch(`${baseUrl}/api/customers/convert-lead/${concurrentLeadId}`, {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'CREATE', idempotencyKey: `concurrent-${idempotencyKey}` }),
    })));
    assert.deepEqual(concurrentConversions.map((response) => response.status), [201, 201]);
    const concurrentResults = await Promise.all(concurrentConversions.map((response) => response.json() as Promise<{ customerId: string; replayed: boolean }>));
    assert.equal(concurrentResults[0]?.customerId, concurrentResults[1]?.customerId);
    const concurrentLinkCount = await migrator.query<{ count: number }>('SELECT count(*)::int AS count FROM customer_lead_links WHERE organization_id=$1 AND lead_id=$2', [fixture.org, concurrentLeadId]);
    assert.equal(concurrentLinkCount.rows[0]?.count, 1);

    const noCustomerPermission = await fetch(`${baseUrl}/api/customers`, {
      headers: { Authorization: `Bearer ${restrictedToken}`, 'X-Organization-Id': fixture.org },
    });
    assert.equal(noCustomerPermission.status, 403, 'accounts without customer permission cannot list customer records');

    await migrator.query(`UPDATE organization_memberships SET status='REVOKED',revoked_at=now(),updated_at=now() WHERE id=$1`, [fixture.secondMembership]);
    const refreshedChoices = await fetch(`${baseUrl}/api/auth/organizations`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(refreshedChoices.status, 200);
    assert.deepEqual((await refreshedChoices.json() as { organizations: Array<{ id: string }> }).organizations.map(({ id }) => id), [fixture.org]);
    const revokedMembership = await fetch(`${baseUrl}/api/auth/me`, { headers: { Authorization: `Bearer ${token}`, 'X-Organization-Id': fixture.secondOrg } });
    assert.equal(revokedMembership.status, 401);

    await new Promise((resolve) => setTimeout(resolve, 1_100));
    const logout = await fetch(`${baseUrl}/api/auth/logout`, { method: 'POST', headers });
    assert.equal(logout.status, 201);
    const revokedRequest = await fetch(`${baseUrl}/api/leads`, { headers });
    assert.equal(revokedRequest.status, 401, 'revoked Firebase tokens must be rejected on subsequent API calls');

    await t.test('runtime operations were served by NestJS using the restricted database connection', async () => {
      const runtime = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
      try {
        const check = await runtime.query<{ database: string; role: string; address: string | null; auditUpdate: boolean; assignmentSelect: boolean; assignmentInsert: boolean; assignmentUpdate: boolean; assignmentDelete: boolean; assignmentTruncate: boolean }>(
          `SELECT current_database() AS database,current_user AS role,inet_server_addr()::text AS address,
            has_table_privilege(current_user,'public.audit_events','UPDATE') AS "auditUpdate",
            has_table_privilege(current_user,'public.lead_assignment_history','SELECT') AS "assignmentSelect",
            has_table_privilege(current_user,'public.lead_assignment_history','INSERT') AS "assignmentInsert",
            has_table_privilege(current_user,'public.lead_assignment_history','UPDATE') AS "assignmentUpdate",
            has_table_privilege(current_user,'public.lead_assignment_history','DELETE') AS "assignmentDelete",
            has_table_privilege(current_user,'public.lead_assignment_history','TRUNCATE') AS "assignmentTruncate"`,
        );
        assert.equal(check.rows[0]?.database, 'dolphin_crm_dev');
        assert.equal(check.rows[0]?.role, 'dolphin_crm_dev_app');
        assert.match(check.rows[0]?.address ?? '', /^127\./);
        assert.equal(check.rows[0]?.auditUpdate, false);
        assert.equal(check.rows[0]?.assignmentSelect, true);
        assert.equal(check.rows[0]?.assignmentInsert, true);
        assert.equal(check.rows[0]?.assignmentUpdate, false);
        assert.equal(check.rows[0]?.assignmentDelete, false);
        assert.equal(check.rows[0]?.assignmentTruncate, false);
      } finally { await runtime.end(); }
    });
  } finally {
    if (apiProcess && apiProcess.exitCode === null) {
      apiProcess.kill();
      await Promise.race([
        new Promise<void>((resolveExit) => apiProcess?.once('exit', () => resolveExit())),
        new Promise<void>((resolveExit) => setTimeout(resolveExit, 3_000)),
      ]);
    }
    if (created) {
      const cleanup = await migrator.connect();
      try {
        await cleanup.query('BEGIN');
        await cleanup.query('DELETE FROM lead_notes WHERE organization_id = ANY($1::uuid[])', [[fixture.org, fixture.secondOrg, fixture.otherOrg]]);
        await cleanup.query('DELETE FROM lead_assignment_history WHERE organization_id = ANY($1::uuid[])', [[fixture.org, fixture.secondOrg, fixture.otherOrg]]);
        await cleanup.query('DELETE FROM lead_events WHERE organization_id = ANY($1::uuid[])', [[fixture.org, fixture.secondOrg, fixture.otherOrg]]);
        await cleanup.query('DELETE FROM customer_lead_links WHERE organization_id = ANY($1::uuid[])', [[fixture.org, fixture.secondOrg, fixture.otherOrg]]);
        await cleanup.query('DELETE FROM customer_activities WHERE organization_id = ANY($1::uuid[])', [[fixture.org, fixture.secondOrg, fixture.otherOrg]]);
        await cleanup.query('DELETE FROM customer_contacts WHERE organization_id = ANY($1::uuid[])', [[fixture.org, fixture.secondOrg, fixture.otherOrg]]);
        await cleanup.query('DELETE FROM customers WHERE organization_id = ANY($1::uuid[])', [[fixture.org, fixture.secondOrg, fixture.otherOrg]]);
        await cleanup.query('DELETE FROM leads WHERE organization_id = ANY($1::uuid[])', [[fixture.org, fixture.secondOrg, fixture.otherOrg]]);
        await cleanup.query(
          'DELETE FROM audit_events WHERE organization_id = ANY($1::uuid[]) OR actor_user_id = ANY($2::uuid[])',
          [[fixture.org, fixture.secondOrg, fixture.otherOrg], [fixture.actor, fixture.staff, fixture.otherStaff, fixture.disabledStaff,
            fixture.noOrgStaff, fixture.assigneeStaff, fixture.inactiveAssigneeStaff, fixture.noPermissionStaff, fixture.restrictedActor]],
        );
        await cleanup.query('DELETE FROM user_roles WHERE membership_id = ANY($1::uuid[])', [[fixture.membership, fixture.secondMembership, fixture.otherMembership, fixture.assigneeMembership, fixture.inactiveAssigneeMembership, fixture.noPermissionMembership, fixture.restrictedMembership]]);
        await cleanup.query('DELETE FROM organization_memberships WHERE id = ANY($1::uuid[])', [[fixture.membership, fixture.secondMembership, fixture.otherMembership, fixture.assigneeMembership, fixture.inactiveAssigneeMembership, fixture.noPermissionMembership, fixture.restrictedMembership]]);
        await cleanup.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [[fixture.actor, fixture.staff, fixture.otherStaff, fixture.disabledStaff, fixture.noOrgStaff, fixture.assigneeStaff, fixture.inactiveAssigneeStaff, fixture.noPermissionStaff, fixture.restrictedActor]]);
        await cleanup.query('DELETE FROM organizations WHERE id = ANY($1::uuid[])', [[fixture.org, fixture.secondOrg, fixture.otherOrg]]);
        await cleanup.query('COMMIT');
      } catch (error) {
        await cleanup.query('ROLLBACK').catch(() => undefined);
        cleanupError = error;
      } finally { cleanup.release(); }
    }
    await firebaseAuth.deleteUser(fixture.firebaseUid).catch(() => undefined);
    await firebaseAuth.deleteUser(fixture.otherFirebaseUid).catch(() => undefined);
    await firebaseAuth.deleteUser(fixture.disabledFirebaseUid).catch(() => undefined);
    await firebaseAuth.deleteUser(fixture.noOrgFirebaseUid).catch(() => undefined);
    await firebaseAuth.deleteUser(fixture.unprovisionedFirebaseUid).catch(() => undefined);
    await firebaseAuth.deleteUser(fixture.restrictedFirebaseUid).catch(() => undefined);
    await migrator.end();
    for (const [name, value] of oldEnv) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
  if (cleanupError) throw cleanupError;
});

function isApprovedDatabaseUrl(value: string, expectedRole: string): boolean {
  try {
    const url = new URL(value);
    return ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname.toLowerCase())
      && url.port === '5432'
      && decodeURIComponent(url.pathname.replace(/^\/+/, '')) === 'dolphin_crm_dev'
      && decodeURIComponent(url.username) === expectedRole
      && Boolean(url.password);
  } catch { return false; }
}

async function signInAtEmulator(uid: string, email: string, password: string): Promise<string> {
  assert.match(uid, /^stage333-/);
  const response = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-local`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  assert.equal(response.ok, true, 'synthetic identity must authenticate only through the local Auth Emulator');
  const body = await response.json() as { idToken?: string };
  assert.ok(body.idToken);
  return body.idToken!;
}

function reserveLocalPort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Unable to reserve a local API test port.'));
        return;
      }
      server.close((error) => error ? reject(error) : resolvePort(address.port));
    });
  });
}

async function waitForApi(baseUrl: string, child: ChildProcess, exit: () => { code: number | null; signal: NodeJS.Signals | null } | undefined): Promise<void> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const status = exit();
    if (status) throw new Error(`Local NestJS API exited before readiness (${status.code ?? status.signal ?? 'unknown'}).`);
    try {
      const response = await fetch(`${baseUrl}/api/leads`, { signal: AbortSignal.timeout(500) });
      if (response.status === 401) return;
      throw new Error(`Local API readiness request returned unexpected status ${response.status}.`);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Local API readiness')) throw error;
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
    }
  }
  throw new Error('Local NestJS API did not become ready within 15 seconds.');
}
