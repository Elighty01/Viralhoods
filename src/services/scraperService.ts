import { Category, CATEGORIES, ENTERTAINMENT_SUBSECTORS, EntertainmentSubsector, NewsItem } from '../types';
import { enrichStoryWithFullContent, extractVideoUrl } from '../utils/articleGenerator';
import { saveCustomStory } from '../utils/storage';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

export const RSS_FEEDS: Record<Category, string[]> = {
  World: [
    'https://feeds.bbci.co.uk/news/world/rss.xml',
    'https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-US&gl=US&ceid=US:en',
  ],
  Politics: [
    'https://feeds.bbci.co.uk/news/politics/rss.xml',
    'https://news.google.com/rss/search?q=politics+legislation+policy&hl=en-US&gl=US&ceid=US:en',
  ],
  Finance: [
    'https://feeds.bbci.co.uk/news/business/rss.xml',
    'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en',
  ],
  Health: [
    'https://feeds.bbci.co.uk/news/health/rss.xml',
    'https://news.google.com/rss/headlines/section/topic/HEALTH?hl=en-US&gl=US&ceid=US:en',
  ],
  Entertainment: [
    'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml',
    'https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=en-US&gl=US&ceid=US:en',
  ],
  Research: [
    'https://news.google.com/rss/search?q=scientific+research+breakthrough&hl=en-US&gl=US&ceid=US:en',
    'https://phys.org/rss-feed/',
  ],
  Science: [
    'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml',
    'https://news.google.com/rss/headlines/section/topic/SCIENCE?hl=en-US&gl=US&ceid=US:en',
  ],
  'AI & Tech': [
    'https://news.google.com/rss/search?q=Artificial+Intelligence+machine+learning&hl=en-US&gl=US&ceid=US:en',
    'https://phys.org/rss-feed/technology-news/computer-sciences/',
    'https://feeds.bbci.co.uk/news/technology/rss.xml',
    'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-US&gl=US&ceid=US:en',
  ],
  Sports: [
    'https://feeds.bbci.co.uk/sport/rss.xml',
    'https://news.google.com/rss/headlines/section/topic/SPORTS?hl=en-US&gl=US&ceid=US:en',
  ],
};

export const ENTERTAINMENT_FEEDS: Record<EntertainmentSubsector, string[]> = {
  videos: [
    'https://news.google.com/rss/search?q=viral+video+OR+youtube+trending&hl=en-US&gl=US&ceid=US:en',
  ],
  music: [
    'https://news.google.com/rss/search?q=new+music+release+OR+album+chart&hl=en-US&gl=US&ceid=US:en',
  ],
  movies: [
    'https://news.google.com/rss/search?q=movie+trailer+OR+box+office+OR+film+review&hl=en-US&gl=US&ceid=US:en',
  ],
  novels: [
    'https://news.google.com/rss/search?q=new+book+release+OR+bestseller+novel&hl=en-US&gl=US&ceid=US:en',
  ],
};

export const DEFAULT_CATEGORY_IMAGES: Record<Category, string> = {
  World: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=900&q=80',
  Politics: 'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?auto=format&fit=crop&w=900&q=80',
  Finance: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=900&q=80',
  Health: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=900&q=80',
  Entertainment: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=900&q=80',
  Research: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=900&q=80',
  Science: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=900&q=80',
  'AI & Tech': 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=900&q=80',
  Sports: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=900&q=80',
};

/**
 * Fetch raw XML text for an RSS feed using local server proxy first,
 * falling back to resilient public CORS proxies.
 */
export async function fetchRssText(feedUrl: string): Promise<string> {
  const isXml = (text: string) =>
    text && (text.includes('<rss') || text.includes('<xml') || text.includes('<feed') || text.includes('<channel'));

  // 1. Try local Express proxy if running
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const resp = await fetch(`/api/scraper/proxy?url=${encodeURIComponent(feedUrl)}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (resp.ok) {
      const text = await resp.text();
      if (isXml(text)) return text;
    }
  } catch {
    // Local proxy not available or timed out (e.g. on live link / GitHub Pages)
  }

  // 2. Try corsproxy.io (fast and high reliability)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const resp = await fetch(`https://corsproxy.io/?url=${encodeURIComponent(feedUrl)}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (resp.ok) {
      const text = await resp.text();
      if (isXml(text)) return text;
    }
  } catch {
    // Fall through
  }

  // 3. Try CodeTabs public CORS proxy
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const resp = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(feedUrl)}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (resp.ok) {
      const text = await resp.text();
      if (isXml(text)) return text;
    }
  } catch {
    // Fall through
  }

  // 4. Try AllOrigins raw endpoint
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const resp = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (resp.ok) {
      const text = await resp.text();
      if (isXml(text)) return text;
    }
  } catch {
    // Fall through
  }

  // 5. Try AllOrigins JSON get endpoint
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const resp = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(feedUrl)}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (resp.ok) {
      const json = await resp.json();
      if (json?.contents && isXml(json.contents)) {
        return json.contents;
      }
    }
  } catch {
    // Fall through
  }

  // 6. Direct fetch (works for CORS-friendly feeds)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(feedUrl, { signal: controller.signal });
    clearTimeout(timeout);
    if (resp.ok) {
      const text = await resp.text();
      if (isXml(text)) return text;
    }
  } catch {
    // Fall through
  }

  throw new Error(`Unable to fetch RSS feed from ${feedUrl}`);
}

