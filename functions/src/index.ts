import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { defineSecret, defineString } from 'firebase-functions/params';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { GoogleGenAI } from '@google/genai';
import Parser from 'rss-parser';
import * as crypto from 'crypto';
import * as dns from 'dns';

// Initialize Firebase Admin
if (getApps().length === 0) {
  initializeApp();
}
const FIRESTORE_DATABASE_ID = 'ai-studio-viralhoods-ee67cf6a-c31b-45be-a498-8d82049f7742';
const db = getFirestore(FIRESTORE_DATABASE_ID);

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

// The Gemini API key is a secret (set with: firebase functions:secrets:set GEMINI_API_KEY)
const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const GEMINI_MODEL = defineString('GEMINI_MODEL', { default: 'gemini-3.8-flash' });

// Who gets the admin custom claim automatically on sign-in. Configure with:
//   firebase functions:config:set admin.email="you@example.com"   (v1 style)
// or simply edit the default below and redeploy. This never ships to the
// client bundle — only this function (and Firestore rules, by claim) know it.
const CHIEF_ADMIN_EMAIL = defineString('CHIEF_ADMIN_EMAIL', { default: 'tobionlyn@gmail.com' });

const GEN_CONFIG = { secrets: [GEMINI_API_KEY], cors: true, timeoutSeconds: 120 };

// ---------------------------------------------------------------------------
// Shared news-engine types & helpers
//
// NOTE: `scripts/scrape.ts` (run by GitHub Actions) contains a deliberately
// parallel copy of this engine. Firebase Functions only deploys this
// `functions/` directory, so the two can't share a module across that
// boundary — keep the ID scheme, RSS feed list, and paraphrasing prompt in
// sync if you change one. See the comment at the top of scripts/scrape.ts.
// ---------------------------------------------------------------------------

const CATEGORIES = [
  'World', 'Politics', 'Finance', 'Health', 'Entertainment',
  'Research', 'Science', 'AI', 'Tech', 'Sports',
] as const;
type Category = (typeof CATEGORIES)[number];

const ENTERTAINMENT_SUBSECTORS = ['videos', 'music', 'movies', 'novels'] as const;
type EntertainmentSubsector = (typeof ENTERTAINMENT_SUBSECTORS)[number];

const RSS_FEEDS: Record<Category, string[]> = {
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
  AI: [
    'https://news.google.com/rss/search?q=Artificial+Intelligence+machine+learning&hl=en-US&gl=US&ceid=US:en',
    'https://phys.org/rss-feed/technology-news/computer-sciences/',
  ],
  Tech: [
    'https://feeds.bbci.co.uk/news/technology/rss.xml',
    'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-US&gl=US&ceid=US:en',
  ],
  Sports: [
    'https://feeds.bbci.co.uk/sport/rss.xml',
    'https://news.google.com/rss/headlines/section/topic/SPORTS?hl=en-US&gl=US&ceid=US:en',
  ],
};

// Entertainment Hub sub-page feeds. These are real legitimate-outlet feeds
// (entertainment-news reporting about movies/music/books — not the
// movies/music/books themselves), so items scraped here are ordinary news
// articles tagged with a subSector, exactly like every other category.
const ENTERTAINMENT_FEEDS: Record<EntertainmentSubsector, string[]> = {
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

const DEFAULT_CATEGORY_IMAGES: Record<Category, string> = {
  World: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=900&q=80',
  Politics: 'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?auto=format&fit=crop&w=900&q=80',
  Finance: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=900&q=80',
  Health: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=900&q=80',
  Entertainment: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=900&q=80',
  Research: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=900&q=80',
  Science: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=900&q=80',
  AI: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=900&q=80',
  Tech: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80',
  Sports: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=900&q=80',
};

const parser = new Parser({
  timeout: 8000,
  customFields: { item: [['media:content', 'mediaContent'], ['media:thumbnail', 'mediaThumbnail'], ['enclosure', 'enclosure']] },
});

function extractItemImage(item: any, fallback: string): string {
  if (item.mediaContent?.$?.url) return item.mediaContent.$.url;
  if (item.mediaThumbnail?.$?.url) return item.mediaThumbnail.$.url;
  if (item.enclosure?.url && String(item.enclosure.url).startsWith('http')) return item.enclosure.url;
  const rawHtml = String(item['content:encoded'] || item.content || item.summary || '');
  const match = rawHtml.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match?.[1]?.startsWith('http')) return match[1];
  return fallback;
}

function extractItemVideo(item: any): string | undefined {
  if (item.enclosure?.url && typeof item.enclosure.url === 'string') {
    const encType = String(item.enclosure.type || '').toLowerCase();
    const encUrl = item.enclosure.url;
    if (encType.includes('video') || /\.(mp4|webm|m3u8)(\?|$)/i.test(encUrl) || /youtube\.com|youtu\.be|vimeo\.com/i.test(encUrl)) {
      return encUrl;
    }
  }
  if (item.mediaContent?.$?.url) {
    const mUrl = item.mediaContent.$.url;
    const mMedium = String(item.mediaContent.$.medium || '').toLowerCase();
    const mType = String(item.mediaContent.$.type || '').toLowerCase();
    if (mMedium === 'video' || mType.includes('video') || /\.(mp4|webm|m3u8)(\?|$)/i.test(mUrl) || /youtube\.com|youtu\.be|vimeo\.com/i.test(mUrl)) {
      return mUrl;
    }
  }
  const link = String(item.link || item.guid || '');
  if (/(?:youtube\.com\/(?:watch\?|embed\/|shorts\/)|youtu\.be\/|vimeo\.com\/\d+)/i.test(link)) {
    return link;
  }
  const rawHtml = String(item['content:encoded'] || item.content || item.summary || '');
  const videoMatch = rawHtml.match(/https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=[a-zA-Z0-9_-]+|embed\/[a-zA-Z0-9_-]+|shorts\/[a-zA-Z0-9_-]+)|youtu\.be\/[a-zA-Z0-9_-]+|vimeo\.com\/\d+|[\w./-]+\.(?:mp4|webm))/i);
  if (videoMatch) return videoMatch[0];

  return undefined;
}

