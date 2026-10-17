"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerNewsScrapeOnDemand = exports.scrapeDailyTrendingNews = void 0;
exports.scrapeTrendingNewsAndSyncFirestore = scrapeTrendingNewsAndSyncFirestore;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const genai_1 = require("@google/genai");
const rss_parser_1 = __importDefault(require("rss-parser"));
// Initialize Firebase Admin
if ((0, app_1.getApps)().length === 0) {
    (0, app_1.initializeApp)();
}
const db = (0, firestore_1.getFirestore)();
const CATEGORIES = [
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
];
const RSS_FEEDS = {
    World: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    Politics: 'https://feeds.bbci.co.uk/news/politics/rss.xml',
    Finance: 'https://feeds.bbci.co.uk/news/business/rss.xml',
    Health: 'https://feeds.bbci.co.uk/news/health/rss.xml',
    Entertainment: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml',
    Research: 'https://news.google.com/rss/search?q=scientific+research+breakthrough&hl=en-US&gl=US&ceid=US:en',
    Science: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml',
    AI: 'https://news.google.com/rss/search?q=Artificial+Intelligence+news&hl=en-US&gl=US&ceid=US:en',
    Tech: 'https://feeds.bbci.co.uk/news/technology/rss.xml',
    Sports: 'https://feeds.bbci.co.uk/sport/rss.xml',
};
const DEFAULT_CATEGORY_IMAGES = {
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
const parser = new rss_parser_1.default({
    customFields: {
        item: [
            ['media:content', 'mediaContent'],
            ['media:thumbnail', 'mediaThumbnail'],
            ['enclosure', 'enclosure'],
        ],
    },
});
function extractItemImage(item, rawXml) {
    if (item.mediaContent && item.mediaContent.$ && item.mediaContent.$.url) {
        return item.mediaContent.$.url;
    }
    if (item.mediaThumbnail && item.mediaThumbnail.$ && item.mediaThumbnail.$.url) {
        return item.mediaThumbnail.$.url;
    }
    if (item.enclosure && item.enclosure.url && item.enclosure.url.startsWith('http')) {
        return item.enclosure.url;
    }
    if (rawXml) {
        const match = rawXml.match(/(?:media:content|media:thumbnail|enclosure)[^>]+url=["']([^"']+)["']/i);
        if (match)
            return match[1];
        const imgMatch = rawXml.match(/<img[^>]+src=["']([^"']+)["']/i);
        if (imgMatch)
            return imgMatch[1];
    }
    return null;
}
function cleanHtml(text) {
    if (!text)
        return '';
    return text
        .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}
/**
 * Paraphrases headline and synthesizes content using the Gemini API.
 */
async function paraphraseWithGemini(originalTitle, summary, category, aiClient) {
    if (aiClient) {
        try {
            const prompt = `You are the lead editor at Viralhoods, a modern news intelligence service.
Given this original trending news headline and summary from the "${category}" sector:
Original Headline: "${originalTitle}"
Summary: "${summary}"

Task:
1. Paraphrase or modify the headline so it is engaging, completely fresh, and not copied verbatim, while accurately reflecting the factual event.
2. Provide 3 distinct key analytical takeaways.
3. Provide a 3-paragraph synthesized report covering what happened, the broader context, and stakeholder impact.
4. Provide a single sentence on "Why It Matters".
5. Provide a single sentence on "What Next".

Output MUST be valid JSON in this exact shape:
{
  "modifiedTitle": "string",
  "takeaways": ["string", "string", "string"],
  "content": ["string", "string", "string"],
  "whyItMatters": "string",
  "whatNext": "string"
}`;
            const res = await aiClient.models.generateContent({
                model: 'gemini-3.8-flash',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                },
            });
            const parsed = JSON.parse(res.text || '{}');
            if (parsed.modifiedTitle && Array.isArray(parsed.takeaways) && Array.isArray(parsed.content)) {
                return {
                    modifiedTitle: parsed.modifiedTitle,
                    takeaways: parsed.takeaways,
                    content: parsed.content,
                    whyItMatters: parsed.whyItMatters || `Key developments in ${category} alter expectations for sector stakeholders.`,
                    whatNext: parsed.whatNext || 'Subsequent updates and policy responses are anticipated over the coming days.',
                };
            }
        }
        catch (err) {
            logger.warn('Gemini paraphrasing fallback triggered for story:', err);
        }
    }
    // Fallback intelligent linguistic paraphraser
    const cleanTitle = originalTitle.replace(/\s*[-|–—:]\s*(BBC|CNN|Reuters|AP|The Guardian|The Times|CNBC|Bloomberg|TechCrunch).*$/i, '').trim();
    let modified = cleanTitle;
    if (/ amid /i.test(cleanTitle)) {
        const parts = cleanTitle.split(/ amid /i);
        modified = `As ${parts[1]}: ${parts[0]}`;
    }
    else if (/ as /i.test(cleanTitle)) {
        const parts = cleanTitle.split(/ as /i);
        modified = `${parts[0]} — Key Signals from ${parts[1]}`;
    }
    else if (/ after /i.test(cleanTitle)) {
        const parts = cleanTitle.split(/ after /i);
        modified = `Following ${parts[1]}: ${parts[0]}`;
    }
    else {
        modified = `${cleanTitle}: Strategic Impact and Key Takeaways`;
    }
    return {
        modifiedTitle: modified,
        takeaways: [
            `Strategic updates in ${category.toLowerCase()} show marked shifts across global stakeholders.`,
            `Verified reporting outlines structural realignment rather than isolated turbulence.`,
            `Observers anticipate continuous ripples throughout the current operating quarter.`,
        ],
        content: [
            `${summary || cleanTitle} Across ${category.toLowerCase()}, latest verified dispatches underscore broader transformations currently underway.`,
            `Institutional stakeholders are recalculating positioning in light of fresh developments. Analysts highlight that preliminary metrics signal sustained follow-through.`,
            `Viralhoods maintains round-the-clock monitoring, distilling crucial milestones as authenticated confirmation emerges.`,
        ],
        whyItMatters: `This shift establishes a new baseline for ${category.toLowerCase()} dynamics globally.`,
        whatNext: `Upcoming public disclosures and institutional reviews will shape subsequent milestones.`,
    };
}
/**
 * Core scraping and Firestore sync engine.
 */