function cleanHtml(raw?: string | null): string {
  if (!raw) return '';
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function generateStoryId(prefix: string, title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash << 5) - hash + title.charCodeAt(i);
    hash |= 0;
  }
  const cleanPrefix = prefix.toLowerCase().replace(/[^a-z0-9]/g, '-');
  return `vh-${cleanPrefix}-${Math.abs(hash).toString(36)}`;
}

/**
 * Extracts and cleans raw story items from an RSS XML string.
 */
export function parseRssXmlToStories(
  xmlText: string,
  category: Category,
  subSector?: EntertainmentSubsector,
  limitCount = 3
): Partial<NewsItem>[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');
  const items = doc.querySelectorAll('item');
  const results: Partial<NewsItem>[] = [];

  const defaultImg = DEFAULT_CATEGORY_IMAGES[category] || DEFAULT_CATEGORY_IMAGES.World;

  for (let i = 0; i < items.length && results.length < limitCount; i++) {
    const item = items[i];
    const rawTitle = cleanHtml(item.querySelector('title')?.textContent);
    if (!rawTitle || rawTitle.length < 10) continue;

    const desc = cleanHtml(
      item.querySelector('description')?.textContent ||
      item.querySelector('summary')?.textContent ||
      item.querySelector('content')?.textContent
    );

    const link = item.querySelector('link')?.textContent?.trim() || '#';
    const pubDateStr = item.querySelector('pubDate')?.textContent?.trim();
    const date = pubDateStr ? new Date(pubDateStr).toISOString() : new Date().toISOString();

    // Source / Author
    const source =
      item.querySelector('source')?.textContent?.trim() ||
      item.querySelector('creator')?.textContent?.trim() ||
      item.querySelector('author')?.textContent?.trim() ||
      `Viralhoods ${category} Wire`;

    // Extract image
    let image = defaultImg;
    const mediaContent = item.querySelector('media\\:content, content');
    const mediaThumbnail = item.querySelector('media\\:thumbnail, thumbnail');
    const enclosure = item.querySelector('enclosure');

    if (mediaContent?.getAttribute('url')) {
      image = mediaContent.getAttribute('url')!;
    } else if (mediaThumbnail?.getAttribute('url')) {
      image = mediaThumbnail.getAttribute('url')!;
    } else if (enclosure?.getAttribute('url') && enclosure.getAttribute('type')?.includes('image')) {
      image = enclosure.getAttribute('url')!;
    } else {
      // Check for <img> in description
      const descHtml = item.querySelector('description')?.textContent || '';
      const imgMatch = descHtml.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch && imgMatch[1]?.startsWith('http')) {
        image = imgMatch[1];
      }
    }

    // Extract video link
    let videoUrl: string | undefined;
    if (enclosure?.getAttribute('url')) {
      const encUrl = enclosure.getAttribute('url')!;
      const encType = enclosure.getAttribute('type') || '';
      if (encType.includes('video') || /\.(mp4|webm|m3u8)(\?|$)/i.test(encUrl) || /youtube\.com|youtu\.be|vimeo\.com/i.test(encUrl)) {
        videoUrl = encUrl;
      }
    }

    if (!videoUrl && link) {
      if (/youtube\.com\/(?:watch\?|embed\/|shorts\/)|youtu\.be\/|vimeo\.com/i.test(link)) {
        videoUrl = link;
      }
    }

    const idKey = subSector ? `${category}-${subSector}` : category;
    const id = generateStoryId(idKey, rawTitle);

    results.push({
      id,
      category,
      subSector,
      title: rawTitle,
      originalTitle: rawTitle,
      summary: desc || `Comprehensive reporting on ${rawTitle}.`,
      source,
      url: link,
      image,
      videoUrl,
      hasVideo: Boolean(videoUrl),
      date,
    });
  }

  return results;
}

export interface ClientScrapeOptions {
  targetCategory?: Category | 'ALL';
  existingTitles?: string[];
  forceRefresh?: boolean;
  onProgress?: (message: string, count: number, total: number) => void;
}

export interface ClientScrapeResult {
  success: boolean;
  count: number;
  items: NewsItem[];
  error?: string;
}

/**
 * Runs a complete, live in-browser news scrape across all sectors or a specific category.
 * - Directly fetches RSS feeds with multi-proxy fallback
 * - Extracts images and preserves video links
 * - Paraphrases the full story into rich 5-paragraph investigative reporting
 * - Publishes directly to Cloud Firestore `stories` collection
 * - Updates local storage cache for immediate live rendering
 */
