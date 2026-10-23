// ---------------------------------------------------------------------------
// GitHub Actions news scraper. Writes to the static JSON files served by the
// GitHub Pages deployment (data/news.json, public/data/news.json, etc).
//
// NOTE: `functions/src/index.ts` (the Firebase path) contains a deliberately
// parallel copy of this engine, writing to Firestore instead of JSON files.
// Firebase Functions only deploys the `functions/` directory, so the two
// can't share a module across that boundary — keep the ID scheme, RSS feed
// list, and paraphrasing prompt in sync if you change one here.
// ---------------------------------------------------------------------------

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Parser from 'rss-parser';
import { GoogleGenAI } from '@google/genai';

const rssParser = new Parser({
  timeout: 8000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 ViralhoodsBot/2.4',
    Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
  },
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['media:group', 'mediaGroup'],
      ['enclosure', 'enclosure'],
    ],
  },
});

const BOT_CATEGORIES = [
  'World', 'Politics', 'Finance', 'Health', 'Entertainment',
  'Research', 'Science', 'AI', 'Tech', 'Sports',
] as const;
type BotCategory = (typeof BOT_CATEGORIES)[number];

const ENTERTAINMENT_SUBSECTORS = ['videos', 'music', 'movies', 'novels'] as const;
type EntertainmentSubsector = (typeof ENTERTAINMENT_SUBSECTORS)[number];

const RSS_FEEDS: Record<BotCategory, string[]> = {
  World: [
    'https://feeds.bbci.co.uk/news/world/rss.xml',
    'https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-US&gl=US&ceid=US:en',
    'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
  ],
  Politics: [
    'https://feeds.bbci.co.uk/news/politics/rss.xml',
    'https://news.google.com/rss/search?q=politics+legislation+policy&hl=en-US&gl=US&ceid=US:en',
    'https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml',
  ],
  Finance: [
    'https://feeds.bbci.co.uk/news/business/rss.xml',
    'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en',
    'https://rss.nytimes.com/services/xml/rss/nyt/Economy.xml',
  ],
  Health: [
    'https://feeds.bbci.co.uk/news/health/rss.xml',
    'https://news.google.com/rss/headlines/section/topic/HEALTH?hl=en-US&gl=US&ceid=US:en',
    'https://rss.nytimes.com/services/xml/rss/nyt/Health.xml',
  ],
  Entertainment: [
    'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml',
    'https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=en-US&gl=US&ceid=US:en',
    'https://rss.nytimes.com/services/xml/rss/nyt/Movies.xml',
  ],
  Research: [
    'https://news.google.com/rss/search?q=scientific+research+breakthrough&hl=en-US&gl=US&ceid=US:en',
    'https://phys.org/rss-feed/',
    'https://www.sciencedaily.com/rss/top/science.xml',
  ],
  Science: [
    'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml',
    'https://news.google.com/rss/headlines/section/topic/SCIENCE?hl=en-US&gl=US&ceid=US:en',
    'https://rss.nytimes.com/services/xml/rss/nyt/Science.xml',
  ],
  AI: [
    'https://news.google.com/rss/search?q=Artificial+Intelligence+machine+learning&hl=en-US&gl=US&ceid=US:en',
    'https://phys.org/rss-feed/technology-news/computer-sciences/',
    'https://news.google.com/rss/search?q=LLM+neural+network+AI&hl=en-US&gl=US&ceid=US:en',
  ],
  Tech: [
    'https://feeds.bbci.co.uk/news/technology/rss.xml',
    'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-US&gl=US&ceid=US:en',
    'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml',
  ],
  Sports: [
    'https://feeds.bbci.co.uk/sport/rss.xml',
    'https://news.google.com/rss/headlines/section/topic/SPORTS?hl=en-US&gl=US&ceid=US:en',
    'https://rss.nytimes.com/services/xml/rss/nyt/Sports.xml',
  ],
};

// Legitimate entertainment-news feeds (reporting ABOUT movies/music/books —
// not sources of the movies/music/books themselves) that populate the
// Entertainment Hub's sub-pages, which previously never received bot content.
const ENTERTAINMENT_FEEDS: Record<EntertainmentSubsector, string[]> = {
  videos: ['https://news.google.com/rss/search?q=viral+video+OR+youtube+trending&hl=en-US&gl=US&ceid=US:en'],
  music: ['https://news.google.com/rss/search?q=new+music+release+OR+album+chart&hl=en-US&gl=US&ceid=US:en'],
  movies: ['https://news.google.com/rss/search?q=movie+trailer+OR+box+office+OR+film+review&hl=en-US&gl=US&ceid=US:en'],
  novels: ['https://news.google.com/rss/search?q=new+book+release+OR+bestseller+novel&hl=en-US&gl=US&ceid=US:en'],
};

