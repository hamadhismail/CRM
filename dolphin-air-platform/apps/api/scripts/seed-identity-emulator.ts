import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { isInternalRole } from '../src/modules/auth/interfaces/authenticated-principal';

const PROJECT_ID = 'dolphin-air-local';

interface SyntheticIdentity {
  email: string;
  password: string;
  displayName: string;
  role: string;
  organizationIds: string[];
}

function requireLocalEmulators(): void {
  if (process.env.NODE_ENV === 'production' || process.env.FIREBASE_PROJECT_ID !== PROJECT_ID) {
    throw new Error('Identity fixtures are permitted only for the dolphin-air-local project outside production.');
  }
  if (!isLoopback(process.env.FIREBASE_AUTH_EMULATOR_HOST) || !isLoopback(process.env.FIRESTORE_EMULATOR_HOST)) {
    throw new Error('Both Firebase Auth and Firestore emulators must use loopback hosts before fixture seeding.');
  }
  if (!process.env.DOLPHIN_DEV_USERS_JSON) {
    throw new Error('Set DOLPHIN_DEV_USERS_JSON to an explicit JSON array of synthetic users.');
  }
}

function isLoopback(value: string | undefined): boolean {
  return Boolean(value && /^(localhost|127\.0\.0\.1|\[::1\]):\d{1,5}$/.test(value));
}

async function main(): Promise<void> {
  requireLocalEmulators();
  const identities = JSON.parse(process.env.DOLPHIN_DEV_USERS_JSON!) as SyntheticIdentity[];
  if (!Array.isArray(identities) || identities.length === 0) throw new Error('Provide at least one synthetic identity.');

  const app = getApps().find((candidate) => candidate.name === PROJECT_ID)
    ?? initializeApp({ projectId: PROJECT_ID }, PROJECT_ID);
  const auth = getAuth(app);
  const firestore = getFirestore(app);

  for (const identity of identities) {
    const email = typeof identity.email === 'string' ? identity.email.trim().toLowerCase() : '';
    if (!email.endsWith('.test') || typeof identity.password !== 'string' || identity.password.length < 12) {
      throw new Error('Synthetic users require a .test email address and an explicit password of at least 12 characters.');
    }
    if (!isInternalRole(identity.role) || typeof identity.displayName !== 'string' || !Array.isArray(identity.organizationIds)) {
      throw new Error(`Synthetic identity ${email} has invalid role, display name, or organization membership data.`);
    }

    let authUser;
    try {
      authUser = await auth.getUserByEmail(email);
    } catch (error) {
      if ((error as { code?: string }).code !== 'auth/user-not-found') throw error;
      authUser = await auth.createUser({ email, password: identity.password, emailVerified: true, displayName: identity.displayName, disabled: false });
    }

    const userReference = firestore.collection('users').doc(authUser.uid);
    const existing = await userReference.get();
    if (existing.exists) {
      const current = existing.data();
      if (current?.email?.toLowerCase() === email && current?.role === identity.role && current?.active === true) {
        process.stdout.write(`Identity ${email} is already seeded; leaving its record unchanged.\n`);
        continue;
      }
      throw new Error(`Refusing to overwrite conflicting synthetic user record ${authUser.uid}.`);
    }
    await userReference.create({
      uid: authUser.uid,
      email,
      displayName: identity.displayName.trim(),
      role: identity.role,
      active: true,
      organizationIds: [...new Set(identity.organizationIds.filter((id) => typeof id === 'string' && id.length > 0))],
    });
    process.stdout.write(`Created emulator identity ${email} with role ${identity.role}.\n`);
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'Identity fixture setup failed.'}\n`);
  process.exitCode = 1;
});
