import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Parser from 'rss-parser';

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

type BotCategory = (typeof BOT_CATEGORIES)[number];

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

const CURATED_CATEGORY_IMAGES: Record<BotCategory, string[]> = {
  World: [
    'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=1200&q=80',
  ],
  Politics: [
    'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80',
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
  const index = Math.abs(hash) % images.length;
  return images[index];
}

function extractRssImage(item: any, category: BotCategory, title: string): string {
  if (item.mediaContent?.$?.url) return item.mediaContent.$.url;
  if (item.mediaThumbnail?.$?.url) return item.mediaThumbnail.$.url;
  if (item.mediaGroup?.['media:content']?.[0]?.$?.url) return item.mediaGroup['media:content'][0].$.url;
  if (item.enclosure?.url && typeof item.enclosure.url === 'string' && item.enclosure.url.startsWith('http')) {
    return item.enclosure.url;
  }
  const rawHtml = ((item['content:encoded'] || item.content || item.summary || '') as string);
  const match = rawHtml.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match && match[1] && match[1].startsWith('http')) {
    return match[1];
  }
  return getCategoryFallbackImage(category, title);
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

function generateParaphrasedNews(rawTitle: string, rawSummary: string, category: BotCategory) {
  const cleanTitle = rawTitle
    .replace(/\s*[-|–—:]\s*(BBC News|BBC|CNN|Reuters|AP News|AP|The Guardian|The Times|CNBC|Bloomberg|TechCrunch|The Verge|Forbes|Phys\.org|ScienceDaily).*$/i, '')
    .replace(/^(Breaking|Watch|Exclusive|Live|Analysis|Opinion|Report):\s*/i, '')
    .trim();

  const categoryPrefixes: Record<BotCategory, string[]> = {
    World: ['Global Milestone:', 'Diplomatic Accord:', 'Geopolitical Realignment:', 'International Treaty:'],
    Politics: ['Legislative Landmark:', 'Policy Realignment:', 'Regulatory Shift:', 'Judicial Verdict:'],
    Finance: ['Market Evolution:', 'Capital Reallocation:', 'Monetary Milestone:', 'Economic Blueprint:'],
    Health: ['Clinical Breakthrough:', 'Biomedical Advance:', 'Precision Health:', 'Therapeutic Milestone:'],
    Entertainment: ['Cultural Phenomenon:', 'Box Office Triumph:', 'Global Premiere:', 'Streaming Milestone:'],
    Research: ['Empirical Discovery:', 'Laboratory Milestone:', 'Quantum Frontier:', 'Scientific Breakthrough:'],
    Science: ['Cosmic Discovery:', 'Planetary Physics:', 'Astrophysical Mapping:', 'Earth Observation:'],
    AI: ['Frontier Reasoning:', 'Algorithmic Milestone:', 'Autonomous Systems:', 'Neural Breakthrough:'],
    Tech: ['Silicon Architecture:', 'Next-Gen Hardware:', 'Engineering Leap:', 'Infrastructure Standard:'],
    Sports: ['Championship Pinnacle:', 'Tactical Evolution:', 'Historic Milestone:', 'Athletic Feat:'],
  };

  const prefixes = categoryPrefixes[category] || categoryPrefixes.World;
  const seed = cleanTitle.length % prefixes.length;
  const prefix = prefixes[seed];

  let modifiedTitle = `${prefix} ${cleanTitle}`;
  if (/ amid /i.test(cleanTitle)) {
    const parts = cleanTitle.split(/ amid /i);
    modifiedTitle = `${prefix} As ${parts[1]}: ${parts[0]}`;
  } else if (/ as /i.test(cleanTitle)) {
    const parts = cleanTitle.split(/ as /i);
    modifiedTitle = `${prefix} ${parts[0]} — Key Signals from ${parts[1]}`;
  } else if (/ after /i.test(cleanTitle)) {
    const parts = cleanTitle.split(/ after /i);
    modifiedTitle = `${prefix} Following ${parts[1]}: ${parts[0]}`;
  }

  const effectiveSummary = rawSummary && rawSummary.length > 20
    ? rawSummary
    : `Verified reporting on ${cleanTitle} demonstrates significant strategic shifts across ${category.toLowerCase()} institutions.`;

  const takeaways = [
    `Key developments surrounding "${cleanTitle.slice(0, 55)}" establish new operational benchmarks across the ${category.toLowerCase()} sector.`,
    `Independent policy analysts confirm immediate structural adjustments, impacting international regulatory frameworks and resource allocations.`,
    `Cross-sector stakeholders project measurable long-term realignments throughout the forthcoming review cycle.`,
  ];

  const content = [
    `${effectiveSummary} Across the ${category.toLowerCase()} landscape, this verified milestone represents a deeper structural evolution currently reshaping institutional priorities. Observers note that initial public reporting only reflects the primary indicators of a broader transformation.`,
    `A comprehensive examination of verifiable data points demonstrates coordinated alignment among industry leaders, regulatory bodies, and community representatives. The strategic consensus underscores that proactive operational planning is required to navigate emerging realities.`,
    `Viralhoods Intelligence will maintain continuous editorial monitoring, delivering verified takeaways and investigative updates as formal milestones are ratified.`,
  ];

  const whyItMatters = `This milestone establishes a new baseline for global ${category.toLowerCase()} strategy, directly impacting policy decisions, market expectations, and civic outcomes.`;
  const whatNext = `Official stakeholder conferences, regulatory compliance disclosures, and follow-up data releases are scheduled over the coming weeks.`;

  return {
    modifiedTitle,
    takeaways,
    content,
    whyItMatters,
    whatNext,
  };
}

async function run() {
  console.log('Running automated news scrape across all 10 sectors...');
  const scrapedNewItems: any[] = [];
  const nowIso = new Date().toISOString();

  for (const cat of BOT_CATEGORIES) {
    const feeds = RSS_FEEDS[cat] || RSS_FEEDS.World;
    let feedSuccess = false;

    for (const feedUrl of feeds) {
      if (feedSuccess) break;
      try {
        const feed = await rssParser.parseURL(feedUrl);
        const topItems = (feed.items || []).slice(0, 3);

        for (const item of topItems) {
          const rawTitle = cleanRssHtml(item.title);
          const rawSummary = cleanRssHtml(item.contentSnippet || item.summary || item.content);
          if (!rawTitle || rawTitle.length < 10) continue;

          const img = extractRssImage(item, cat, rawTitle);
          const storyId = crypto.createHash('md5').update(cat + rawTitle).digest('hex').slice(0, 12);
          const paraphrased = generateParaphrasedNews(rawTitle, rawSummary, cat);

          scrapedNewItems.push({
            id: storyId,
            category: cat,
            title: paraphrased.modifiedTitle,
            originalTitle: rawTitle,
            summary: rawSummary || `Synthesized analysis on ${paraphrased.modifiedTitle}.`,
            source: item.creator || (item as any).author || `Viralhoods ${cat} Wire`,
            url: item.link || '#',
            image: img,
            date: item.pubDate ? new Date(item.pubDate).toISOString() : nowIso,
            author: `Viralhoods ${cat} Desk`,
            readTime: '4 min read',
            keyTakeaways: paraphrased.takeaways,
            content: paraphrased.content,
            whyItMatters: paraphrased.whyItMatters,
            whatNext: paraphrased.whatNext,
          });
        }

        if (scrapedNewItems.some((s) => s.category === cat)) {
          feedSuccess = true;
          console.log(`[OK] Successfully scraped sector: ${cat}`);
        }
      } catch (feedErr: any) {
        console.warn(`[WARN] Feed mirror failed for ${cat} (${feedUrl}):`, feedErr?.message || feedErr);
      }
    }
  }

  // Load existing data/news.json to merge without losing existing catalog
  let existingItems: any[] = [];
  try {
    const existing = JSON.parse(fs.readFileSync('data/news.json', 'utf-8'));
    existingItems = Array.isArray(existing.items) ? existing.items : [];
  } catch (err) {
    console.warn('Could not read existing data/news.json:', err);
  }

  const mergedMap = new Map<string, any>();
  for (const item of scrapedNewItems) {
    mergedMap.set(item.id, item);
  }
  for (const item of existingItems) {
    if (!mergedMap.has(item.id)) {
      mergedMap.set(item.id, item);
    }
  }

  const finalItems = Array.from(mergedMap.values());
  const output = {
    updated: nowIso,
    items: finalItems,
  };

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
  console.log(`Scraper completed successfully: ${scrapedNewItems.length} fresh items added, total catalog now ${finalItems.length} stories across all 10 sectors.`);
}

run();
