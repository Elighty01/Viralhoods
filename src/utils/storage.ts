import { User, Subscriber, NewsItem, RegisteredAccount, ADMIN_MASTER_PASSWORD } from '../types';

const SUBSCRIBERS_KEY = 'viralhoods_subscribers';
const USER_KEY = 'viralhoods_user';
const BOOKMARKS_KEY = 'viralhoods_bookmarks';
const CUSTOM_STORIES_KEY = 'viralhoods_custom_stories';
const ACCOUNTS_KEY = 'viralhoods_registered_accounts';

/**
 * Validates master admin password
 */
export const verifyAdminPassword = (password: string): boolean => {
  return password.trim() === ADMIN_MASTER_PASSWORD;
};

/**
 * Gets all locally registered member accounts
 */
export const getRegisteredAccounts = (): RegisteredAccount[] => {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

/**
 * Finds an account by username or email
 */
export const findRegisteredAccount = (identifier: string): RegisteredAccount | null => {
  const clean = identifier.trim().toLowerCase();
  if (!clean) return null;
  const accounts = getRegisteredAccounts();
  return accounts.find((a) => a.usernameOrEmail.toLowerCase() === clean) || null;
};

/**
 * Registers a new member account with Gmail or username + password
 */
export const registerAccount = (
  usernameOrEmail: string,
  password: string,
  name?: string
): { success: boolean; account?: RegisteredAccount; error?: string } => {
  const cleanId = usernameOrEmail.trim().toLowerCase();
  if (!cleanId) {
    return { success: false, error: 'Username or Gmail/Email address is required.' };
  }
  if (!password || password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  const existing = findRegisteredAccount(cleanId);
  if (existing) {
    return { success: false, error: 'An account already exists with this username or email. Please sign in instead.' };
  }

  const isAdmin = verifyAdminPassword(password);

  const newAccount: RegisteredAccount = {
    usernameOrEmail: cleanId,
    password,
    name: name?.trim() || cleanId.split('@')[0],
    createdAt: new Date().toISOString(),
    isAdmin,
  };

  const current = getRegisteredAccounts();
  const updated = [newAccount, ...current];
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Account storage error:', e);
  }

  // Also auto-subscribe if it's an email format
  if (cleanId.includes('@')) {
    addSubscriber(cleanId, 'registration');
  }

  return { success: true, account: newAccount };
};

/**
 * Verifies credentials before signing in.
 * Users must already have an account created!
 */
export const verifyAccountCredentials = (
  usernameOrEmail: string,
  password: string
): { success: boolean; account?: RegisteredAccount; error?: string } => {
  const cleanId = usernameOrEmail.trim().toLowerCase();
  if (!cleanId) {
    return { success: false, error: 'Please enter your username or email address.' };
  }

  // Check if master password is entered directly
  const isMasterPass = verifyAdminPassword(password);

  const account = findRegisteredAccount(cleanId);
  if (!account) {
    // If entered master password, allow admin bypass or prompt registration
    if (isMasterPass) {
      const adminAcc: RegisteredAccount = {
        usernameOrEmail: cleanId,
        password,
        name: 'Administrator',
        createdAt: new Date().toISOString(),
        isAdmin: true,
      };
      return { success: true, account: adminAcc };
    }
    return {
      success: false,
      error: 'No account found with this username or email. Members must create an account first before signing in.',
    };
  }

  // Account exists, verify password
  if (account.password !== password && !isMasterPass) {
    return { success: false, error: 'Incorrect password. Please try again.' };
  }

  return {
    success: true,
    account: {
      ...account,
      isAdmin: account.isAdmin || isMasterPass,
    },
  };
};

export const getCurrentUser = (): User | null => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed;
  } catch {
    return null;
  }
};

export const setCurrentUser = (
  identifier: string,
  name?: string,
  isAdmin: boolean = false
): User => {
  const clean = identifier.trim().toLowerCase();
  const user: User = {
    email: clean,
    name: name?.trim() || clean.split('@')[0],
    isAdmin,
  };
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    if (clean.includes('@')) {
      addSubscriber(clean, 'login');
    }
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
      // Clean seed subscribers with zero personal emails
      const initial: Subscriber[] = [
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
  source: 'login' | 'newsletter_box' | 'registration' = 'newsletter_box'
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
