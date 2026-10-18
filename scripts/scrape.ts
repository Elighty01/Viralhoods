import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Parser from 'rss-parser';

const rssParser = new Parser({
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
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

const RSS_FEEDS: Record<BotCategory, string> = {
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

const DEFAULT_CATEGORY_IMAGES: Record<BotCategory, string> = {
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

function extractRssImage(item: any): string | null {
  if (item.mediaContent?.$?.url) return item.mediaContent.$.url;
  if (item.mediaThumbnail?.$?.url) return item.mediaThumbnail.$.url;
  if (item.enclosure?.url && typeof item.enclosure.url === 'string' && item.enclosure.url.startsWith('http')) {
    return item.enclosure.url;
  }
  const content = (item['content:encoded'] || item.content || '') as string;
  const match = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match) return match[1];
  return null;
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

function generateParaphrasedNews(title: string, summary: string, category: string) {
  const cleanTitle = title
    .replace(/\s*[-|–—:]\s*(BBC|CNN|Reuters|AP|The Guardian|The Times|CNBC|Bloomberg|TechCrunch).*$/i, '')
    .trim();

  let modified = cleanTitle;
  if (/ amid /i.test(cleanTitle)) {
    const parts = cleanTitle.split(/ amid /i);
    modified = `As ${parts[1]}: ${parts[0]}`;
  } else if (/ as /i.test(cleanTitle)) {
    const parts = cleanTitle.split(/ as /i);
    modified = `${parts[0]} — Key Signals from ${parts[1]}`;
  } else if (/ after /i.test(cleanTitle)) {
    const parts = cleanTitle.split(/ after /i);
    modified = `Following ${parts[1]}: ${parts[0]}`;
  } else {
    modified = `${cleanTitle}: Strategic Impact and Key Takeaways`;
  }

  return {
    modifiedTitle: modified,
    takeaways: [
      `Critical developments in ${category.toLowerCase()} highlight ongoing shifts across international stakeholders.`,
      `Verified analysis confirms immediate adjustments to operational planning and public sentiment.`,
      `Industry observers anticipate measurable ripple effects over the forthcoming quarterly review cycle.`,
    ],
    content: [
      `${summary || cleanTitle} Across the ${category.toLowerCase()} sphere, the latest verified updates reflect deeper structural transformations currently underway.`,
      `A comprehensive evaluation of the data points to evolving priorities among key institutions. Observers emphasize that initial assessments only capture the first phase of broader realignments.`,
      `Viralhoods will maintain continuous editorial monitoring, delivering verified takeaways as confirmed milestones are published.`,
    ],
    whyItMatters: `This milestone recalibrates baseline expectations for ${category.toLowerCase()} strategy worldwide.`,
    whatNext: `Upcoming stakeholder conferences and regulatory disclosures will determine the next operational phase.`,
  };
}

async function run() {
  console.log('Running automated news scrape...');
  const allNewsItems: any[] = [];
  const nowIso = new Date().toISOString();

  for (const cat of BOT_CATEGORIES) {
    const feedUrl = RSS_FEEDS[cat];
    try {
      const feed = await rssParser.parseURL(feedUrl);
      const topItems = (feed.items || []).slice(0, 3);

      for (const item of topItems) {
        const rawTitle = cleanRssHtml(item.title);
        const rawSummary = cleanRssHtml(item.contentSnippet || item.summary || item.content);
        if (!rawTitle) continue;

        const img = extractRssImage(item) || DEFAULT_CATEGORY_IMAGES[cat];
        const storyId = crypto.createHash('md5').update(cat + rawTitle).digest('hex').slice(0, 12);
        const paraphrased = generateParaphrasedNews(rawTitle, rawSummary, cat);

        allNewsItems.push({
          id: storyId,
          category: cat,
          title: paraphrased.modifiedTitle,
          originalTitle: rawTitle,
          summary: rawSummary || `Synthesized analysis on ${paraphrased.modifiedTitle}.`,
          source: item.creator || (item as any).author || 'Viralhoods Wire Desk',
          url: item.link || '#',
          image: img,
          date: item.pubDate ? new Date(item.pubDate).toISOString() : nowIso,
          author: `Viralhoods ${cat} Desk`,
          readTime: '3 min read',
          keyTakeaways: paraphrased.takeaways,
          content: paraphrased.content,
          whyItMatters: paraphrased.whyItMatters,
          whatNext: paraphrased.whatNext,
        });
      }
    } catch (feedErr) {
      console.warn(`Error scraping RSS for ${cat}:`, feedErr);
    }
  }

  if (allNewsItems.length > 0) {
    const output = {
      updated: nowIso,
      items: allNewsItems,
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
    console.log(`Successfully scraped ${allNewsItems.length} news items.`);
  }
}

run();
