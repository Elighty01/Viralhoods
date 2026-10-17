import { User, Subscriber, OWNER_EMAIL, NewsItem } from '../types';

const SUBSCRIBERS_KEY = 'viralhoods_subscribers';
const USER_KEY = 'viralhoods_user';
const BOOKMARKS_KEY = 'viralhoods_bookmarks';
const CUSTOM_STORIES_KEY = 'viralhoods_custom_stories';

export const isOwnerEmail = (email?: string | null): boolean => {
  if (!email) return false;
  return email.trim().toLowerCase() === OWNER_EMAIL.toLowerCase();
};

export const getCurrentUser = (): User | null => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      ...parsed,
      isAdmin: isOwnerEmail(parsed.email),
    };
  } catch {
    return null;
  }
};

export const setCurrentUser = (email: string, name?: string): User => {
  const cleanEmail = email.trim().toLowerCase();
  const user: User = {
    email: cleanEmail,
    name: name?.trim() || cleanEmail.split('@')[0],
    isAdmin: isOwnerEmail(cleanEmail),
  };
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    // Automatically subscribe to newsletter upon login
    addSubscriber(cleanEmail, 'login');
  } catch (e) {
    console.error('Storage error', e);
  }
  return user;
};

export const clearCurrentUser = (): void => {
  try {
    localStorage.removeItem(USER_KEY);
  } catch (e) {
    console.error('Storage error', e);
  }
};

export const getSubscribers = (): Subscriber[] => {
  try {
    const raw = localStorage.getItem(SUBSCRIBERS_KEY);
    if (!raw) {
      // Initialize with demo subscribers for rich display in admin
      const initial: Subscriber[] = [
        {
          email: 'yussufelijah@gmail.com',
          subscribedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
          source: 'login',
        },
        {
          email: 'sarah.jenkins@pressmedia.org',
          subscribedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
          source: 'newsletter_box',
        },
        {
          email: 'marcus.vance@techinvest.com',
          subscribedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          source: 'newsletter_box',
        },
        {
          email: 'elena.rostova@globalpolicy.eu',
          subscribedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
          source: 'login',
        },
      ];
      localStorage.setItem(SUBSCRIBERS_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

export const addSubscriber = (
  email: string,
  source: 'login' | 'newsletter_box' = 'newsletter_box'
): boolean => {
  const clean = email.trim().toLowerCase();
  if (!clean || !clean.includes('@')) return false;

  const current = getSubscribers();
  const exists = current.some((s) => s.email.toLowerCase() === clean);
  if (exists) return false;

  const newSub: Subscriber = {
    email: clean,
    subscribedAt: new Date().toISOString(),
    source,
  };
  const updated = [newSub, ...current];
  try {
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
