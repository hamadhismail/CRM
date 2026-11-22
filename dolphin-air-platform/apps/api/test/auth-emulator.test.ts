import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { UnauthorizedException } from '@nestjs/common';
import { FirebaseAdminService } from '../src/infrastructure/firebase/firebase-admin.service';
import { AuthService } from '../src/modules/auth/services/auth.service';

const runEmulatorTests = process.env.RUN_FIRESTORE_EMULATOR_TESTS === '1';

test('Firestore-backed staff profile path accepts an active verified emulator identity', { skip: !runEmulatorTests }, async () => {
  assert.notEqual(process.env.NODE_ENV, 'production');
  assert.equal(process.env.FIREBASE_PROJECT_ID, 'dolphin-air-local');
  assert.match(process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '', /^(localhost|127\.0\.0\.1):\d+$/);
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? '', /^(localhost|127\.0\.0\.1):\d+$/);

  const uid = `stage32-${randomUUID()}`;
  const email = `${uid}@dolphin-air.test`;
  const password = `Test-${randomUUID()}-Long-Only`;
  const app = getApps().find((candidate) => candidate.name === 'dolphin-air-local')
    ?? initializeApp({ projectId: 'dolphin-air-local' }, 'dolphin-air-local');
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  const userReference = firestore.collection('users').doc(uid);
  const authService = new AuthService(new FirebaseAdminService(), {} as never);

  try {
    await auth.createUser({ uid, email, password, emailVerified: true, displayName: 'Synthetic Sales User' });
    await userReference.create({ uid, email, displayName: 'Synthetic Sales User', role: 'sales', active: true, organizationIds: ['test-org'] });

    const response = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-local`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    assert.equal(response.ok, true, 'synthetic account should authenticate with the local emulator');
    const body = await response.json() as { idToken?: string };
    assert.equal(typeof body.idToken, 'string');
    const principal = await authService.authenticateStaff(body.idToken!);
    assert.equal(principal.uid, uid);
    assert.equal(principal.role, 'sales');
    assert.deepEqual(principal.organizationIds, ['test-org']);

    await userReference.update({ active: false });
    await assert.rejects(() => authService.authenticateStaff(body.idToken!), UnauthorizedException);
    await assert.rejects(() => authService.verifyToken('forged.invalid.signature'), UnauthorizedException);
  } finally {
    await userReference.delete().catch(() => undefined);
    await auth.deleteUser(uid).catch(() => undefined);
  }
});