const CURATED_CATEGORY_IMAGES: Record<BotCategory, string[]> = {
  World: [
    'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=1200&q=80',
  ],
  Politics: [
    'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
  ],
  Finance: [
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=1200&q=80',
  ],
  Health: [
    'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80',
  ],
  Entertainment: [
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80',
  ],
  Research: [
    'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1200&q=80',
  ],
  Science: [
    'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
  ],
  AI: [
    'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80',
  ],
  Tech: [
    'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1558441719-74e50882ef10?auto=format&fit=crop&w=1200&q=80',
  ],
  Sports: [
    'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1200&q=80',
  ],
};

function getCategoryFallbackImage(category: BotCategory, titleSeed: string): string {
  const images = CURATED_CATEGORY_IMAGES[category] || CURATED_CATEGORY_IMAGES.World;
  let hash = 0;
  for (let i = 0; i < titleSeed.length; i++) {
    hash = (hash << 5) - hash + titleSeed.charCodeAt(i);
    hash |= 0;
  }
  return images[Math.abs(hash) % images.length];
}

function extractRssImage(item: any, category: BotCategory, title: string): string {
  if (item.mediaContent?.$?.url) return item.mediaContent.$.url;
  if (item.mediaThumbnail?.$?.url) return item.mediaThumbnail.$.url;
  if (item.mediaGroup?.['media:content']?.[0]?.$?.url) return item.mediaGroup['media:content'][0].$.url;
  if (item.enclosure?.url && typeof item.enclosure.url === 'string' && item.enclosure.url.startsWith('http')) {
    return item.enclosure.url;
  }
  const rawHtml = (item['content:encoded'] || item.content || item.summary || '') as string;
  const match = rawHtml.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match && match[1] && match[1].startsWith('http')) return match[1];
  return getCategoryFallbackImage(category, title);
}

function extractRssVideo(item: any): string | undefined {
  // Check enclosure
  if (item.enclosure?.url && typeof item.enclosure.url === 'string') {
    const encType = String(item.enclosure.type || '').toLowerCase();
    const encUrl = item.enclosure.url;
    if (encType.includes('video') || /\.(mp4|webm|m3u8)(\?|$)/i.test(encUrl) || /youtube\.com|youtu\.be|vimeo\.com/i.test(encUrl)) {
      return encUrl;
    }
  }
  // Check mediaContent
  if (item.mediaContent?.$?.url) {
    const mUrl = item.mediaContent.$.url;
    const mMedium = String(item.mediaContent.$.medium || '').toLowerCase();
    const mType = String(item.mediaContent.$.type || '').toLowerCase();
    if (mMedium === 'video' || mType.includes('video') || /\.(mp4|webm|m3u8)(\?|$)/i.test(mUrl) || /youtube\.com|youtu\.be|vimeo\.com/i.test(mUrl)) {
      return mUrl;
    }
  }
  // Check mediaGroup
  const groupContent = item.mediaGroup?.['media:content'];
  if (Array.isArray(groupContent)) {
    for (const g of groupContent) {
      if (g?.$?.url && (g.$.medium === 'video' || String(g.$.type || '').includes('video') || /youtube\.com|youtu\.be/i.test(g.$.url))) {
        return g.$.url;
      }
    }
  }
  // Check link or guid for video platform URLs
  const link = String(item.link || item.guid || '');
  if (/(?:youtube\.com\/(?:watch\?|embed\/|shorts\/)|youtu\.be\/|vimeo\.com\/\d+)/i.test(link)) {
    return link;
  }
  // Check encoded content or description for video embeds / URLs
  const rawHtml = String(item['content:encoded'] || item.content || item.summary || '');
  const videoMatch = rawHtml.match(/https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=[a-zA-Z0-9_-]+|embed\/[a-zA-Z0-9_-]+|shorts\/[a-zA-Z0-9_-]+)|youtu\.be\/[a-zA-Z0-9_-]+|vimeo\.com\/\d+|[\w./-]+\.(?:mp4|webm))/i);
  if (videoMatch) return videoMatch[0];

  return undefined;
}

