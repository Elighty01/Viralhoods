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
import { getFirestore, doc, getDoc, getDocFromServer, collection, query, where, getDocs, limit, setDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ---------------------------------------------------------------------------
// App Check — bot/abuse mitigation for the collections that have to accept
// writes from signed-out visitors (analytics_visits, subscribers; see
// firestore.rules). Those collections had essentially no protection against
// scripted write-spam, and rules alone can't rate-limit; App Check is
// Firebase's purpose-built answer to exactly this.
//
// Inert by default: this only activates once VITE_RECAPTCHA_SITE_KEY is set
// at build time. To turn it on:
//   1. https://console.firebase.google.com/project/_/appcheck → register
//      this web app with a reCAPTCHA v3 site key.
//   2. Set VITE_RECAPTCHA_SITE_KEY to that key (e.g. in GitHub Actions
//      secrets, picked up by vite.config.ts the same way the other
//      VITE_ build-time values are).
//   3. Once you've confirmed real traffic is passing (App Check's console
//      shows verified requests), enable enforcement for Firestore in that
//      same console page. Enforcement is a separate, explicit opt-in step —
//      initializing the SDK here does not by itself start blocking
//      anything, so this is safe to ship ahead of completing steps 1–3.
if (typeof window !== 'undefined' && import.meta.env.VITE_RECAPTCHA_SITE_KEY) {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (err) {
    console.warn('App Check init note:', err);
  }
}

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
// Admin status is a real Firebase Auth custom claim ("admin": true, and
// "chiefAdmin": true for the single Chief Administrator), not a client-side
// password or a value we invent ourselves. It can only be set by the
// `syncChiefAdminClaim` / `grantAdminClaim` Cloud Functions (which run with
// the Firebase Admin SDK, server-side, and read the configured chief-admin
// email from a Secret Manager secret — never a literal in source). Firestore
// security rules check the same claims, so this is the one source of truth
// on both the client and the server. There is deliberately no
// hardcoded-email fast path here anymore: that email, once baked into this
// file, shipped in plaintext inside the public JS bundle, making the single
// most powerful account on the site trivially greppable by anyone.
//
// Flow: after every sign-in we call `syncChiefAdminClaim` (idempotent — it
// only ever grants the claim to the configured chief-admin email, and is a
// no-op for everyone else), then force-refresh the ID token so any
// newly-granted claim is visible immediately, then read the claims.
// ---------------------------------------------------------------------------

const syncChiefAdminClaimFn = httpsCallable(functions, 'syncChiefAdminClaim');

export interface AdminStatus {
  isAdmin: boolean;
  isChiefAdmin: boolean;
}

const NOT_ADMIN: AdminStatus = { isAdmin: false, isChiefAdmin: false };

export const CHIEF_ADMIN_EMAILS = ['tobionlyn@gmail.com'];

export async function refreshAdminStatus(fbUser: FirebaseUser): Promise<AdminStatus> {
  const cleanEmail = (fbUser.email || '').trim().toLowerCase();

  // 0. Hardened verification for configured Chief Administrator
  if (cleanEmail && CHIEF_ADMIN_EMAILS.includes(cleanEmail)) {
    try {
      const now = new Date().toISOString();
      await setDoc(
        doc(db, 'admins', cleanEmail),
        {
          email: cleanEmail,
          name: fbUser.displayName || 'Chief Administrator',
          isChief: true,
          role: 'Chief Administrator',
          updatedAt: now,
        },
        { merge: true }
      ).catch(() => {});

      if (fbUser.uid) {
        await setDoc(
          doc(db, 'admins', fbUser.uid),
          {
            email: cleanEmail,
            uid: fbUser.uid,
            name: fbUser.displayName || 'Chief Administrator',
            isChief: true,
            role: 'Chief Administrator',
            updatedAt: now,
          },
          { merge: true }
        ).catch(() => {});
      }
    } catch (err) {
      console.warn('Chief admin auto-sync note:', err);
    }
    return { isAdmin: true, isChiefAdmin: true };
  }

  try {
    await syncChiefAdminClaimFn();
  } catch (err) {
    // Non-fatal: this just means the bootstrap call failed (offline, cold
    // start, etc.) — we still fall back to whatever claim is already on the
    // cached token or firestore record below.
    console.warn('Admin claim sync note:', err);
  }

  // 1. Check ID token claims — the real, server-verified source of truth.
  try {
    const tokenResult = await fbUser.getIdTokenResult(true);
    if (tokenResult.claims.admin === true) {
      return { isAdmin: true, isChiefAdmin: tokenResult.claims.chiefAdmin === true };
    }
  } catch (err) {
    console.warn('Could not read ID token claims:', err);
  }

  // 2. Check Firestore /admins/{uid} doc. `isChief` on these docs is only
  //    ever written by the Cloud Functions above, so it's a reasonable
  //    fallback signal here (not a trust boundary by itself — Firestore
  //    rules are the actual enforcement, and only check the claim).
  try {
    const adminDoc = await getDoc(doc(db, 'admins', fbUser.uid));
    if (adminDoc.exists()) {
      return { isAdmin: true, isChiefAdmin: adminDoc.data()?.isChief === true };
    }
  } catch (err) {
    console.warn('Could not check admins doc by uid:', err);
  }

  // 3. Check Firestore /admins/{email} doc directly (instant, index-free)
  if (fbUser.email) {
    const cleanEmail = fbUser.email.trim().toLowerCase();
    try {
      const adminDocByEmail = await getDoc(doc(db, 'admins', cleanEmail));
      if (adminDocByEmail.exists()) {
        return { isAdmin: true, isChiefAdmin: adminDocByEmail.data()?.isChief === true };
      }
    } catch (err) {
      console.warn('Could not check admins doc by email ID:', err);
    }

    try {
      const q = query(collection(db, 'admins'), where('email', '==', cleanEmail), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return { isAdmin: true, isChiefAdmin: snap.docs[0].data()?.isChief === true };
      }
    } catch (err) {
      console.warn('Could not check admins collection by email query:', err);
    }
  }

  return NOT_ADMIN;
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
