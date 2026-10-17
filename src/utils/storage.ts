import {
  User,
  Subscriber,
  NewsItem,
  RegisteredAccount,
  ADMIN_MASTER_PASSWORD,
  ACCEPTED_ADMIN_PASSWORDS,
  CHIEF_ADMIN_EMAIL,
  VIRALHOODS_ADMIN_USERNAME,
  VIRALHOODS_ADMIN_PASSWORD,
  AdminMember,
} from '../types';

const SUBSCRIBERS_KEY = 'viralhoods_subscribers';
const USER_KEY = 'viralhoods_user';
const BOOKMARKS_KEY = 'viralhoods_bookmarks';
const CUSTOM_STORIES_KEY = 'viralhoods_custom_stories';
const ACCOUNTS_KEY = 'viralhoods_registered_accounts';
const ADMINS_KEY = 'viralhoods_admin_list';

/**
 * Validates master admin password
 */
export const verifyAdminPassword = (password: string): boolean => {
  const trimmed = password.trim();
  return trimmed === ADMIN_MASTER_PASSWORD || ACCEPTED_ADMIN_PASSWORDS.includes(trimmed);
};

/**
 * Gets all appointed administrators
 */
export const getAdminMembers = (): AdminMember[] => {
  const defaultChief: AdminMember = {
    email: CHIEF_ADMIN_EMAIL,
    name: 'Chief Administrator',
    addedBy: 'System',
    addedAt: '2026-01-01T00:00:00.000Z',
    isChief: true,
  };
  const defaultViralhoods: AdminMember = {
    email: VIRALHOODS_ADMIN_USERNAME,
    name: 'Viralhoods Administrator',
    addedBy: 'System',
    addedAt: '2026-01-01T00:00:00.000Z',
    isChief: true,
  };

  try {
    const raw = localStorage.getItem(ADMINS_KEY);
    if (!raw) {
      localStorage.setItem(ADMINS_KEY, JSON.stringify([defaultChief, defaultViralhoods]));
      return [defaultChief, defaultViralhoods];
    }
    const list: AdminMember[] = JSON.parse(raw);
    let updated = [...list];
    if (!updated.some((a) => a.email.toLowerCase() === CHIEF_ADMIN_EMAIL.toLowerCase())) {
      updated.unshift(defaultChief);
    }
    if (!updated.some((a) => a.email.toLowerCase() === VIRALHOODS_ADMIN_USERNAME.toLowerCase())) {
      updated.push(defaultViralhoods);
    }
    if (updated.length !== list.length) {
      localStorage.setItem(ADMINS_KEY, JSON.stringify(updated));
    }
    return updated;
  } catch {
    return [defaultChief, defaultViralhoods];
  }
};

/**
 * Checks if email or username has admin privileges
 */
export const isUserAdmin = (emailOrUsername?: string | null): boolean => {
  if (!emailOrUsername) return false;
  const clean = emailOrUsername.trim().toLowerCase();
  if (
    clean === CHIEF_ADMIN_EMAIL.toLowerCase() ||
    clean === 'viralhoods' ||
    clean === VIRALHOODS_ADMIN_USERNAME.toLowerCase()
  ) {
    return true;
  }
  const admins = getAdminMembers();
  return admins.some((a) => a.email.toLowerCase() === clean);
};

/**
 * Adds an appointed admin by Chief Admin
 */
export const addAdminMember = (
  emailOrUsername: string,
  addedBy: string = CHIEF_ADMIN_EMAIL
): { success: boolean; message: string } => {
  const clean = emailOrUsername.trim().toLowerCase();
  if (!clean) return { success: false, message: 'Please enter a valid member email or username.' };
  const current = getAdminMembers();
  if (current.some((a) => a.email.toLowerCase() === clean)) {
    return { success: false, message: `${clean} is already an administrator.` };
  }
  const newMember: AdminMember = {
    email: clean,
    name: clean.split('@')[0],
    addedBy,
    addedAt: new Date().toISOString(),
    isChief: clean === CHIEF_ADMIN_EMAIL.toLowerCase(),
  };
  const updated = [...current, newMember];
  localStorage.setItem(ADMINS_KEY, JSON.stringify(updated));

  // Also update registered account if it exists
  const accounts = getRegisteredAccounts();
  const accIdx = accounts.findIndex((a) => a.usernameOrEmail.toLowerCase() === clean);
  if (accIdx >= 0) {
    accounts[accIdx].isAdmin = true;
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  }
  return { success: true, message: `Successfully appointed ${clean} as an Administrator!` };
};

/**
 * Removes an appointed admin
 */
