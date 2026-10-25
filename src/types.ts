export interface NewsItem {
  id: string;
  category: string;
  title: string;
  originalTitle?: string;
  summary: string;
  source?: string;
  url?: string;
  image?: string;
  videoUrl?: string;
  videoEmbedUrl?: string;
  hasVideo?: boolean;
  date: string;
  author?: string;
  readTime?: string;
  keyTakeaways?: string[];
  content?: string[];
  whyItMatters?: string;
  whatNext?: string;
  subSector?: string;
  tags?: string[];
}

export interface NewsData {
  updated: string;
  items: NewsItem[];
}

export interface Subscriber {
  id?: string;
  email: string;
  subscribedAt: string;
  source: 'login' | 'newsletter_box' | 'registration' | string;
  uid?: string;
}

export interface User {
  email: string;
  name?: string;
  // Reflects a real Firebase Auth custom claim ("admin": true), synced and
  // verified server-side — see firebase.ts `refreshAdminStatus`. This is no
  // longer a client-trusted flag by itself.
  isAdmin: boolean;
  uid?: string;
  // Set once the user claims a Community username (see utils/community.ts
  // `claimUsername`). Undefined/null means they haven't picked one yet.
  username?: string | null;
}

export interface RegisteredMemberRecord {
  id: string;
  usernameOrEmail: string;
  email: string;
  name: string;
  registeredAt: string;
  lastLogin: string;
  loginCount: number;
  source: 'registration' | 'google_auth' | 'login_portal';
  isAdmin: boolean;
  device?: string;
  browser?: string;
  location?: string;
}

// The Chief Administrator's identity. This is a UI hint only (used to label
// the roster and decide whether to *attempt* the admin claim bootstrap after
// sign-in) — it grants no privilege by itself. Real authorization is a
// Firebase custom claim ("admin": true) that only the `syncChiefAdminClaim`
// Cloud Function can set, and that Firestore security rules check
// server-side. See functions/src/index.ts.
export const CHIEF_ADMIN_EMAILS = ['tobionlyn@gmail.com'] as const;
export const CHIEF_ADMIN_EMAIL = CHIEF_ADMIN_EMAILS[0];

export const isChiefAdminEmail = (emailOrUsername?: string | null): boolean => {
  if (!emailOrUsername) return false;
  const clean = emailOrUsername.trim().toLowerCase();
  return clean === CHIEF_ADMIN_EMAIL.toLowerCase();
};

export interface AdminMember {
  email: string;
  name?: string;
  addedBy: string;
  addedAt: string;
  isChief?: boolean;
  invisibleToStaff?: boolean;
}

export const CATEGORIES = [
  'World',
  'Politics',
  'Finance',
  'Health',
  'Entertainment',
  'Research',
  'Science',
  'AI & Tech',
  'Sports',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const HOME_CATEGORY = 'Home';

export const CATEGORY_ALIASES: Record<string, string> = {
  ai: 'AI & Tech',
  tech: 'AI & Tech',
  'ai & tech': 'AI & Tech',
  'ai-tech': 'AI & Tech',
  'ai-tech-news': 'AI & Tech',
};

export const normalizeCategoryName = (value?: string | null): string => {
  if (!value) return HOME_CATEGORY;
  const cleaned = value.trim();
  const exact = CATEGORIES.find((cat) => cat.toLowerCase() === cleaned.toLowerCase());
  if (exact) return exact;
  const alias = CATEGORY_ALIASES[cleaned.toLowerCase()];
  if (alias) return alias;
  const normalized = cleaned.toLowerCase().replace(/[^a-z0-9&\s-]/g, '').replace(/\s+/g, ' ');
  if (normalized === 'ai' || normalized === 'tech' || normalized === 'ai tech' || normalized === 'ai-tech') {
    return 'AI & Tech';
  }
  return cleaned;
};

export const categoryMatches = (value: string | null | undefined, target: string): boolean => {
  const normalizedValue = normalizeCategoryName(value);
  const normalizedTarget = normalizeCategoryName(target);
  if (normalizedValue === normalizedTarget) return true;
  if (normalizedTarget === 'AI & Tech') {
    return ['AI & Tech', 'AI', 'Tech'].includes(normalizedValue);
  }
  return false;
};

// Entertainment Hub sub-pages. Stories tagged with one of these in
// `subSector` (category === 'Entertainment') populate that sub-page's bot
// feed, in addition to the curated editorial picks.
export const ENTERTAINMENT_SUBSECTORS = ['videos', 'music', 'movies', 'novels'] as const;
export type EntertainmentSubsector = (typeof ENTERTAINMENT_SUBSECTORS)[number];

export interface GoogleSearchResultItem {
  title: string;
  url: string;
  snippet: string;
  source: string;
  date?: string;
  isGoogleNews?: boolean;
  isCustomSearch?: boolean;
  displayLink?: string;
  thumbnail?: string;
}

export interface LocalSearchResultItem {
  id: string;
  title: string;
  summary: string;
  category: string;
  source: string;
  date: string;
  url: string;
  image?: string;
  author?: string;
  readTime?: string;
  score?: number;
}

// ---------------------------------------------------------------------------
// Community (user-posted blog/board)
// ---------------------------------------------------------------------------

export const POST_TYPES = ['text', 'image', 'video', 'link'] as const;
export type PostType = (typeof POST_TYPES)[number];

export interface LinkPreview {
  title?: string;
  description?: string;
  image?: string;
  domain?: string;
}

export interface CommunityComment {
  id: string;
  postId: string;
  authorUid: string;
  authorUsername: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface CommunityPost {
  id: string;
  authorUid: string;
  authorUsername: string;
  authorName: string;
  authorPhotoURL?: string | null;
  type: PostType;
  title: string;
  body?: string;
  imageUrls?: string[];
  videoEmbedUrl?: string;
  videoSourceUrl?: string;
  linkUrl?: string;
  linkPreview?: LinkPreview | null;
  createdAt: string;
  updatedAt?: string;
  likeCount: number;
  likedBy?: string[];
  commentCount?: number;
}

export interface UserProfile {
  uid: string;
  username: string;
  usernameLower: string;
  displayName: string;
  bio?: string;
  photoURL?: string | null;
  createdAt: string;
}

export interface UnifiedSearchResponse {
  query: string;
  sourceBreakdown: {
    total: number;
    localNewsCount: number;
    googleCount: number;
    usingCustomSearchApi: boolean;
  };
  localResults: LocalSearchResultItem[];
  googleResults: GoogleSearchResultItem[];
  aiOverview?: string;
  webQueries?: string[];
  groundingSources?: { title: string; url: string }[];
  directGoogleUrl: string;
  directGoogleNewsUrl: string;
  directGoogleImagesUrl?: string;
  directGoogleVideosUrl?: string;
}
