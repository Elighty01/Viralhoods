export interface NewsItem {
  id: string;
  category: string;
  title: string;
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
  source: 'login' | 'newsletter_box';
}

export interface User {
  email: string;
  name?: string;
  isAdmin: boolean;
}

export const OWNER_EMAIL = 'yussufelijah@gmail.com';

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
