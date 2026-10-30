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
  // Reflects the "chiefAdmin": true custom claim — distinct from isAdmin so
  // an appointed (non-chief) admin can't accidentally gain chief-only
  // powers. Also server-verified, same as isAdmin (see firebase.ts
  // `refreshAdminStatus`).
  isChiefAdmin?: boolean;
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

// NOTE: the Chief Administrator's email used to be a hardcoded exported
// constant here, which meant it shipped in plaintext inside the public JS
// bundle (and in this public repo's source) — an easy target for phishing
// or credential-stuffing against that one account. It's been removed.
// Chief-admin status is now purely a Firebase Auth custom claim
// ("chiefAdmin": true), set server-side by the `syncChiefAdminClaim` Cloud
// Function (which reads the configured email from a Secret Manager secret,
// never from committed source — see functions/src/index.ts) and checked
// both by Firestore security rules and by `currentUser.isChiefAdmin` on the
// client (populated from the verified ID token — see firebase.ts
// `refreshAdminStatus`). Nothing in this file needs to know the actual
// email at all.

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
  'AI',
  'Tech',
  'Sports',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const HOME_CATEGORY = 'Home';

export const CATEGORY_ALIASES: Record<string, string> = {
  ai: 'AI',
  tech: 'Tech',
  'ai & tech': 'AI',
  'ai-tech': 'AI',
  'ai-tech-news': 'AI',
};

export const normalizeCategoryName = (value?: string | null): string => {
  if (!value) return HOME_CATEGORY;
  const cleaned = value.trim();
  const exact = CATEGORIES.find((cat) => cat.toLowerCase() === cleaned.toLowerCase());
  if (exact) return exact;
  const alias = CATEGORY_ALIASES[cleaned.toLowerCase()];
  if (alias) return alias;
  const normalized = cleaned.toLowerCase().replace(/[^a-z0-9&\s-]/g, '').replace(/\s+/g, ' ');
  if (normalized === 'ai') return 'AI';
  if (normalized === 'tech') return 'Tech';
  if (normalized === 'ai tech' || normalized === 'ai-tech' || normalized === 'ai & tech') return 'AI';
  return cleaned;
};

export const categoryMatches = (value: string | null | undefined, target: string): boolean => {
  if (!value || !target) return false;
  if (target === 'All' || target === HOME_CATEGORY) return true;
  const v = value.trim().toLowerCase();
  const t = target.trim().toLowerCase();
  if (v === t) return true;
  if (t === 'ai & tech') return v === 'ai' || v === 'tech' || v === 'ai & tech';
  if (t === 'ai' && (v === 'ai' || v === 'ai & tech')) return true;
  if (t === 'tech' && (v === 'tech' || v === 'ai & tech')) return true;
  return normalizeCategoryName(value).toLowerCase() === normalizeCategoryName(target).toLowerCase();
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
  // Denormalized counters, kept in sync by followUser/unfollowUser (see
  // utils/community.ts). followerCount is the one shown on profiles/posts;
  // followingCount is tracked for symmetry/future use.
  followerCount?: number;
  followingCount?: number;
}

// A follow relationship: one doc per (followerUid, followedUid) pair, keyed
// by `${followerUid}_${followedUid}` so follow/unfollow is idempotent.
export interface CommunityFollow {
  followerUid: string;
  followedUid: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Advertise With Us — "contact us for ads" inbox (Sidebar + Footer button).
// Visible only to the Chief Administrator (see firestore.rules and
// AdminView's "Ad Inquiries" tab).
// ---------------------------------------------------------------------------

export interface AdInquiry {
  id: string;
  name?: string;
  email: string;
  message: string;
  createdAt: string;
  read?: boolean;
}

// A single slot in the Sidebar's Advertisement widget, read at runtime from
// data/ads.json (see Sidebar.tsx and the README's "Posting / editing
// adverts" section). Two shapes share this collection:
//  - 'card' (the default, so existing ads.json files without a `type`
//    still work): an image/title/description/button ad.
//  - 'embed': a raw iframe embed (e.g. a Spotify player) rendered as-is.
export interface AdEntry {
  id: string;
  type?: 'card' | 'embed';
  sponsor?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  href?: string;
  cta?: string;
  // 'embed' only:
  embedUrl?: string;
  embedHeight?: number;
  embedHtml?: string;
}

export interface AdsData {
  updated: string;
  ads: AdEntry[];
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
