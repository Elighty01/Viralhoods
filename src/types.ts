export interface NewsItem {
  id: string;
  category: string;
  title: string;
  originalTitle?: string;
  summary: string;
  source?: string;
  url?: string;
  image?: string;
  date: string;
  author?: string;
  readTime?: string;
  keyTakeaways?: string[];
  content?: string[];
  whyItMatters?: string;
  whatNext?: string;
}

export interface NewsData {
  updated: string;
  items: NewsItem[];
}

export interface Subscriber {
  email: string;
  subscribedAt: string;
  source: 'login' | 'newsletter_box' | 'registration';
}

export interface User {
  email: string;
  name?: string;
  isAdmin: boolean;
}

export interface RegisteredAccount {
  usernameOrEmail: string;
  password: string; // Stored locally/in firestore for member account validation
  name?: string;
  createdAt: string;
  isAdmin?: boolean;
}

export const CHIEF_ADMIN_EMAIL = 'yussuftimi@gmail.com';
export const ADMIN_MASTER_PASSWORD = '2026@Password';

export interface AdminMember {
  email: string;
  name?: string;
  addedBy: string;
  addedAt: string;
  isChief?: boolean;
}

export const CATEGORIES = [
  "World",
  "Politics",
  "Finance",
  "Health",
  "Entertainment",
  "Research",
  "Science",
  "AI",
  "Tech",
  "Sports",
] as const;

export type Category = (typeof CATEGORIES)[number];
