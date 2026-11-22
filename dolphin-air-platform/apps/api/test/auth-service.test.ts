import assert from 'node:assert/strict';
import test from 'node:test';
import { AuthService } from '../src/modules/auth/services/auth.service';
import { StaffPrincipal, toStaffPrincipal } from '../src/modules/auth/interfaces/authenticated-principal';

const decoded = {
  uid: 'firebase-synthetic-uid',
  email: 'staff@example.test',
  email_verified: true,
  name: 'Synthetic Staff',
  firebase: { sign_in_provider: 'password' },
} as never;

function principal(): StaffPrincipal {
  return toStaffPrincipal(decoded.uid, {
    email: decoded.email, role: 'sales', active: true, displayName: decoded.name,
    organizationIds: ['firestore-org'],
  }, decoded.email)!;
}

function withEnvironment(values: Record<string, string | undefined>, run: () => Promise<void>): Promise<void> {
  const previous = new Map(Object.keys(values).map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  return run().finally(() => {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

test('database identity path requires verified organization context and does not fall back to Firestore', async () => {
  await withEnvironment({ DATABASE_IDENTITY_AUTH_ENABLED: 'true', NODE_ENV: 'development' }, async () => {
    const firebase = {
      verifyIdToken: async () => decoded,
      firestore: { collection: () => ({ doc: () => ({ get: async () => { throw new Error('Firestore must not be used'); } }) }) },
    };
    const resolver = { resolveVerifiedIdentity: async (_token: unknown, organizationId: string) => {
      assert.equal(organizationId, '00000000-0000-4000-8000-000000000001');
      return principal();
    } };
    const service = new AuthService(firebase as never, resolver as never);
    await assert.rejects(() => service.authenticateStaff('synthetic-token'));
    const resolved = await service.authenticateStaff('synthetic-token', '00000000-0000-4000-8000-000000000001');
    assert.equal(resolved.uid, decoded.uid);
  });
});

test('database identity failure is fail-closed and never falls back to Firestore', async () => {
  await withEnvironment({ DATABASE_IDENTITY_AUTH_ENABLED: 'true', NODE_ENV: 'development' }, async () => {
    let firestoreReads = 0;
    const firebase = {
      verifyIdToken: async () => decoded,
      firestore: { collection: () => ({ doc: () => ({ get: async () => { firestoreReads += 1; return { exists: true, data: () => ({ role: 'super_admin', active: true }) }; } }) }) },
    };
    const service = new AuthService(firebase as never, {
      resolveVerifiedIdentity: async () => { throw new Error('identity store unavailable'); },
    } as never);
    await assert.rejects(() => service.authenticateStaff('synthetic-token', '00000000-0000-4000-8000-000000000001'));
    assert.equal(firestoreReads, 0);
  });
});

test('static Firestore identity remains the default when database auth is not opted in', async () => {
  await withEnvironment({ DATABASE_IDENTITY_AUTH_ENABLED: undefined, NODE_ENV: 'test' }, async () => {
    let databaseCalls = 0;
    const firebase = {
      verifyIdToken: async () => decoded,
      firestore: { collection: () => ({ doc: () => ({ get: async () => ({ exists: true, data: () => ({ role: 'sales', active: true, organizationIds: ['firestore-org'] }) }) }) }) },
    };
    const service = new AuthService(firebase as never, { resolveVerifiedIdentity: async () => { databaseCalls += 1; return principal(); } } as never);
    const resolved = await service.authenticateStaff('synthetic-token');
    assert.equal(resolved.role, 'sales');
    assert.equal(databaseCalls, 0);
  });
});