export async function runClientSideScraper(options: ClientScrapeOptions = {}): Promise<ClientScrapeResult> {
  const { targetCategory = 'ALL', existingTitles = [], forceRefresh = true, onProgress } = options;
  const categoriesToScrape: Category[] =
    targetCategory === 'ALL' ? [...CATEGORIES] : [targetCategory];

  const scrapedStories: NewsItem[] = [];
  const seenTitles = new Set(existingTitles.map((t) => t.toLowerCase().trim()));
  const seenThisRun = new Set<string>();
  let progressStep = 0;
  const totalSteps =
    targetCategory === 'ALL'
      ? categoriesToScrape.length + ENTERTAINMENT_SUBSECTORS.length
      : 1;

  onProgress?.(`Initializing live scraper for ${targetCategory === 'ALL' ? 'all 10 sectors' : targetCategory}...`, 0, totalSteps);

  // 1. Scrape standard categories
  for (const cat of categoriesToScrape) {
    progressStep++;
    onProgress?.(`Scraping ${cat} wire feeds & extracting multimedia...`, progressStep, totalSteps);

    const feeds = RSS_FEEDS[cat] || RSS_FEEDS.World;
    let addedForCategory = 0;

    for (const feedUrl of feeds) {
      try {
        const xml = await fetchRssText(feedUrl);
        const parsed = parseRssXmlToStories(xml, cat, undefined, targetCategory === 'ALL' ? 6 : 8);

        for (const item of parsed) {
          if (!item.title) continue;
          const cleanTitle = item.title.toLowerCase().trim();
          if (seenThisRun.has(cleanTitle)) continue;

          // If already existing and not forceRefresh, only skip if we already added enough fresh ones
          if (seenTitles.has(cleanTitle) && !forceRefresh && addedForCategory >= 2) {
            continue;
          }

          seenThisRun.add(cleanTitle);
          seenTitles.add(cleanTitle);

          // Enrich with comprehensive 5-paragraph paraphrasing and video link retention
          const fullStory = enrichStoryWithFullContent(item as NewsItem);
          scrapedStories.push(fullStory);
          addedForCategory++;

          // Save to Firestore
          try {
            await setDoc(doc(db, 'stories', fullStory.id), fullStory, { merge: true });
          } catch (fsErr) {
            console.warn(`[ClientScraper] Firestore sync note for ${fullStory.id}:`, fsErr);
          }

          // Save to local cache
          saveCustomStory(fullStory);

          if (addedForCategory >= (targetCategory === 'ALL' ? 3 : 5)) break;
        }

        if (addedForCategory > 0) break;
      } catch (err) {
        console.warn(`[ClientScraper] Feed notice for ${cat} (${feedUrl}):`, err);
      }
    }
  }

  // 2. If ALL or Entertainment, scrape Entertainment Hub subsectors (videos, music, movies, novels)
  if (targetCategory === 'ALL' || targetCategory === 'Entertainment') {
    for (const sub of ENTERTAINMENT_SUBSECTORS) {
      progressStep++;
      onProgress?.(`Scraping Entertainment: ${sub.toUpperCase()}...`, Math.min(progressStep, totalSteps), totalSteps);

      const feeds = ENTERTAINMENT_FEEDS[sub] || [];
      for (const feedUrl of feeds) {
        try {
          const xml = await fetchRssText(feedUrl);
          const parsed = parseRssXmlToStories(xml, 'Entertainment', sub, 3);

          for (const item of parsed) {
            if (!item.title) continue;
            const cleanTitle = item.title.toLowerCase().trim();
            if (seenThisRun.has(cleanTitle)) continue;
            seenThisRun.add(cleanTitle);
            seenTitles.add(cleanTitle);

            const fullStory = enrichStoryWithFullContent(item as NewsItem);
            scrapedStories.push(fullStory);

            try {
              await setDoc(doc(db, 'stories', fullStory.id), fullStory, { merge: true });
            } catch (fsErr) {
              console.warn(`[ClientScraper] Firestore sync note for ${fullStory.id}:`, fsErr);
            }

            saveCustomStory(fullStory);
          }
          if (parsed.length > 0) break;
        } catch (err) {
          console.warn(`[ClientScraper] Entertainment subsector feed notice for ${sub}:`, err);
        }
      }
    }
  }

  // 3. Update Firestore system/bot_status
  try {
    await setDoc(
      doc(db, 'system', 'bot_status'),
      {
        lastRunAt: new Date().toISOString(),
        totalScraped: scrapedStories.length,
        status: 'success',
        mode: 'client_live_scraper',
        targetCategory,
      },
      { merge: true }
    );
  } catch (sysErr) {
    console.warn('[ClientScraper] Note updating system/bot_status:', sysErr);
  }

  onProgress?.(`Scrape finished: ${scrapedStories.length} stories processed and published live.`, totalSteps, totalSteps);

  return {
    success: true,
    count: scrapedStories.length,
    items: scrapedStories,
  };
}
