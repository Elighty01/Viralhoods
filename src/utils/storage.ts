import { Subscriber, NewsItem, isChiefAdminEmail } from '../types';
import { db } from '../firebase';
import { collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';

const SUBSCRIBERS_KEY = 'viralhoods_subscribers';
const BOOKMARKS_KEY = 'viralhoods_bookmarks';
const CUSTOM_STORIES_KEY = 'viralhoods_custom_stories';
const CHIEF_STEALTH_KEY = 'viralhoods_chief_stealth_mode';

// ---------------------------------------------------------------------------
// NOTE ON AUTH: sign-in, sign-up, and admin status now live entirely in
// Firebase Auth + Firebase custom claims (see firebase.ts and
// functions/src/index.ts). There is no local password store or admin
// allow-list here anymore — a previous version of this file kept a
// plaintext password and a hardcoded admin password in the client bundle,
// which meant anyone who opened the browser's dev tools could read it and
// grant themselves admin access. Everything below is purely local, personal
// UI state (bookmarks, draft stories, a cosmetic roster preference) that
// carries no privilege on its own.
// ---------------------------------------------------------------------------

/**
 * Chief Admin Stealth / Invisibility Mode (cosmetic only — controls whether
 * the Chief Administrator is shown in the staff roster UI to other admins).
 */
export const getChiefAdminStealthMode = (): 'hidden' | 'masked' => {
  try {
    const val = localStorage.getItem(CHIEF_STEALTH_KEY);
    if (val === 'masked') return 'masked';
    return 'hidden';
  } catch {
    return 'hidden';
  }
};

export const setChiefAdminStealthMode = (mode: 'hidden' | 'masked'): void => {
  try {
    localStorage.setItem(CHIEF_STEALTH_KEY, mode);
  } catch (e) {
    console.error('Failed to set stealth mode', e);
  }
};

export const getSubscribers = (): Subscriber[] => {
  try {
    const raw = localStorage.getItem(SUBSCRIBERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

/**
 * Add a subscriber to Firestore cloud database and local cache.
 * Idempotently saves with slugified email ID so no duplicate entries.
 */
export const addSubscriber = async (
  email: string,
  source: 'login' | 'newsletter_box' | 'registration' | string = 'newsletter_box',
  uid?: string
): Promise<boolean> => {
  const clean = email.trim().toLowerCase();
  if (!clean || !clean.includes('@')) return false;

  const docId = clean.replace(/[^a-zA-Z0-9_-]/g, '_');
  const nowIso = new Date().toISOString();

  const newSub: Subscriber = {
    id: docId,
    email: clean,
    subscribedAt: nowIso,
    source,
    uid: uid || undefined,
  };

  // 1. Persist directly to Firestore database
  try {
    await setDoc(
      doc(db, 'subscribers', docId),
      {
        id: docId,
        email: clean,
        subscribedAt: nowIso,
        source,
        uid: uid || null,
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('[Subscribers] Firestore sync error:', err);
  }

  // 2. Cache in localStorage
  try {
    const current = getSubscribers();
    const exists = current.some((s) => s.email.toLowerCase() === clean);
    if (!exists) {
      const updated = [newSub, ...current];
      localStorage.setItem(SUBSCRIBERS_KEY, JSON.stringify(updated));
    }
  } catch (e) {
    console.error('Storage error', e);
  }

  // 3. Dispatch subscription confirmation message via Brevo backend
  try {
    fetch('/api/newsletter/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: clean, source }),
    }).catch(() => {});
  } catch {
    // non-fatal
  }

  return true;
};

/**
 * Fetch all subscribers live from Firestore database (with local cache fallback).
 */
export const fetchSubscribersFromFirestore = async (): Promise<Subscriber[]> => {
  try {
    const snap = await getDocs(collection(db, 'subscribers'));
    const list: Subscriber[] = [];
    snap.forEach((d) => {
      const data = d.data();
      if (data.email) {
        list.push({
          id: d.id,
          email: data.email,
          subscribedAt: data.subscribedAt || data.createdAt || new Date().toISOString(),
          source: data.source || 'newsletter_box',
          uid: data.uid || undefined,
        });
      }
    });

    // Also include any local subscribers that might not have synced yet
    const local = getSubscribers();
    for (const loc of local) {
      if (!list.some((s) => s.email.toLowerCase() === loc.email.toLowerCase())) {
        list.push(loc);
        const docId = loc.email.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
        setDoc(
          doc(db, 'subscribers', docId),
          {
            id: docId,
            email: loc.email,
            subscribedAt: loc.subscribedAt,
            source: loc.source,
          },
          { merge: true }
        ).catch(() => {});
      }
    }

    list.sort((a, b) => new Date(b.subscribedAt).getTime() - new Date(a.subscribedAt).getTime());
    return list;
  } catch (err) {
    console.warn('[Subscribers] Firestore fetch error, falling back to local cache:', err);
    return getSubscribers();
  }
};

/**
 * Remove a subscriber from Firestore and local cache.
 */
export const deleteSubscriberFromFirestore = async (subscriberIdOrEmail: string): Promise<boolean> => {
  const clean = subscriberIdOrEmail.trim().toLowerCase();
  const docId = clean.replace(/[^a-zA-Z0-9_-]/g, '_');

  try {
    await deleteDoc(doc(db, 'subscribers', docId));
  } catch (e) {
    console.warn('[Subscribers] Delete from Firestore note:', e);
  }

  try {
    const current = getSubscribers();
    const updated = current.filter(
      (s) => s.email.toLowerCase() !== clean && s.id !== subscriberIdOrEmail && s.id !== docId
    );
    localStorage.setItem(SUBSCRIBERS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Storage error', e);
  }

  return true;
};

export const getBookmarks = (): string[] => {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const toggleBookmark = (storyId: string): boolean => {
  const list = getBookmarks();
  const idx = list.indexOf(storyId);
  let updated: string[];
  let isBookmarked: boolean;
  if (idx >= 0) {
    updated = list.filter((id) => id !== storyId);
    isBookmarked = false;
  } else {
    updated = [...list, storyId];
    isBookmarked = true;
  }
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Storage error', e);
  }
  return isBookmarked;
};

export const getCustomStories = (): NewsItem[] => {
  try {
    const raw = localStorage.getItem(CUSTOM_STORIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveCustomStory = (story: NewsItem): void => {
  const current = getCustomStories();
  const existsIdx = current.findIndex((s) => s.id === story.id);
  let updated: NewsItem[];
  if (existsIdx >= 0) {
    updated = [...current];
    updated[existsIdx] = story;
  } else {
    updated = [story, ...current];
  }
  try {
    localStorage.setItem(CUSTOM_STORIES_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Storage error', e);
  }
};

export const deleteCustomStory = (storyId: string): void => {
  const current = getCustomStories();
  const updated = current.filter((s) => s.id !== storyId);
  try {
    localStorage.setItem(CUSTOM_STORIES_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Storage error', e);
  }
};

export { isChiefAdminEmail };