async function scrapeTrendingNewsAndSyncFirestore() {
    const startTime = Date.now();
    logger.info('Starting daily Viralhoods news scrape at 12 AM UTC...');
    const apiKey = process.env.GEMINI_API_KEY || '';
    const aiClient = apiKey ? new genai_1.GoogleGenAI({ apiKey }) : null;
    const scrapedItems = [];
    const nowIso = new Date().toISOString();
    for (const cat of CATEGORIES) {
        const feedUrl = RSS_FEEDS[cat];
        try {
            const feed = await parser.parseURL(feedUrl);
            const topItems = (feed.items || []).slice(0, 3);
            for (const item of topItems) {
                const rawTitle = cleanHtml(item.title);
                const rawSummary = cleanHtml(item.contentSnippet || item.summary || item.content);
                if (!rawTitle)
                    continue;
                const img = extractItemImage(item) || DEFAULT_CATEGORY_IMAGES[cat];
                const storyId = `${cat.toLowerCase()}-${Buffer.from(rawTitle).toString('hex').slice(0, 10)}`;
                const paraphrased = await paraphraseWithGemini(rawTitle, rawSummary, cat, aiClient);
                const storyDoc = {
                    id: storyId,
                    category: cat,
                    title: paraphrased.modifiedTitle,
                    originalTitle: rawTitle,
                    summary: rawSummary || `Synthesized analysis on ${paraphrased.modifiedTitle}.`,
                    source: item.creator || item.author || 'Viralhoods Wire Desk',
                    url: item.link || '#',
                    image: img,
                    date: item.pubDate ? new Date(item.pubDate).toISOString() : nowIso,
                    scrapedAt: nowIso,
                    author: `Viralhoods ${cat} Desk`,
                    readTime: '3 min read',
                    keyTakeaways: paraphrased.takeaways,
                    content: paraphrased.content,
                    whyItMatters: paraphrased.whyItMatters,
                    whatNext: paraphrased.whatNext,
                };
                // Write directly to Firestore 'stories' collection
                await db.collection('stories').doc(storyId).set(storyDoc, { merge: true });
                scrapedItems.push(storyDoc);
            }
        }
        catch (feedErr) {
            logger.error(`Error scraping category ${cat}:`, feedErr);
        }
    }
    // Update metadata document
    await db.collection('system').doc('bot_status').set({
        lastRunAt: nowIso,
        totalScraped: scrapedItems.length,
        durationMs: Date.now() - startTime,
        status: 'success',
    }, { merge: true });
    logger.info(`Successfully scraped and synced ${scrapedItems.length} news stories to Firestore.`);
    return {
        success: true,
        count: scrapedItems.length,
        items: scrapedItems,
    };
}
/**
 * 1. Firebase Scheduled Cloud Function (Daily at 12 AM UTC)
 */
exports.scrapeDailyTrendingNews = (0, scheduler_1.onSchedule)({
    schedule: '0 0 * * *', // Daily at 12:00 AM UTC
    timeZone: 'UTC',
    memory: '1GiB',
    timeoutSeconds: 300,
}, async (_event) => {
    logger.info('Scheduled job fired: 12 AM UTC news scraping.');
    await scrapeTrendingNewsAndSyncFirestore();
});
/**
 * 2. HTTP on-demand Cloud Function trigger
 */
exports.triggerNewsScrapeOnDemand = (0, https_1.onRequest)({
    cors: true,
    timeoutSeconds: 300,
    memory: '1GiB',
}, async (_req, res) => {
    try {
        const result = await scrapeTrendingNewsAndSyncFirestore();
        res.json(result);
    }
    catch (err) {
        logger.error('Error executing on-demand scrape:', err);
        res.status(500).json({ error: err?.message || 'Scrape execution failed' });
    }
});
//# sourceMappingURL=index.js.map