import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { getAuth } from 'firebase-admin/auth';
import { getApps, initializeApp } from 'firebase-admin/app';
import { FirebaseAdminService } from '../src/infrastructure/firebase/firebase-admin.service';
import { AuthService } from '../src/modules/auth/services/auth.service';

const enabled = process.env.RUN_FIREBASE_AUTH_EMULATOR_TESTS === '1';

test('Firebase Auth Emulator verifies, revokes and disables synthetic identities without Firestore', { skip: !enabled, timeout: 30_000 }, async () => {
  assert.notEqual(process.env.NODE_ENV, 'production');
  assert.equal(process.env.FIREBASE_PROJECT_ID, 'dolphin-air-local');
  assert.match(process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '', /^(localhost|127\.0\.0\.1):\d+$/);

  const uid = `auth-only-${randomUUID()}`;
  const email = `${uid}@dolphin-air.test`;
  const password = `Test-${randomUUID()}-Long-Only`;
  const app = getApps().find((candidate) => candidate.name === 'dolphin-air-local')
    ?? initializeApp({ projectId: 'dolphin-air-local' }, 'dolphin-air-local');
  const auth = getAuth(app);
  const firebase = new FirebaseAdminService();
  const authService = new AuthService(firebase, { recordSessionRevocation: async () => true } as never);
  let idToken: string | undefined;

  try {
    await auth.createUser({ uid, email, password, emailVerified: true, displayName: 'Synthetic Auth Only User' });
    const response = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-local`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    assert.equal(response.ok, true, 'synthetic credentials should sign in only against the local Auth emulator');
    const body = await response.json() as { idToken?: string };
    assert.equal(typeof body.idToken, 'string');
    idToken = body.idToken;

    const decoded = await firebase.verifyIdToken(idToken!, true);
    assert.equal(decoded.uid, uid);
    assert.equal(decoded.email_verified, true);
    await assert.rejects(() => firebase.verifyIdToken('forged.invalid.signature', true));

    // Firebase revocation timestamps have second resolution; ensure the issued
    // token's auth_time is strictly earlier than the revocation cutoff.
    await new Promise((resolve) => setTimeout(resolve, 1_100));
    await authService.logoutStaff({ uid } as never);
    assert.ok((await auth.getUser(uid)).tokensValidAfterTime, 'emulator should record refresh-token revocation metadata');
    await assert.rejects(() => firebase.verifyIdToken(idToken!, true));

    const renewedResponse = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-local`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    assert.equal(renewedResponse.ok, true);
    const renewed = await renewedResponse.json() as { idToken?: string };
    await auth.updateUser(uid, { disabled: true });
    await assert.rejects(() => firebase.verifyIdToken(renewed.idToken!, true));
  } finally {
    await auth.deleteUser(uid).catch(() => undefined);
  }
});