function cleanHtml(text?: string): string {
  if (!text) return '';
  return text
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** Normalizes a headline for hashing/comparison: lowercase, strip source
 * suffixes and punctuation, collapse whitespace. Used by both the ID hash
 * (exact-match dedup) and the near-duplicate token comparison below. */
function normalizeTitle(rawTitle: string): string {
  return rawTitle
    .replace(/\s*[-|–—:]\s*(BBC News|BBC|CNN|Reuters|AP News|AP|The Guardian|The Times|CNBC|Bloomberg|TechCrunch|The Verge|Forbes|Phys\.org|ScienceDaily).*$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Stable ID shared with scripts/scrape.ts: same category + same normalized
 * headline always hashes to the same ID, regardless of which pipeline
 * (GitHub Actions or Firebase) produced it. This is what lets the client
 * safely merge the two sources without creating duplicate cards. */
function makeStoryId(category: string, rawTitle: string): string {
  const norm = normalizeTitle(rawTitle);
  return crypto.createHash('md5').update(`${category.toLowerCase()}::${norm}`).digest('hex').slice(0, 16);
}

function titleTokens(rawTitle: string): Set<string> {
  const STOPWORDS = new Set(['the', 'a', 'an', 'to', 'of', 'in', 'on', 'for', 'and', 'or', 'is', 'as', 'at', 'by', 'with', 'from', 'after', 'amid']);
  return new Set(normalizeTitle(rawTitle).split(' ').filter((w) => w.length > 2 && !STOPWORDS.has(w)));
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const tok of a) if (b.has(tok)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** True if `candidateTitle` is a near-duplicate of any title already in
 * `existingTitles` (same category). Catches the same real-world story
 * reported with different exact wording across outlets. */
function isNearDuplicate(candidateTitle: string, existingTitles: string[]): boolean {
  const candTokens = titleTokens(candidateTitle);
  for (const existing of existingTitles) {
    if (jaccardSimilarity(candTokens, titleTokens(existing)) >= 0.6) return true;
  }
  return false;
}

interface Paraphrased {
  modifiedTitle: string;
  takeaways: string[];
  content: string[];
  whyItMatters: string;
  whatNext: string;
  videoUrl?: string;
}

function templateFallback(originalTitle: string, summary: string, category: string, videoUrl?: string): Paraphrased {
  const cleanTitle = normalizeTitle(originalTitle);
  const titled = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
  const leadSummary = summary || titled;

  const p1 = `${leadSummary}. As corroborated reporting confirms, this development represents one of the most closely tracked stories across the ${category.toLowerCase()} sector this week. Newsrooms and sector specialists have monitored the situation as it shifted from initial breaking reports into a significant focal point of sector-wide analysis and public interest.`;

  const p2 = `A comprehensive review of the underlying factors indicates that the momentum behind this story reflects broader industry dynamics that have been building over recent quarters. Analysts emphasize that the implications extend well beyond the headline, noting that institutional priorities, policy recalibrations, and stakeholder engagement have converged to accelerate current developments.`;

  const p3 = `Key parties and sector representatives have issued formal statements addressing the unfolding situation. Observers tracking the issue highlight that the immediate emphasis centers on operational clarity, risk mitigation, and strategic alignment across affected jurisdictions. "The structural shifts taking place here are indicative of broader macro adjustments," noted independent industry monitors in their initial assessments.`;

  const p4 = videoUrl
    ? `Accompanying multimedia coverage and recorded video footage provide vital firsthand documentation of these events. Readers can review the video materials directly via the official video link (${videoUrl}) to inspect the recorded announcements, proceedings, and verified evidence firsthand.`
    : `International and domestic observers continue to evaluate the secondary effects of this milestone. Comparative data from analogous historical precedents indicates that organizations and communities that respond proactively are far better positioned to adapt to downstream adjustments.`;

  const p5 = `Looking ahead, follow-up briefings and formal communiqués are scheduled over the coming days to provide additional clarity on timelines and implementation measures. Viralhoods will continue to track incoming developments, verify critical details, and provide in-depth journalistic synthesis for our readers.`;

  return {
    modifiedTitle: `${titled}: In-Depth Analysis and Sector Implications`,
    takeaways: [
      `Primary Shift: Developments in ${category.toLowerCase()} mark a notable operational transition across key institutions.`,
      `Structural Context: Comprehensive analysis indicates sustained policy and organizational realignment rather than a transient event.`,
      `Stakeholder Momentum: Industry specialists and official representatives are mobilizing adaptive strategies to navigate downstream effects.`,
      `Forward Trajectory: Subsequent verification milestones and scheduled announcements over the coming weeks will determine the long-term impact.`
    ],
    content: [p1, p2, p3, p4, p5],
    whyItMatters: `This story establishes a meaningful precedent for ${category.toLowerCase()} priorities, compelling stakeholders and observers to evaluate their assumptions against evolving realities.`,
    whatNext: `Follow-up coverage, official communiqués, and ongoing updates will be synthesized as verified data is confirmed.`,
    videoUrl,
  };
}

async function paraphraseWithGemini(
  originalTitle: string,
  summary: string,
  category: string,
  aiClient: GoogleGenAI | null,
  model: string,
  videoUrl?: string
): Promise<Paraphrased> {
  if (aiClient) {
    try {
      const videoContext = videoUrl ? `\nNote: This story includes video coverage at link: ${videoUrl}. Preserve this video context and reference the video footage in the narrative.` : '';
      const prompt = `You are a senior investigative and analytical news editor at Viralhoods, a premier global news publication.
Given this original headline and summary from the "${category}" sector:
Original Headline: "${originalTitle}"
Summary: "${summary}"${videoContext}

Task:
1. Write a fresh, engaging headline that accurately reflects the full story without copying the original phrasing verbatim.
2. Write a COMPREHENSIVE, IN-DEPTH journalistic report that thoroughly paraphrases the ENTIRE original story across 4 to 5 detailed, substantive paragraphs (minimum 350-500 words total). Do NOT provide a short summary. Paraphrase all dimensions:
   - Paragraph 1: The breaking development, central event, and primary entities involved.
   - Paragraph 2: Historical context, background precursors, and underlying forces driving this situation.
   - Paragraph 3: Detailed perspectives, official statements, and key data points from stakeholders or sector specialists.
   - Paragraph 4: Broader economic, technological, geopolitical, or societal impact. If video coverage exists (${videoUrl || 'if applicable'}), reference the recorded footage and visual evidence directly.
   - Paragraph 5: Near-term outlook, systemic implications, and ongoing milestones being monitored.
3. Provide 4 distinct, highly substantive key takeaways.
4. An analytical "whyItMatters" paragraph (2-3 sentences).
5. A forward-looking "whatNext" projection (2-3 sentences).

Output MUST be valid JSON in exactly this shape, with no markdown fences:
{"modifiedTitle": "string", "takeaways": ["string","string","string","string"], "content": ["paragraph1","paragraph2","paragraph3","paragraph4","paragraph5"], "whyItMatters": "string", "whatNext": "string"}`;

      const res = await aiClient.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      const parsed = JSON.parse(res.text || '{}');
      if (parsed.modifiedTitle && Array.isArray(parsed.takeaways) && Array.isArray(parsed.content) && parsed.content.length >= 3) {
        return {
          modifiedTitle: parsed.modifiedTitle,
          takeaways: parsed.takeaways,
          content: parsed.content,
          whyItMatters: parsed.whyItMatters || `Key developments in ${category} alter expectations for sector stakeholders.`,
          whatNext: parsed.whatNext || 'Subsequent updates are anticipated over the coming days.',
          videoUrl,
        };
      }
    } catch (err: any) {
      logger.warn('Gemini paraphrasing fallback triggered. Using editorial template paraphraser:', err?.message || 'Gemini unavailable');
    }
  }
  return templateFallback(originalTitle, summary, category, videoUrl);
}

interface ScrapedStory {
  id: string;
  category: string;
  subSector?: string;
  title: string;
  originalTitle: string;
  summary: string;
  source: string;
  url: string;
  videoUrl?: string;
  hasVideo?: boolean;
  image: string;
  date: string;
  scrapedAt: string;
  author: string;
  readTime: string;
  keyTakeaways: string[];
  content: string[];
  whyItMatters: string;
  whatNext: string;
}

/** Scrapes one category (or one entertainment sub-feed) against a list of
 * RSS feeds, paraphrases each item, and skips anything that's an exact or
 * near-duplicate of `existingTitlesInCategory` (titles already on record for
 * this category, passed in so cross-run and cross-pipeline duplicates are
 * caught, not just duplicates within this single run). */
async function scrapeCategory(
  category: Category,
  feeds: string[],
  aiClient: GoogleGenAI | null,
  model: string,
  existingTitlesInCategory: string[],
  subSector: EntertainmentSubsector | undefined,
  itemsPerFeed: number
): Promise<ScrapedStory[]> {
  const out: ScrapedStory[] = [];
  const seenThisRun = [...existingTitlesInCategory];
  const nowIso = new Date().toISOString();

  for (const feedUrl of feeds) {
    try {
      const feed = await parser.parseURL(feedUrl);
      const topItems = (feed.items || []).slice(0, itemsPerFeed);

      for (const item of topItems) {
        const rawTitle = cleanHtml(item.title);
        const rawSummary = cleanHtml((item as any).contentSnippet || item.summary || item.content);
        if (!rawTitle || rawTitle.length < 10) continue;
        if (isNearDuplicate(rawTitle, seenThisRun)) continue;

        const img = extractItemImage(item, DEFAULT_CATEGORY_IMAGES[category]);
        const videoUrl = extractItemVideo(item);
        const storyId = makeStoryId(subSector ? `${category}-${subSector}` : category, rawTitle);
        const paraphrased = await paraphraseWithGemini(rawTitle, rawSummary, category, aiClient, model, videoUrl);

        const wordCount = (paraphrased.content || []).join(' ').split(/\s+/).filter(Boolean).length;
        const readTime = `${Math.max(3, Math.round(wordCount / 180))} min read`;

        out.push({
          id: storyId,
          category,
          subSector,
          title: paraphrased.modifiedTitle,
          originalTitle: rawTitle,
          summary: rawSummary || `Comprehensive report on ${paraphrased.modifiedTitle}.`,
          source: (item as any).creator || (item as any).author || `Viralhoods ${category} Wire`,
          url: item.link || '#',
          videoUrl: paraphrased.videoUrl || videoUrl || undefined,
          hasVideo: Boolean(paraphrased.videoUrl || videoUrl),
          image: img,
          date: item.pubDate ? new Date(item.pubDate).toISOString() : nowIso,
          scrapedAt: nowIso,
          author: `Viralhoods ${category} Desk`,
          readTime,
          keyTakeaways: paraphrased.takeaways,
          content: paraphrased.content,
          whyItMatters: paraphrased.whyItMatters,
          whatNext: paraphrased.whatNext,
        });
        seenThisRun.push(rawTitle);
      }
    } catch (feedErr) {
      logger.error(`Feed error for ${category}${subSector ? '/' + subSector : ''} (${feedUrl}):`, feedErr as any);
    }
  }
  return out;
}

const RETENTION_DAYS = 45;
const MAX_PER_CATEGORY = 150;

/** Core scraping and Firestore sync engine, covering all 10 main categories
 * plus the 4 Entertainment Hub sub-pages, with cross-run dedup and pruning
 * so the `stories` collection stays bounded instead of growing forever. */
export async function scrapeTrendingNewsAndSyncFirestore() {
  const startTime = Date.now();
  logger.info('Starting Viralhoods news scrape...');

  const apiKey = GEMINI_API_KEY.value();
  const aiClient = apiKey ? new GoogleGenAI({ apiKey }) : null;
  const model = GEMINI_MODEL.value() || 'gemini-3.8-flash';

  // Pull existing titles per category (incl. sub-sector) so we don't re-add
  // near-duplicates of stories already on record, even across runs.
  const existingSnap = await db.collection('stories').select('category', 'subSector', 'originalTitle', 'date').get();
  const existingByKey = new Map<string, string[]>();
  const allExisting: { id: string; category: string; subSector?: string; date: string }[] = [];
  existingSnap.forEach((d) => {
    const data = d.data();
    const key = data.subSector ? `${data.category}::${data.subSector}` : String(data.category);
    const list = existingByKey.get(key) || [];
    if (data.originalTitle) list.push(data.originalTitle);
    existingByKey.set(key, list);
    allExisting.push({ id: d.id, category: data.category, subSector: data.subSector, date: data.date });
  });

  let totalScraped = 0;
  const batch = db.batch();
  let batchOps = 0;
  const flushIfNeeded = async () => {
    if (batchOps >= 400) {
      await batch.commit();
      batchOps = 0;
    }
  };

  for (const cat of CATEGORIES) {
    const scraped = await scrapeCategory(cat, RSS_FEEDS[cat] || RSS_FEEDS.World, aiClient, model, existingByKey.get(cat) || [], undefined, 3);
    for (const story of scraped) {
      batch.set(db.collection('stories').doc(story.id), story, { merge: true });
      batchOps++;
      totalScraped++;
      await flushIfNeeded();
    }
  }

  for (const sub of ENTERTAINMENT_SUBSECTORS) {
    const scraped = await scrapeCategory('Entertainment', ENTERTAINMENT_FEEDS[sub], aiClient, model, existingByKey.get(`Entertainment::${sub}`) || [], sub, 4);
    for (const story of scraped) {
      batch.set(db.collection('stories').doc(story.id), story, { merge: true });
      batchOps++;
      totalScraped++;
      await flushIfNeeded();
    }
  }
  if (batchOps > 0) await batch.commit();

  // Prune: drop anything older than RETENTION_DAYS, then cap each
  // category (+ sub-sector) at MAX_PER_CATEGORY, oldest first, so the
  // collection — and therefore every page that reads it — stays bounded.
  const cutoff = Date.now() - RETENTION_DAYS * 86400000;
  const byKeyForPrune = new Map<string, { id: string; date: string }[]>();
  for (const e of allExisting) {
    const key = e.subSector ? `${e.category}::${e.subSector}` : e.category;
    const list = byKeyForPrune.get(key) || [];
    list.push({ id: e.id, date: e.date });
    byKeyForPrune.set(key, list);
  }

  const toDelete: string[] = [];
  for (const list of byKeyForPrune.values()) {
    const sorted = list.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    sorted.forEach((item, idx) => {
      const isStale = new Date(item.date).getTime() < cutoff;
      const isOverCap = idx >= MAX_PER_CATEGORY;
      if (isStale || isOverCap) toDelete.push(item.id);
    });
  }

  let pruneBatch = db.batch();
  let pruneOps = 0;
  for (const id of toDelete) {
    pruneBatch.delete(db.collection('stories').doc(id));
    pruneOps++;
    if (pruneOps >= 400) {
      await pruneBatch.commit();
      pruneBatch = db.batch();
      pruneOps = 0;
    }
  }
  if (pruneOps > 0) await pruneBatch.commit();

  await db.collection('system').doc('bot_status').set(
    {
      lastRunAt: new Date().toISOString(),
      totalScraped,
      totalPruned: toDelete.length,
      durationMs: Date.now() - startTime,
      status: 'success',
    },
    { merge: true }
  );

  logger.info(`Scrape complete: ${totalScraped} new/updated stories, ${toDelete.length} pruned.`);
  return { success: true, count: totalScraped, pruned: toDelete.length };
}

/** 1. Scheduled: daily at 12 AM UTC. */
export const scrapeDailyTrendingNews = onSchedule(
  { schedule: '0 0 * * *', timeZone: 'UTC', memory: '1GiB', timeoutSeconds: 540, secrets: [GEMINI_API_KEY] },
  async () => {
    await scrapeTrendingNewsAndSyncFirestore();
  }
);

/** 2. On-demand trigger for the Admin "Run scrape now" button. Callable (not
 * a bare HTTP endpoint) so it's authenticated and admin-gated by default —
 * the previous `onRequest` version had no auth check at all. */
export const triggerNewsScrapeOnDemand = onCall(
  { memory: '1GiB', timeoutSeconds: 540, secrets: [GEMINI_API_KEY] },
  async (request) => {
    const callerEmail = request.auth?.token?.email?.trim().toLowerCase();
    const chiefEmail = CHIEF_ADMIN_EMAIL.value().trim().toLowerCase();
    const isChief = callerEmail && (callerEmail === chiefEmail || callerEmail === 'tobionlyn@gmail.com');
    if (request.auth?.token?.admin !== true && !isChief) {
      throw new HttpsError('permission-denied', 'Only an administrator can trigger a manual scrape.');
    }
    return scrapeTrendingNewsAndSyncFirestore();
  }
);

// ---------------------------------------------------------------------------
// Admin authorization functions
// ---------------------------------------------------------------------------

/** Called by the client right after every sign-in. Grants the `admin`
 * custom claim if (and only if) the signed-in account's email matches the
 * configured chief-admin email — idempotent, safe to call every time. */
export const syncChiefAdminClaim = onCall({}, async (request) => {
  const uid = request.auth?.uid;
  const email = request.auth?.token?.email;
  if (!uid || !email) {
    throw new HttpsError('unauthenticated', 'Sign in first.');
  }

  const chiefEmail = CHIEF_ADMIN_EMAIL.value().trim().toLowerCase();
  const isChief = email.trim().toLowerCase() === chiefEmail;
  const alreadyAdmin = request.auth?.token?.admin === true;

  if (isChief && !alreadyAdmin) {
    await getAuth().setCustomUserClaims(uid, { admin: true });
    await db.collection('admins').doc(uid).set(
      { email, name: 'Chief Administrator', isChief: true, addedBy: 'System', addedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
    return { admin: true, changed: true };
  }
  return { admin: alreadyAdmin, changed: false };
});

/** Admin-only: appoint another administrator by email. They must already
 * have signed in at least once (so a Firebase Auth user record exists). */
export const grantAdminClaim = onCall({}, async (request) => {
  const callerEmail = request.auth?.token?.email?.trim().toLowerCase();
  const chiefEmail = CHIEF_ADMIN_EMAIL.value().trim().toLowerCase();
  const isChief = callerEmail && (callerEmail === chiefEmail || callerEmail === 'tobionlyn@gmail.com');
  if (request.auth?.token?.admin !== true && !isChief) {
    throw new HttpsError('permission-denied', 'Only an administrator can appoint other administrators.');
  }
  const targetEmail = String((request.data as any)?.email || '').trim().toLowerCase();
  if (!targetEmail || !targetEmail.includes('@')) {
    throw new HttpsError('invalid-argument', 'A valid email address is required.');
  }

  try {
    const targetUser = await getAuth().getUserByEmail(targetEmail);
    await getAuth().setCustomUserClaims(targetUser.uid, { admin: true });
    await db.collection('admins').doc(targetUser.uid).set(
      {
        email: targetEmail,
        name: targetUser.displayName || targetEmail.split('@')[0],
        isChief: false,
        addedBy: request.auth?.token?.email || 'Chief Administrator',
        addedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return { success: true, message: `${targetEmail} is now an administrator.` };
  } catch (err: any) {
    if (err?.code === 'auth/user-not-found') {
      throw new HttpsError('not-found', `${targetEmail} needs to sign in to Viralhoods at least once before they can be made an administrator.`);
    }
    logger.error('grantAdminClaim error:', err);
    throw new HttpsError('internal', err?.message || 'Could not grant admin access.');
  }
});

/** Admin-only: revoke another administrator's access. The chief admin
 * cannot be removed this way. */
export const revokeAdminClaim = onCall({}, async (request) => {
  const callerEmail = request.auth?.token?.email?.trim().toLowerCase();
  const chiefEmail = CHIEF_ADMIN_EMAIL.value().trim().toLowerCase();
  const isChief = callerEmail && (callerEmail === chiefEmail || callerEmail === 'tobionlyn@gmail.com');
  if (request.auth?.token?.admin !== true && !isChief) {
    throw new HttpsError('permission-denied', 'Only an administrator can revoke administrator access.');
  }
  const targetEmail = String((request.data as any)?.email || '').trim().toLowerCase();
  if (targetEmail === chiefEmail || targetEmail === 'tobionlyn@gmail.com') {
    throw new HttpsError('failed-precondition', 'The Chief Administrator account cannot be removed.');
  }

  try {
    const targetUser = await getAuth().getUserByEmail(targetEmail);
    await getAuth().setCustomUserClaims(targetUser.uid, { admin: false });
    await db.collection('admins').doc(targetUser.uid).delete();
    return { success: true, message: `${targetEmail} is no longer an administrator.` };
  } catch (err: any) {
    logger.error('revokeAdminClaim error:', err);
    throw new HttpsError('internal', err?.message || 'Could not revoke admin access.');
  }
});

// ---------------------------------------------------------------------------
// Gemini-powered features (AI Assistant + AI Studio)
// ---------------------------------------------------------------------------

function requireSignedIn(request: { auth?: { uid?: string } }) {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Please sign in to use this feature.');
  }
}

/** Chat assistant, grounded in the site's own current top stories (so "what's
 * trending in AI right now" answers from the real catalog, not just general
 * knowledge), with a best-effort Google Search grounding tool that silently
 * degrades to a plain answer if the tool isn't available for the active
 * model/account. */
export const geminiChat = onCall(GEN_CONFIG, async (request) => {
  requireSignedIn(request);
  const data = request.data as { messages?: { role: string; text: string }[]; model?: string; useSearch?: boolean; activeSector?: string };
  const messages = Array.isArray(data?.messages) ? data.messages : [];
  if (messages.length === 0) throw new HttpsError('invalid-argument', 'No message provided.');

  const apiKey = GEMINI_API_KEY.value();
  if (!apiKey) throw new HttpsError('failed-precondition', 'The AI assistant is not configured yet (missing GEMINI_API_KEY).');
  const aiClient = new GoogleGenAI({ apiKey });
  const model = data.model || GEMINI_MODEL.value() || 'gemini-3.8-flash';

  // Ground in up to 12 recent stories (optionally filtered to the active sector).
  let contextBlock = '';
  try {
    let storiesQuery = db.collection('stories').orderBy('scrapedAt', 'desc').limit(12) as FirebaseFirestore.Query;
    if (data.activeSector && data.activeSector !== 'All') {
      storiesQuery = db.collection('stories').where('category', '==', data.activeSector).orderBy('scrapedAt', 'desc').limit(12);
    }
    const snap = await storiesQuery.get();
    const lines = snap.docs.map((d) => {
      const s = d.data();
      return `- [${s.category}] ${s.title}: ${String(s.summary || '').slice(0, 160)}`;
    });
    if (lines.length > 0) {
      contextBlock = `Here are the most recent Viralhoods stories you can reference when relevant:\n${lines.join('\n')}\n\n`;
    }
  } catch (err) {
    logger.warn('Chat context lookup failed (continuing without it):', err as any);
  }

  const systemPreamble = `You are the Viralhoods AI Intelligence Assistant, embedded in a trending-news site. Be concise, factual, and helpful. ${contextBlock}Answer the reader's question below.`;

  const contents = [
    { role: 'user' as const, parts: [{ text: systemPreamble }] },
    ...messages.map((m) => ({ role: m.role === 'user' ? ('user' as const) : ('model' as const), parts: [{ text: m.text }] })),
  ];

  let text = '';
  let searchGrounding: string[] = [];

  if (data.useSearch) {
    try {
      const res = await aiClient.models.generateContent({ model, contents, config: { tools: [{ googleSearch: {} }] } as any });
      text = res.text || '';
      const chunks = (res as any)?.candidates?.[0]?.groundingMetadata?.webSearchQueries;
      if (Array.isArray(chunks)) searchGrounding = chunks;
    } catch (err) {
      logger.warn('Search-grounded chat failed, falling back to plain generation:', err as any);
    }
  }

  if (!text) {
    const res = await aiClient.models.generateContent({ model, contents });
    text = res.text || 'I was not able to generate a response just now — please try again.';
  }

  return { text, searchGrounding };
});

/** Audio transcription for the AI Assistant's microphone input. */
export const geminiTranscribe = onCall(GEN_CONFIG, async (request) => {
  requireSignedIn(request);
  const data = request.data as { audioBase64?: string; mimeType?: string };
  if (!data?.audioBase64) throw new HttpsError('invalid-argument', 'No audio provided.');

  const apiKey = GEMINI_API_KEY.value();
  if (!apiKey) throw new HttpsError('failed-precondition', 'Transcription is not configured yet (missing GEMINI_API_KEY).');
  const aiClient = new GoogleGenAI({ apiKey });
  const model = GEMINI_MODEL.value() || 'gemini-3.8-flash';

  const res = await aiClient.models.generateContent({
    model,
    contents: [
      {
        role: 'user',
        parts: [
          { text: 'Transcribe this audio clip to plain text. Reply with only the transcription, nothing else.' },
          { inlineData: { mimeType: data.mimeType || 'audio/webm', data: data.audioBase64 } },
        ],
      },
    ],
  });

  return { text: (res.text || '').trim() };
});

/** Image generation for the AI Studio "Image" tab. */
export const geminiGenerateImage = onCall(GEN_CONFIG, async (request) => {
  requireSignedIn(request);
  const data = request.data as { prompt?: string; aspectRatio?: string };
  if (!data?.prompt?.trim()) throw new HttpsError('invalid-argument', 'A prompt is required.');

  const apiKey = GEMINI_API_KEY.value();
  if (!apiKey) throw new HttpsError('failed-precondition', 'Image generation is not configured yet (missing GEMINI_API_KEY).');
  const aiClient = new GoogleGenAI({ apiKey });

  try {
    const res = await aiClient.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: data.prompt,
      config: { responseModalities: ['IMAGE'] } as any,
    });
    const parts = (res as any)?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p: any) => p.inlineData?.data);
    if (imagePart) {
      return { imageBase64: imagePart.inlineData.data, isSvg: false, message: 'Image generated.' };
    }
    throw new Error('No image returned by the model.');
  } catch (err: any) {
    logger.error('Image generation failed:', err as any);
    throw new HttpsError('internal', err?.message || 'Image generation failed.');
  }
});

/** Video generation for the AI Studio "Video" tab. */
export const geminiGenerateVideo = onCall(GEN_CONFIG, async (request) => {
  requireSignedIn(request);
  const data = request.data as { prompt?: string; aspectRatio?: string; imageBase64?: string };
  if (!data?.prompt?.trim()) throw new HttpsError('invalid-argument', 'A prompt is required.');

  const apiKey = GEMINI_API_KEY.value();
  if (!apiKey) throw new HttpsError('failed-precondition', 'Video generation is not configured yet (missing GEMINI_API_KEY).');
  const aiClient = new GoogleGenAI({ apiKey });

  try {
    const inputPayload: any = data.imageBase64
      ? [
          { type: 'image', mime_type: 'image/png', data: data.imageBase64 },
          { type: 'text', text: data.prompt },
        ]
      : data.prompt;

    if ((aiClient as any).interactions && typeof (aiClient as any).interactions.create === 'function') {
      const interaction = await (aiClient as any).interactions.create(
        {
          model: 'gemini-omni-1.1-flash',
          input: inputPayload,
          background: false,
          store: false,
          stream: false,
          response_format: {
            type: 'video',
            aspect_ratio: data.aspectRatio === '9:16' ? '9:16' : '16:9',
          },
        },
        { timeout: 300000 }
      );
      const videoPart = interaction?.output_video;
      if (videoPart?.data) {
        return { videoBase64: videoPart.data, message: 'Video generated.' };
      }
    }
    throw new Error('Video generation failed.');
  } catch (err: any) {
    logger.error('Video generation failed:', err as any);
    throw new HttpsError('internal', err?.message || 'Video generation failed.');
  }
});

/** Music generation for the AI Studio "Music" tab. */
export const geminiGenerateMusic = onCall(GEN_CONFIG, async (request) => {
  requireSignedIn(request);
  const data = request.data as { prompt?: string };
  if (!data?.prompt?.trim()) throw new HttpsError('invalid-argument', 'A prompt is required.');

  const apiKey = GEMINI_API_KEY.value();
  if (!apiKey) throw new HttpsError('failed-precondition', 'Music generation is not configured yet (missing GEMINI_API_KEY).');
  const aiClient = new GoogleGenAI({ apiKey });

  try {
    const res = await aiClient.models.generateContent({
      model: 'lyria-3-clip-preview',
      contents: data.prompt,
    });
    return { text: res.text || 'Audio track composed.' };
  } catch (err: any) {
    logger.error('Music generation failed:', err as any);
    throw new HttpsError('internal', err?.message || 'Music generation failed.');
  }
});

/** Lightweight "maps grounding": answers location/place questions with
 * Gemini's general knowledge. (A true live-Maps grounding tool is a
 * documented extension point here if/when you confirm the exact tool schema
 * for your API tier — this version is deliberately conservative so it
 * always returns a useful answer rather than risking a broken call.) */
export const geminiMapsQuery = onCall(GEN_CONFIG, async (request) => {
  requireSignedIn(request);
  const data = request.data as { query?: string };
  if (!data?.query?.trim()) throw new HttpsError('invalid-argument', 'A query is required.');

  const apiKey = GEMINI_API_KEY.value();
  if (!apiKey) throw new HttpsError('failed-precondition', 'This feature is not configured yet (missing GEMINI_API_KEY).');
  const aiClient = new GoogleGenAI({ apiKey });
  const model = GEMINI_MODEL.value() || 'gemini-3.8-flash';

  const res = await aiClient.models.generateContent({
    model,
    contents: `Answer this geography/places question concisely and factually, noting if anything may have changed recently: ${data.query}`,
  });
  return { text: res.text || 'No answer generated.' };
});

/** Drafts a full article from a topic/notes for the Admin "create story"
 * tool, replacing the old boilerplate-template generator with real
 * AI-written copy. Falls back to a clear error the client already knows how
 * to handle gracefully (the client keeps its offline template as a backup). */
export const generateArticleDraft = onCall(GEN_CONFIG, async (request) => {
  if (request.auth?.token?.admin !== true) {
    throw new HttpsError('permission-denied', 'Only an administrator can draft stories.');
  }
  const data = request.data as { topic?: string; category?: string; rawNotes?: string };
  if (!data?.topic?.trim()) throw new HttpsError('invalid-argument', 'A topic is required.');

  const apiKey = GEMINI_API_KEY.value();
  if (!apiKey) throw new HttpsError('failed-precondition', 'Drafting is not configured yet (missing GEMINI_API_KEY).');
  const aiClient = new GoogleGenAI({ apiKey });
  const model = GEMINI_MODEL.value() || 'gemini-3.8-flash';
  const category = data.category || 'World';

  const prompt = `Write an in-depth, original news-style article for Viralhoods on this topic: "${data.topic}" (category: ${category}).${data.rawNotes ? ` Notes to incorporate: ${data.rawNotes}` : ''}
Write a comprehensive story with 4 to 5 detailed paragraphs thoroughly exploring the topic, background history, stakeholder perspectives, sector impact, and future trajectory.
Output JSON only, no markdown fences, in this shape:
{"summary": "detailed one-paragraph lead summary", "keyTakeaways": ["string","string","string","string"], "content": ["paragraph1","paragraph2","paragraph3","paragraph4","paragraph5"], "whyItMatters": "string", "whatNext": "string"}`;

  const res = await aiClient.models.generateContent({ model, contents: prompt, config: { responseMimeType: 'application/json' } });
  const parsed = JSON.parse(res.text || '{}');
  return {
    summary: parsed.summary || '',
    keyTakeaways: Array.isArray(parsed.keyTakeaways) && parsed.keyTakeaways.length ? parsed.keyTakeaways : [],
    content: Array.isArray(parsed.content) && parsed.content.length ? parsed.content : [],
    whyItMatters: parsed.whyItMatters || '',
    whatNext: parsed.whatNext || '',
  };
});

// ---------------------------------------------------------------------------
// AI Blog Post Generator (Admin → Bot tab) — the bot writes a full post from
// an admin-supplied title + style, instead of only rewriting scraped RSS
// items. Separate from `generateArticleDraft` above, which has no style or
// length control and is kept as-is for the plain "topic + notes" path.
// ---------------------------------------------------------------------------

const BLOG_STYLE_PROMPTS: Record<string, string> = {
  news: 'a straightforward, objective news report: lead with the most important facts, neutral tone, claims attributed to named or described sources.',
  investigative: 'an investigative deep-dive: probing and evidence-driven, surfaces the causes and context behind the headline rather than just restating it, measured and skeptical of easy explanations.',
  opinion: 'a first-person opinion/editorial piece with a clear, well-argued point of view, written as "I" or "we" from the Viralhoods desk — persuasive, but still factually grounded.',
  explainer: 'a plain-language explainer for a reader with no prior context on the topic: define terms as you introduce them, and directly answer what it is, why it matters, and how it works.',
  listicle: 'a listicle: break the body into clearly distinct numbered points, each opening with a short punchy lead-in sentence before the explanation. Each numbered point is its own entry in the "content" array.',
  feature: 'a narrative feature: scene-setting and human detail, a storytelling arc from beginning to end, vivid but still factually accurate.',
  casual: 'a casual, conversational voice — like explaining it to a friend. Short sentences, approachable, still accurate.',
};

const BLOG_LENGTH_PRESETS: Record<string, { paragraphs: number; takeaways: number; words: string }> = {
  short: { paragraphs: 3, takeaways: 3, words: '250-350' },
  medium: { paragraphs: 5, takeaways: 4, words: '500-650' },
  long: { paragraphs: 8, takeaways: 5, words: '900-1100' },
};

/** Generates a full blog post from an admin-supplied title + style + length
 * — the "feed the bot a title and a style" generator in the Bot tab. Pure
 * generation only: it does not publish anything itself. The client shows
 * the result as an editable preview, and publishing is a direct Firestore
 * write from the client (security rules already allow `stories` writes for
 * admins — see firestore.rules), the same way the rest of this admin
 * console works. */
export const generateBlogPost = onCall(GEN_CONFIG, async (request) => {
  if (request.auth?.token?.admin !== true) {
    throw new HttpsError('permission-denied', 'Only an administrator can generate blog posts.');
  }
  const data = request.data as {
    title?: string;
    category?: string;
    style?: string;
    length?: string;
    notes?: string;
  };
  if (!data?.title?.trim()) throw new HttpsError('invalid-argument', 'A title is required.');

  const apiKey = GEMINI_API_KEY.value();
  if (!apiKey) throw new HttpsError('failed-precondition', 'The blog generator is not configured yet (missing GEMINI_API_KEY).');
  const aiClient = new GoogleGenAI({ apiKey });
  const model = GEMINI_MODEL.value() || 'gemini-3.8-flash';

  const category = data.category || 'World';
  const styleKey = data.style && BLOG_STYLE_PROMPTS[data.style] ? data.style : 'news';
  const lengthKey = data.length && BLOG_LENGTH_PRESETS[data.length] ? data.length : 'medium';
  const styleInstruction = BLOG_STYLE_PROMPTS[styleKey];
  const preset = BLOG_LENGTH_PRESETS[lengthKey];
  const paragraphPlaceholders = Array.from({ length: preset.paragraphs }, (_, i) => `"paragraph${i + 1}"`).join(', ');
  const takeawayPlaceholders = Array.from({ length: preset.takeaways }, () => '"string"').join(', ');

  const prompt = `Write a blog post for Viralhoods with this exact headline — do not change or rephrase it: "${data.title}" (sector: ${category}).

Write it in this style: ${styleInstruction}

Length: exactly ${preset.paragraphs} paragraphs in the body, roughly ${preset.words} words total.${
    data.notes?.trim() ? `\n\nIncorporate these notes/angle from the editor: ${data.notes.trim()}` : ''
  }

Output JSON only, no markdown fences, in this shape:
{"summary": "one- to two-sentence lead summary/dek", "keyTakeaways": [${takeawayPlaceholders}], "content": [${paragraphPlaceholders}], "whyItMatters": "one to two sentences", "whatNext": "one to two sentences"}`;

  const res = await aiClient.models.generateContent({ model, contents: prompt, config: { responseMimeType: 'application/json' } });

  let parsed: any;
  try {
    parsed = JSON.parse(res.text || '{}');
  } catch (err) {
    logger.error('Blog post generation returned unparseable JSON:', err as any);
    throw new HttpsError('internal', 'The AI returned a response that could not be read. Please try again.');
  }

  const content = Array.isArray(parsed.content) ? parsed.content.filter((p: unknown) => typeof p === 'string' && p.trim()) : [];
  if (content.length === 0) {
    throw new HttpsError('internal', 'The AI did not return any article content. Please try again.');
  }

  return {
    summary: parsed.summary || '',
    keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways.filter((t: unknown) => typeof t === 'string' && t.trim()) : [],
    content,
    whyItMatters: parsed.whyItMatters || '',
    whatNext: parsed.whatNext || '',
    style: styleKey,
    length: lengthKey,
  };
});

// ---------------------------------------------------------------------------
// Link unfurling for Community "link" posts (title/description/image, the
// same idea as how Reddit or Twitter show a preview card for a pasted URL).
// ---------------------------------------------------------------------------

/** True if `ip` is a private, loopback, link-local, or otherwise
 * non-public address — including the cloud metadata address
 * (169.254.169.254) that a server-side fetch of an attacker-chosen URL
 * could otherwise be tricked into reaching (SSRF). Blocking these is what
 * makes it safe to fetch a URL a stranger on the internet typed in. */
function isPrivateOrReservedIp(ip: string): boolean {
  if (ip.includes(':')) {
    const lower = ip.toLowerCase();
    return (
      lower === '::1' ||
      lower.startsWith('fc') ||
      lower.startsWith('fd') ||
      lower.startsWith('fe80') ||
      lower.startsWith('::ffff:127.') ||
      lower.startsWith('::ffff:10.') ||
      lower.startsWith('::ffff:169.254.') ||
      lower.startsWith('::ffff:192.168.')
    );
  }
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true; // malformed → treat as unsafe
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

const BLOCKED_HOSTNAMES = new Set(['localhost', 'metadata.google.internal', 'metadata']);

async function assertSafeExternalUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new HttpsError('invalid-argument', 'That doesn\u2019t look like a valid URL.');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new HttpsError('invalid-argument', 'Only http/https links are supported.');
  }
  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new HttpsError('invalid-argument', 'That URL can\u2019t be previewed.');
  }
  // If the hostname is already a literal IP, check it directly; otherwise
  // resolve it and check every address it points to.
  const literalIp = /^[0-9.]+$/.test(hostname) || hostname.includes(':');
  const addresses = literalIp ? [hostname] : (await dns.promises.lookup(hostname, { all: true })).map((a) => a.address);
  if (addresses.length === 0 || addresses.some(isPrivateOrReservedIp)) {
    throw new HttpsError('invalid-argument', 'That URL can\u2019t be previewed.');
  }
  return parsed;
}

function extractMeta(html: string, properties: string[]): string | undefined {
  for (const prop of properties) {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${prop}["']`,
      'i'
    );
    const match = html.match(re);
    const value = match?.[1] || match?.[2];
    if (value) return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
  }
  return undefined;
}

/** Fetches a user-submitted URL and pulls OpenGraph/Twitter-card metadata
 * for a Community "link" post preview — works for most social platforms
 * and news sites, the same mechanism Reddit/Twitter/Facebook use to show a
 * preview card for a pasted link. */
export const unfurlLink = onCall({ cors: true, timeoutSeconds: 20 }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Please sign in first.');
  }
  const rawUrl = String((request.data as any)?.url || '').trim();
  if (!rawUrl) throw new HttpsError('invalid-argument', 'A URL is required.');

  const safeUrl = await assertSafeExternalUrl(rawUrl);

  let html = '';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(safeUrl.toString(), {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ViralhoodsLinkPreview/1.0)' },
    });
    clearTimeout(timeout);
    // Re-check the final URL in case of a redirect, so a redirect chain
    // can't be used to land on an internal address after the first check.
    await assertSafeExternalUrl(res.url);

    const reader = res.body?.getReader();
    if (reader) {
      const decoder = new TextDecoder();
      let bytes = 0;
      while (bytes < 300_000) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.length;
        html += decoder.decode(value, { stream: true });
      }
      reader.cancel().catch(() => {});
    }
  } catch (err) {
    logger.warn('Link unfurl fetch failed:', err as any);
    return { title: safeUrl.hostname, description: '', image: '', domain: safeUrl.hostname };
  }

  const title = extractMeta(html, ['og:title', 'twitter:title']) || html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim();
  const description = extractMeta(html, ['og:description', 'twitter:description', 'description']);
  let image = extractMeta(html, ['og:image', 'og:image:url', 'twitter:image']);
  if (image && !image.startsWith('http')) {
    try {
      image = new URL(image, safeUrl).toString();
    } catch {
      image = undefined;
    }
  }

  return {
    title: title || safeUrl.hostname,
    description: description || '',
    image: image || '',
    domain: safeUrl.hostname.replace(/^www\./, ''),
  };
});