function cleanRssHtml(text?: string): string {
  if (!text) return '';
  return text
    .replace(/<!\[CDATA\[(.*?)\]\]>/gis, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Normalizes a headline for hashing/comparison — see the matching comment
 * in functions/src/index.ts. Must stay identical between the two files. */
function normalizeTitle(rawTitle: string): string {
  return rawTitle
    .replace(/\s*[-|–—:]\s*(BBC News|BBC|CNN|Reuters|AP News|AP|The Guardian|The Times|CNBC|Bloomberg|TechCrunch|The Verge|Forbes|Phys\.org|ScienceDaily).*$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Stable ID shared with functions/src/index.ts — same category + same
 * normalized headline always hashes the same, so the GitHub Actions and
 * Firebase pipelines never produce two different IDs for one real story. */
function makeStoryId(categoryKey: string, rawTitle: string): string {
  const norm = normalizeTitle(rawTitle);
  return crypto.createHash('md5').update(`${categoryKey.toLowerCase()}::${norm}`).digest('hex').slice(0, 16);
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

function templateFallback(originalTitle: string, summary: string, category: BotCategory, videoUrl?: string): Paraphrased {
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

let geminiAvailable = true;
let geminiWarningLogged = false;

async function paraphraseWithGemini(
  originalTitle: string,
  summary: string,
  category: BotCategory,
  aiClient: GoogleGenAI | null,
  model: string,
  videoUrl?: string
): Promise<Paraphrased> {
  if (aiClient && geminiAvailable) {
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
          whyItMatters: parsed.whyItMatters || `Key developments in ${category} alter expectations for sector stakeholders worldwide.`,
          whatNext: parsed.whatNext || 'Subsequent updates and official briefings are anticipated over the coming days.',
          videoUrl,
        };
      }
    } catch (feedErr: any) {
      const errMsg = feedErr?.message || String(feedErr);
      const isAuthOrQuota =
        errMsg.includes('API key not valid') ||
        errMsg.includes('API_KEY_INVALID') ||
        errMsg.includes('UNAUTHENTICATED') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('quota');

      if (isAuthOrQuota) {
        geminiAvailable = false;
        if (!geminiWarningLogged) {
          geminiWarningLogged = true;
          console.warn('[NOTICE] Gemini API key is not valid or quota exceeded. Switching smoothly to editorial template paraphraser for remaining items.');
        }
      } else if (!geminiWarningLogged) {
        geminiWarningLogged = true;
        console.warn('[NOTICE] Gemini paraphrasing fallback triggered. Using editorial template paraphraser.');
      }
    }
  }
  return templateFallback(originalTitle, summary, category, videoUrl);
}

async function scrapeOneFeedSet(
  category: BotCategory,
  feeds: string[],
  aiClient: GoogleGenAI | null,
  model: string,
  existingTitles: string[],
  subSector: EntertainmentSubsector | undefined,
  itemsPerFeed: number
): Promise<any[]> {
  const out: any[] = [];
  const seenThisRun = [...existingTitles];
  const nowIso = new Date().toISOString();
  const idKey = subSector ? `${category}-${subSector}` : category;

  for (const feedUrl of feeds) {
    try {
      const feed = await rssParser.parseURL(feedUrl);
      const topItems = (feed.items || []).slice(0, itemsPerFeed);

      for (const item of topItems) {
        const rawTitle = cleanRssHtml(item.title);
        const rawSummary = cleanRssHtml(item.contentSnippet || item.summary || item.content);
        if (!rawTitle || rawTitle.length < 10) continue;
        if (isNearDuplicate(rawTitle, seenThisRun)) continue;

        const img = extractRssImage(item, category, rawTitle);
        const videoUrl = extractRssVideo(item);
        const storyId = makeStoryId(idKey, rawTitle);
        const paraphrased = await paraphraseWithGemini(rawTitle, rawSummary, category, aiClient, model, videoUrl);

        const wordCount = (paraphrased.content || []).join(' ').split(/\s+/).filter(Boolean).length;
        const readTime = `${Math.max(3, Math.round(wordCount / 180))} min read`;

        out.push({
          id: storyId,
          category,
          subSector,
          title: paraphrased.modifiedTitle,
          originalTitle: rawTitle,
          summary: rawSummary || `Comprehensive reporting on ${paraphrased.modifiedTitle}.`,
          source: item.creator || (item as any).author || `Viralhoods ${category} Wire`,
          url: item.link || '#',
          videoUrl: paraphrased.videoUrl || videoUrl || undefined,
          hasVideo: Boolean(paraphrased.videoUrl || videoUrl),
          image: img,
          date: item.pubDate ? new Date(item.pubDate).toISOString() : nowIso,
          author: `Viralhoods ${category} Desk`,
          readTime,
          keyTakeaways: paraphrased.takeaways,
          content: paraphrased.content,
          whyItMatters: paraphrased.whyItMatters,
          whatNext: paraphrased.whatNext,
        });
        seenThisRun.push(rawTitle);
      }
      console.log(`[OK] Scraped ${idKey} from ${feedUrl} (${out.length} so far)`);
    } catch (feedErr: any) {
      console.warn(`[WARN] Feed failed for ${idKey} (${feedUrl}):`, feedErr?.message || feedErr);
    }
  }
  return out;
}

const RETENTION_DAYS = 45;
const MAX_PER_CATEGORY = 150;

/** Drops near-duplicates against already-kept items, then enforces the
 * retention window and per-category cap, newest first. This is what keeps
 * data/news.json from growing forever and also doubles as the "delete
 * duplicated content" cleanup for whatever is already in the file. */
function dedupeAndPrune(items: any[]): any[] {
  const byKey = new Map<string, any[]>();
  for (const item of items) {
    const key = item.subSector ? `${item.category}::${item.subSector}` : String(item.category);
    const list = byKey.get(key) || [];
    list.push(item);
    byKey.set(key, list);
  }

  const cutoff = Date.now() - RETENTION_DAYS * 86400000;
  const kept: any[] = [];

  for (const list of byKey.values()) {
    const sorted = list.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const keptTitlesForKey: string[] = [];
    for (const item of sorted) {
      if (keptTitlesForKey.length >= MAX_PER_CATEGORY) break;
      if (new Date(item.date).getTime() < cutoff) continue;
      if (isNearDuplicate(item.originalTitle || item.title, keptTitlesForKey)) continue;
      keptTitlesForKey.push(item.originalTitle || item.title);
      kept.push(item);
    }
  }
  return kept;
}

export async function runScraper() {
  console.log('Running automated news scrape across all 10 sectors + 4 Entertainment sub-pages...');

  geminiAvailable = true;
  geminiWarningLogged = false;

  const apiKey = process.env.GEMINI_API_KEY || '';
  const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const aiClient = apiKey
    ? new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      })
    : null;
  if (!aiClient) {
    console.log('[INFO] No GEMINI_API_KEY configured — using editorial template paraphrasing for this run.');
  }

  // Load existing catalog so we can dedupe against it, not just within this run.
  let existingItems: any[] = [];
  try {
    const existing = JSON.parse(fs.readFileSync('data/news.json', 'utf-8'));
    existingItems = Array.isArray(existing.items) ? existing.items : [];
  } catch (err) {
    console.warn('Could not read existing data/news.json (starting fresh):', err);
  }
  const existingTitlesByKey = new Map<string, string[]>();
  for (const item of existingItems) {
    const key = item.subSector ? `${item.category}::${item.subSector}` : String(item.category);
    const list = existingTitlesByKey.get(key) || [];
    if (item.originalTitle) list.push(item.originalTitle);
    existingTitlesByKey.set(key, list);
  }

  const scrapedNewItems: any[] = [];

  for (const cat of BOT_CATEGORIES) {
    const feeds = RSS_FEEDS[cat] || RSS_FEEDS.World;
    const items = await scrapeOneFeedSet(cat, feeds, aiClient, model, existingTitlesByKey.get(cat) || [], undefined, 3);
    scrapedNewItems.push(...items);
  }

  for (const sub of ENTERTAINMENT_SUBSECTORS) {
    const items = await scrapeOneFeedSet(
      'Entertainment',
      ENTERTAINMENT_FEEDS[sub],
      aiClient,
      model,
      existingTitlesByKey.get(`Entertainment::${sub}`) || [],
      sub,
      4
    );
    scrapedNewItems.push(...items);
  }

  // Merge: new items win on id collision (fresher paraphrase), then
  // existing items fill in anything not touched this run.
  const mergedMap = new Map<string, any>();
  for (const item of scrapedNewItems) mergedMap.set(item.id, item);
  for (const item of existingItems) {
    if (!mergedMap.has(item.id)) mergedMap.set(item.id, item);
  }

  const beforeCount = mergedMap.size;
  const finalItems = dedupeAndPrune(Array.from(mergedMap.values()));
  const removedCount = beforeCount - finalItems.length;

  const output = { updated: new Date().toISOString(), items: finalItems };

  const targets = ['data/news.json', 'public/data/news.json', 'docs/data/news.json', 'dist/data/news.json'];
  for (const t of targets) {
    try {
      const dir = path.dirname(t);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(t, JSON.stringify(output, null, 2), 'utf-8');
    } catch (err) {
      console.warn(`Failed writing ${t}:`, err);
    }
  }

  console.log(
    `Scraper completed: ${scrapedNewItems.length} items scraped this run, ${removedCount} duplicate/stale items removed, ` +
      `catalog now ${finalItems.length} stories across 10 sectors + 4 Entertainment sub-pages.`
  );

  return {
    count: scrapedNewItems.length,
    pruned: removedCount,
    total: finalItems.length,
    items: finalItems,
  };
}

const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('scrape.ts') || 
  process.argv[1].endsWith('scrape.js')
);

if (isDirectRun) {
  runScraper().catch((err) => {
    console.error('Scraper run failed:', err);
    process.exitCode = 1;
  });
}
