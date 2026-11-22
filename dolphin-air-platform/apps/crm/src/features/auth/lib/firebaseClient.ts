import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  browserLocalPersistence,
  browserSessionPersistence,
  connectAuthEmulator,
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';

const appName = 'dolphin-air-crm';
let emulatorConnected = false;

export function getFirebaseAuth(): Auth {
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
    appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
  };
  if (Object.values(config).some((value) => !value)) {
    throw new Error('Local Firebase configuration is missing.');
  }
  const emulatorUrl = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_URL as string | undefined;
  if (!import.meta.env.DEV || config.projectId !== 'dolphin-air-local' || !isLoopbackEmulator(emulatorUrl)) {
    throw new Error('Staff sign-in is available only with the local Firebase Auth emulator.');
  }

  const app = getApps().some((candidate) => candidate.name === appName)
    ? getApp(appName)
    : initializeApp(config, appName);
  const auth = getAuth(app);
  if (!emulatorConnected) {
    connectAuthEmulator(auth, emulatorUrl, { disableWarnings: true });
    emulatorConnected = true;
  }
  return auth;
}

function isLoopbackEmulator(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  } catch {
    return false;
  }
}

export async function setRememberedSession(auth: Auth, remember: boolean): Promise<void> {
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
}

export async function signInWithStaffPassword(email: string, password: string, remember: boolean) {
  const auth = getFirebaseAuth();
  await setRememberedSession(auth, remember);
  const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  return credential.user;
}

export async function signInWithStaffGoogle(remember: boolean) {
  const auth = getFirebaseAuth();
  await setRememberedSession(auth, remember);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const credential = await signInWithPopup(auth, provider);
  return credential.user;
}

export async function signOutFirebase(): Promise<void> {
  const auth = getFirebaseAuth();
  await signOut(auth);
}

export function apiBase(): string {
  return (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';
}
