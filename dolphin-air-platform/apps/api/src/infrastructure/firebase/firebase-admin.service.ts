import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { App, getApps, initializeApp } from 'firebase-admin/app';
import { Auth, DecodedIdToken, getAuth } from 'firebase-admin/auth';
import { Firestore, getFirestore } from 'firebase-admin/firestore';

const LOCAL_PROJECT_ID = 'dolphin-air-local';

/**
 * Stage 3 deliberately permits only the Firebase emulators. This prevents an
 * accidental connection to a production project while the migration is being
 * developed. A production credential provider is a separate deployment task.
 */
@Injectable()
export class FirebaseAdminService {
  private cachedApp?: App;

  private get app(): App {
    if (this.cachedApp) return this.cachedApp;
    const projectId = process.env.FIREBASE_PROJECT_ID;
    if (process.env.NODE_ENV === 'production' || projectId !== LOCAL_PROJECT_ID) {
      throw unavailable();
    }
    const existing = getApps().find((candidate) => candidate.name === LOCAL_PROJECT_ID);
    if (existing && existing.options.projectId !== LOCAL_PROJECT_ID) throw unavailable();
    this.cachedApp = existing ?? initializeApp({ projectId }, LOCAL_PROJECT_ID);
    return this.cachedApp;
  }

  get auth(): Auth {
    const authEmulator = process.env.FIREBASE_AUTH_EMULATOR_HOST;
    if (!isLoopbackEmulator(authEmulator)) throw unavailable();
    process.env.FIREBASE_AUTH_EMULATOR_HOST = authEmulator;
    return getAuth(this.app);
  }

  get firestore(): Firestore {
    const firestoreEmulator = process.env.FIRESTORE_EMULATOR_HOST;
    if (!isLoopbackEmulator(firestoreEmulator)) throw unavailable();
    process.env.FIRESTORE_EMULATOR_HOST = firestoreEmulator;
    return getFirestore(this.app);
  }

  verifyIdToken(token: string, checkRevoked = true): Promise<DecodedIdToken> {
    return this.auth.verifyIdToken(token, checkRevoked);
  }

}

function unavailable(): ServiceUnavailableException {
  return new ServiceUnavailableException({
    error: 'IDENTITY_PROVIDER_UNAVAILABLE',
    message: 'Local Firebase emulator is not configured.',
  });
}

function isLoopbackEmulator(value: string | undefined): value is string {
  return Boolean(value && /^(localhost|127\.0\.0\.1|\[::1\]):\d{1,5}$/.test(value));
}
