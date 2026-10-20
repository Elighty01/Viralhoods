import {
  User,
  Subscriber,
  NewsItem,
  RegisteredAccount,
  ADMIN_MASTER_PASSWORD,
  ACCEPTED_ADMIN_PASSWORDS,
  CHIEF_ADMIN_EMAIL,
  CHIEF_ADMIN_EMAILS,
  isChiefAdminEmail,
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
const CHIEF_STEALTH_KEY = 'viralhoods_chief_stealth_mode';

/**
 * Validates master admin password
 */
export const verifyAdminPassword = (password: string): boolean => {
  const trimmed = password.trim();
  return trimmed === ADMIN_MASTER_PASSWORD || ACCEPTED_ADMIN_PASSWORDS.includes(trimmed);
};

/**
 * Chief Admin Stealth / Invisibility Mode
 * 'hidden': Chief admin is omitted entirely from the staff roster view of other admins.
 * 'masked': Chief admin appears in staff roster as a standard administrator with zero chief badges or indicators.
 */
export const getChiefAdminStealthMode = (): 'hidden' | 'masked' => {
  try {
    const val = localStorage.getItem(CHIEF_STEALTH_KEY);
    if (val === 'masked') return 'masked';
    return 'hidden'; // Default: completely invisible to other admins
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

/**
 * Internal raw list of all administrator entries - Chief Admin is the sole authorized administrator
 */
export const getRawAdminList = (): AdminMember[] => {
  const defaultChief: AdminMember = {
    email: CHIEF_ADMIN_EMAIL,
    name: 'Chief Administrator',
    addedBy: 'System',
    addedAt: '2026-01-01T00:00:00.000Z',
    isChief: true,
    invisibleToStaff: false,
  };

  try {
    // Strictly preserve ONLY the Chief Administrator account (tobionlyn@gmail.com)
    // Completely wipe all other admins, previous entries, or histories
    localStorage.setItem(ADMINS_KEY, JSON.stringify([defaultChief]));
    return [defaultChief];
  } catch {
    return [defaultChief];
  }
};

/**
 * Gets appointed administrators, enforcing Chief Administrator exclusivity:
 */
export const getAdminMembers = (_viewerEmailOrUsername?: string | null): AdminMember[] => {
  return getRawAdminList();
};

/**
 * Automatically purges any removed admin entries, codes, and histories from system storage
 */
export const purgeRemovedAdminHistory = (): void => {
  deleteAdminCompletelyAndPurgeHistory();
};

/**
 * Completely deletes any specified admin (or all non-chief admins) and purges all their history, codes, stories, and tokens
 */
export const deleteAdminCompletelyAndPurgeHistory = (targetEmailOrUsername?: string): void => {
  try {
    const defaultChief: AdminMember = {
      email: CHIEF_ADMIN_EMAIL,
      name: 'Chief Administrator',
      addedBy: 'System',
      addedAt: '2026-01-01T00:00:00.000Z',
      isChief: true,
      invisibleToStaff: false,
    };
    // Preserve strictly ONLY Chief Administrator in admin list
    localStorage.setItem(ADMINS_KEY, JSON.stringify([defaultChief]));

    // Clean accounts
    const rawAccounts = localStorage.getItem(ACCOUNTS_KEY);
    if (rawAccounts) {
      const accounts: RegisteredAccount[] = JSON.parse(rawAccounts);
      const filtered = accounts.filter((a) => {
        const lower = a.usernameOrEmail.toLowerCase();
        if (targetEmailOrUsername && lower === targetEmailOrUsername.toLowerCase()) {
          return false;
        }
        if (lower.includes('yussuf') || lower.includes('viralhoods')) {
          return false;
        }
        return true;
      });
      for (const acc of filtered) {
        if (!isChiefAdminEmail(acc.usernameOrEmail)) {
          acc.isAdmin = false;
        }
      }
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(filtered));
    }

    // Clean subscribers
    const rawSubs = localStorage.getItem(SUBSCRIBERS_KEY);
    if (rawSubs) {
      const subs: Subscriber[] = JSON.parse(rawSubs);
      const filtered = subs.filter((s) => {
        const lower = s.email.toLowerCase();
        if (targetEmailOrUsername && lower === targetEmailOrUsername.toLowerCase()) {
          return false;
        }
        if (lower.includes('yussuf') || lower.includes('viralhoods')) {
          return false;
        }
        return true;
      });
      localStorage.setItem(SUBSCRIBERS_KEY, JSON.stringify(filtered));
    }

    // Clean any stories created by removed admins
    const rawStories = localStorage.getItem(CUSTOM_STORIES_KEY);
    if (rawStories) {
      const stories: NewsItem[] = JSON.parse(rawStories);
      const filteredStories = stories.filter((s) => {
        const author = (s.author || '').toLowerCase();
        if (targetEmailOrUsername && author.includes(targetEmailOrUsername.toLowerCase())) {
          return false;
        }
        if (author.includes('yussuf') || author.includes('viralhoods')) {
          return false;
        }
        return true;
      });
      localStorage.setItem(CUSTOM_STORIES_KEY, JSON.stringify(filteredStories));
    }
  } catch {
    // quiet
  }
};

// Immediately purge removed admin history on module evaluation
purgeRemovedAdminHistory();

/**
 * Checks if email or username has admin privileges
 * Solely the Chief Administrator is granted admin access!
 */
export const isUserAdmin = (emailOrUsername?: string | null): boolean => {
  if (!emailOrUsername) return false;
  const clean = emailOrUsername.trim().toLowerCase();
  return isChiefAdminEmail(clean);
};

/**
 * Adds an appointed admin.
 * MANDATORY SECURITY RULE: Only the Chief Administrator can appoint administrators!
 */
export const addAdminMember = (
  emailOrUsername: string,
  executorEmailOrUsername?: string | null
): { success: boolean; message: string } => {
  const clean = emailOrUsername.trim().toLowerCase();
  if (!clean) return { success: false, message: 'Please enter a valid member email or username.' };

  // Only the Chief Administrator can appoint admins
  if (!isChiefAdminEmail(executorEmailOrUsername)) {
    return {
      success: false,
      message: 'Access denied: Only the Chief Administrator has the exclusive authority to appoint administrators.',
    };
  }

  const current = getRawAdminList();
  if (current.some((a) => a.email.toLowerCase() === clean)) {
    return { success: false, message: `${clean} is already an administrator.` };
  }

  const newMember: AdminMember = {
    email: clean,
    name: clean.split('@')[0],
    addedBy: 'Chief Administrator',
    addedAt: new Date().toISOString(),
    isChief: false,
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
 * Removes an appointed admin.
 * MANDATORY SECURITY RULE: Only the Chief Administrator can revoke administrator privileges!
 */
export const removeAdminMember = (
  emailOrUsername: string,
  executorEmailOrUsername?: string | null
): { success: boolean; message: string } => {
  const clean = emailOrUsername.trim().toLowerCase();

  // Only the Chief Administrator can revoke admins
  if (!isChiefAdminEmail(executorEmailOrUsername)) {
    return {
      success: false,
      message: 'Access denied: Only the Chief Administrator has the exclusive authority to revoke administrators.',
    };
  }

  if (isChiefAdminEmail(clean)) {
    return {
      success: false,
      message: 'Security restriction: The Chief Administrator account cannot be removed.',
    };
  }

  const current = getRawAdminList();
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
  const defaultChiefAccount: RegisteredAccount = {
    usernameOrEmail: CHIEF_ADMIN_EMAIL,
    password: ADMIN_MASTER_PASSWORD,
    name: 'Chief Administrator',
    createdAt: '2026-01-01T00:00:00.000Z',
    isAdmin: true,
  };

  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) {
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([defaultChiefAccount]));
      return [defaultChiefAccount];
    }
    const accounts: RegisteredAccount[] = JSON.parse(raw);
    const cleaned = accounts.filter(
      (a) =>
        !a.usernameOrEmail.toLowerCase().includes('yussuf') &&
        !a.usernameOrEmail.toLowerCase().includes('viralhoods')
    );
    const existingIdx = cleaned.findIndex(
      (a) => a.usernameOrEmail.toLowerCase() === CHIEF_ADMIN_EMAIL.toLowerCase()
    );
    if (existingIdx === -1) {
      cleaned.unshift(defaultChiefAccount);
    } else {
      cleaned[existingIdx].isAdmin = true;
    }
    // Remove admin privilege from all other accounts
    for (const acc of cleaned) {
      if (!isChiefAdminEmail(acc.usernameOrEmail)) {
        acc.isAdmin = false;
      }
    }
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(cleaned));
    return cleaned;
  } catch {
    return [defaultChiefAccount];
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

  // STRICT SECURITY: Only the Chief Administrator (tobionlyn@gmail.com) can ever hold admin rights!
  const isAdmin = isChiefAdminEmail(cleanId);

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
 * STRICT SECURITY: Past staff or unauthorized accounts CANNOT obtain administrative access!
 */
export const verifyAccountCredentials = (
  usernameOrEmail: string,
  password: string
): { success: boolean; account?: RegisteredAccount; error?: string } => {
  const cleanId = usernameOrEmail.trim().toLowerCase();
  if (!cleanId) {
    return { success: false, error: 'Please enter your username or email address.' };
  }

  const isMasterPass = verifyAdminPassword(password);
  const isChief = isChiefAdminEmail(cleanId);

  // If Chief Administrator logs in with Chief credentials
  if (isChief && (password === ADMIN_MASTER_PASSWORD || isMasterPass)) {
    return {
      success: true,
      account: {
        usernameOrEmail: CHIEF_ADMIN_EMAIL,
        password: ADMIN_MASTER_PASSWORD,
        name: 'Chief Administrator',
        createdAt: '2026-01-01T00:00:00.000Z',
        isAdmin: true,
      },
    };
  }

  const account = findRegisteredAccount(cleanId);
  if (!account) {
    return {
      success: false,
      error: 'No account found with this username or email. Members must create an account first before signing in.',
    };
  }

  // Account exists, verify password
  if (account.password !== password) {
    return { success: false, error: 'Incorrect password. Please try again or use Forgot Password.' };
  }

  // STRICT SECURITY: Non-chief accounts CANNOT have admin rights, even if they know passwords
  return {
    success: true,
    account: {
      ...account,
      isAdmin: isChiefAdminEmail(account.usernameOrEmail),
    },
  };
};

export const getCurrentUser = (): User | null => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Extra security check: revoke admin if not Chief Admin
    if (parsed && parsed.isAdmin && !isChiefAdminEmail(parsed.email)) {
      parsed.isAdmin = false;
      localStorage.setItem(USER_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    return null;
  }
};

export const setCurrentUser = (
  identifier: string,
  name?: string,
  _isAdmin: boolean = false
): User => {
  const clean = identifier.trim().toLowerCase();
  // STRICT SECURITY ENFORCEMENT: Solely tobionlyn@gmail.com is ever granted isAdmin = true!
  const effectiveIsAdmin = isChiefAdminEmail(clean);
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