export const removeAdminMember = (
  emailOrUsername: string
): { success: boolean; message: string } => {
  const clean = emailOrUsername.trim().toLowerCase();
  if (clean === CHIEF_ADMIN_EMAIL.toLowerCase()) {
    return { success: false, message: 'The Chief Administrator (yussuftimi@gmail.com) cannot be removed.' };
  }
  const current = getAdminMembers();
  const updated = current.filter((a) => a.email.toLowerCase() !== clean);
  localStorage.setItem(ADMINS_KEY, JSON.stringify(updated));

  // Also update registered account if it exists
  const accounts = getRegisteredAccounts();
  const accIdx = accounts.findIndex((a) => a.usernameOrEmail.toLowerCase() === clean);
  if (accIdx >= 0) {
    accounts[accIdx].isAdmin = false;
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  }
  return { success: true, message: `Successfully removed admin privileges for ${clean}.` };
};

/**
 * Gets all locally registered member accounts
 */
export const getRegisteredAccounts = (): RegisteredAccount[] => {
  const defaultViralhoodsAccount: RegisteredAccount = {
    usernameOrEmail: VIRALHOODS_ADMIN_USERNAME,
    password: VIRALHOODS_ADMIN_PASSWORD,
    name: 'Viralhoods Administrator',
    createdAt: '2026-01-01T00:00:00.000Z',
    isAdmin: true,
  };

  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) {
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([defaultViralhoodsAccount]));
      return [defaultViralhoodsAccount];
    }
    const accounts: RegisteredAccount[] = JSON.parse(raw);
    const existingIdx = accounts.findIndex(
      (a) => a.usernameOrEmail.toLowerCase() === VIRALHOODS_ADMIN_USERNAME.toLowerCase()
    );
    if (existingIdx === -1) {
      accounts.unshift(defaultViralhoodsAccount);
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
    } else {
      if (
        accounts[existingIdx].password !== VIRALHOODS_ADMIN_PASSWORD ||
        !accounts[existingIdx].isAdmin
      ) {
        accounts[existingIdx].password = VIRALHOODS_ADMIN_PASSWORD;
        accounts[existingIdx].isAdmin = true;
        localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
      }
    }
    return accounts;
  } catch {
    return [defaultViralhoodsAccount];
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
 * Resets password for a registered member account
 */
export const resetAccountPassword = (
  usernameOrEmail: string,
  newPassword: string
): { success: boolean; message: string } => {
  const clean = usernameOrEmail.trim().toLowerCase();
  if (!clean) return { success: false, message: 'Email or username is required.' };
  if (!newPassword || newPassword.length < 6) {
    return { success: false, message: 'New password must be at least 6 characters long.' };
  }
  const accounts = getRegisteredAccounts();
  const idx = accounts.findIndex((a) => a.usernameOrEmail.toLowerCase() === clean);
  if (idx < 0) {
    return { success: false, message: 'No registered member account found with this username or email.' };
  }
  accounts[idx].password = newPassword;
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  return { success: true, message: 'Password has been reset successfully! You can now sign in with your new password.' };
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

  const isAdmin = isUserAdmin(cleanId) || verifyAdminPassword(password);

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

  // Check if master password or chief admin
  const isMasterPass = verifyAdminPassword(password);
  const isChiefOrAdmin = isUserAdmin(cleanId);

  // Direct match for Viralhoods administrator credentials
  if (cleanId === 'viralhoods' || cleanId === VIRALHOODS_ADMIN_USERNAME.toLowerCase()) {
    if (password === VIRALHOODS_ADMIN_PASSWORD || isMasterPass) {
      return {
        success: true,
        account: {
          usernameOrEmail: VIRALHOODS_ADMIN_USERNAME,
          password: VIRALHOODS_ADMIN_PASSWORD,
          name: 'Viralhoods Administrator',
          createdAt: '2026-01-01T00:00:00.000Z',
          isAdmin: true,
        },
      };
    }
  }

  const account = findRegisteredAccount(cleanId);
  if (!account) {
    // If entered master password or chief admin email, allow admin bypass or prompt registration
    if (isMasterPass || isChiefOrAdmin) {
      const adminAcc: RegisteredAccount = {
        usernameOrEmail: cleanId,
        password,
        name: cleanId === CHIEF_ADMIN_EMAIL ? 'Chief Administrator' : 'Administrator',
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
    return { success: false, error: 'Incorrect password. Please try again or use Forgot Password.' };
  }

  return {
    success: true,
    account: {
      ...account,
      isAdmin: Boolean(account.isAdmin || isMasterPass || isChiefOrAdmin),
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
  const effectiveIsAdmin = Boolean(isAdmin || isUserAdmin(clean));
  const user: User = {
    email: clean,
    name: name?.trim() || clean.split('@')[0],
    isAdmin: effectiveIsAdmin,
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
