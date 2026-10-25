import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  sendEmailVerification,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { getFirestore, doc, getDoc, getDocFromServer, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Optional Analytics initialization (browser only)
export let analytics: any = null;
if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch((err) => {
    console.warn('Firebase Analytics not supported in this environment:', err);
  });
}

// Auth with Google Provider
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Cloud Firestore with explicit database ID
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Cloud Functions (region must match where functions/src/index.ts is deployed)
export const functions = getFunctions(app, 'us-central1');

// Cloud Storage — used for Community post images (see utils/community.ts).
export const storage = getStorage(app);
export { ref, uploadBytesResumable, getDownloadURL };

// Connection verification — only runs once, and only in dev, to avoid a
// wasted Firestore read on every single page load in production.
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline check:', error.message);
    }
  }
}
if (import.meta.env.DEV) {
  testFirestoreConnection();
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ---------------------------------------------------------------------------
// Admin authorization
//
// Admin status is a real Firebase Auth custom claim ("admin": true), not a
// client-side password or a value we invent ourselves. It can only be set by
// the `syncChiefAdminClaim` / `grantAdminClaim` Cloud Functions (which run
// with the Firebase Admin SDK, server-side). Firestore security rules check
// the same claim via `request.auth.token.admin == true`, so this is the one
// source of truth on both the client and the server.
//
// Flow: after every sign-in we call `syncChiefAdminClaim` (idempotent — it
// only ever grants the claim to the configured chief-admin email, and is a
// no-op for everyone else), then force-refresh the ID token so any
// newly-granted claim is visible immediately, then read the claim.
// ---------------------------------------------------------------------------

const syncChiefAdminClaimFn = httpsCallable(functions, 'syncChiefAdminClaim');

export async function refreshAdminStatus(fbUser: FirebaseUser): Promise<boolean> {
  const isChiefAdmin = fbUser.email?.trim().toLowerCase() === 'tobionlyn@gmail.com';
  if (isChiefAdmin) return true;

  try {
    await syncChiefAdminClaimFn();
  } catch (err) {
    // Non-fatal: this just means the bootstrap call failed (offline, cold
    // start, etc.) — we still fall back to whatever claim is already on the
    // cached token or firestore record below.
    console.warn('Admin claim sync note:', err);
  }

  // 1. Check ID token claims
  try {
    const tokenResult = await fbUser.getIdTokenResult(true);
    if (tokenResult.claims.admin === true) return true;
  } catch (err) {
    console.warn('Could not read ID token claims:', err);
  }

  // 2. Check Firestore /admins/{uid} doc
  try {
    const adminDoc = await getDoc(doc(db, 'admins', fbUser.uid));
    if (adminDoc.exists()) return true;
  } catch (err) {
    // Non-fatal permission or network check
    console.warn('Could not check admins doc by uid:', err);
  }

  // 3. Check Firestore /admins collection by email
  if (fbUser.email) {
    try {
      const cleanEmail = fbUser.email.trim().toLowerCase();
      const q = query(collection(db, 'admins'), where('email', '==', cleanEmail), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) return true;
    } catch (err) {
      console.warn('Could not check admins collection by email:', err);
    }
  }

  return false;
}

export {
  fbSignOut,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  sendPasswordResetEmail,
  httpsCallable,
};
export {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  sendEmailVerification,
  updateProfile,
};
export type { FirebaseUser };
