/**
 * Firebase initialization for Auth (email/password, etc.).
 *
 * To use the same Firebase as web: copy from AiPayrollWeb/.env.development into AiPayrollApp/.env:
 *   VITE_FIREBASE_API_KEY     → EXPO_PUBLIC_FIREBASE_API_KEY
 *   VITE_FIREBASE_AUTH_DOMAIN → EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
 *   VITE_FIREBASE_PROJECT_ID  → EXPO_PUBLIC_FIREBASE_PROJECT_ID
 * Restart Expo after changing .env.
 */
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import Constants from 'expo-constants';

const getEnv = (key: string, extraKey: string): string => {
  const fromExtra = Constants.expoConfig?.extra?.[extraKey];
  const fromProcess = process.env[key];
  if (typeof fromExtra === 'string' && fromExtra && !fromExtra.includes('${')) return fromExtra;
  if (typeof fromProcess === 'string' && fromProcess) return fromProcess;
  return '';
};

const apiKey = getEnv('EXPO_PUBLIC_FIREBASE_API_KEY', 'firebaseApiKey');
const authDomain = getEnv('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', 'firebaseAuthDomain');
const projectId = getEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID', 'firebaseProjectId');
const storageBucket = getEnv('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET', 'firebaseStorageBucket');
const messagingSenderId = getEnv('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', 'firebaseMessagingSenderId');
const appId = getEnv('EXPO_PUBLIC_FIREBASE_APP_ID', 'firebaseAppId');

// Same as web: only apiKey, authDomain, projectId required
const hasRequiredConfig = apiKey && authDomain && projectId;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export function getFirebaseAuth(): Auth | null {
  if (auth) return auth;
  if (!hasRequiredConfig) {
    if (__DEV__) {
      console.warn('[Firebase] Missing config. Copy VITE_FIREBASE_* from AiPayrollWeb/.env.development to AiPayrollApp/.env as EXPO_PUBLIC_FIREBASE_*.');
      console.log('[Firebase] Debug – env at load time:', {
        EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ? `set (length ${process.env.EXPO_PUBLIC_FIREBASE_API_KEY.length})` : 'missing',
        EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ? `set (${process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN})` : 'missing',
        EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ? `set (${process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID})` : 'missing',
        fromExtra: {
          firebaseApiKey: Constants.expoConfig?.extra?.firebaseApiKey ? 'set' : 'missing',
          firebaseAuthDomain: Constants.expoConfig?.extra?.firebaseAuthDomain ? 'set' : 'missing',
          firebaseProjectId: Constants.expoConfig?.extra?.firebaseProjectId ? 'set' : 'missing',
        },
      });
    }
    return null;
  }
  if (getApps().length === 0) {
    app = initializeApp({
      apiKey,
      authDomain,
      projectId,
      ...(storageBucket && { storageBucket }),
      ...(messagingSenderId && { messagingSenderId }),
      ...(appId && { appId }),
    });
  } else {
    app = getApps()[0] as FirebaseApp;
  }
  auth = getAuth(app);
  return auth;
}

export function isFirebaseConfigured(): boolean {
  return Boolean(hasRequiredConfig);
}
