import {
  NewsItem,
  UnifiedSearchResponse,
  LocalSearchResultItem,
  GoogleSearchResultItem,
} from '../types';

export interface SearchServiceOptions {
  category?: string;
  inMemoryStories?: NewsItem[];
}

/**
 * Unified Search Service
 * Combines local news content (titles, summaries, categories, content) with
 * Google Custom Search API & Google Web Index results into a cohesive search experience.
 */
export async function executeUnifiedSearch(
  query: string,
  options?: SearchServiceOptions
): Promise<UnifiedSearchResponse> {
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    throw new Error('Search query cannot be empty');
  }

  const directGoogleUrl = `https://www.google.com/search?q=${encodeURIComponent(cleanQuery)}`;
  const directGoogleNewsUrl = `https://news.google.com/search?q=${encodeURIComponent(
    cleanQuery
  )}&hl=en-US&gl=US&ceid=US:en`;
  const directGoogleImagesUrl = `https://www.google.com/search?q=${encodeURIComponent(
    cleanQuery
  )}&tbm=isch`;
  const directGoogleVideosUrl = `https://www.google.com/search?q=${encodeURIComponent(
    cleanQuery
  )}&tbm=vid`;

  try {
    const res = await fetch(`/api/search/unified?q=${encodeURIComponent(cleanQuery)}&type=unified`);
    if (!res.ok) {
      throw new Error(`Search service HTTP error: ${res.statusText}`);
    }

    const data: UnifiedSearchResponse = await res.json();

    // Augment local results with any in-memory client custom stories
    let augmentedLocal = [...(data.localResults || [])];
    if (options?.inMemoryStories && options.inMemoryStories.length > 0) {
      const qLower = cleanQuery.toLowerCase();
      const clientMatches: LocalSearchResultItem[] = options.inMemoryStories
        .filter((story) => {
          const matchQuery =
            (story.title + ' ' + (story.summary || '') + ' ' + (story.category || '')).toLowerCase();
          return matchQuery.includes(qLower);
        })
        .map((story) => ({
          id: story.id,
          title: story.title,
          summary: story.summary,
          category: story.category,
          source: story.source || 'Viralhoods Local News',
          date: story.date,
          url: `#story-${story.id}`,
          image: story.image,
          author: story.author,
          readTime: story.readTime,
          score: 100, // High score for active local story
        }));

      for (const cm of clientMatches) {
        if (!augmentedLocal.some((al) => al.id === cm.id)) {
          augmentedLocal.unshift(cm);
        }
      }
    }

    // Filter by category if requested
    if (options?.category && options.category !== 'All') {
      augmentedLocal = augmentedLocal.filter(
        (item) => item.category.toLowerCase() === options.category!.toLowerCase()
      );
    }

    return {
      ...data,
      localResults: augmentedLocal,
      sourceBreakdown: {
        total: augmentedLocal.length + (data.googleResults?.length || 0),
        localNewsCount: augmentedLocal.length,
        googleCount: data.googleResults?.length || 0,
        usingCustomSearchApi: data.sourceBreakdown?.usingCustomSearchApi ?? false,
      },
    };
  } catch (err: any) {
    console.warn('Unified search API offline fallback:', err?.message || err);

    // Fallback: perform local client-side search across available stories
    let fallbackLocal: LocalSearchResultItem[] = [];
    if (options?.inMemoryStories && options.inMemoryStories.length > 0) {
      const qLower = cleanQuery.toLowerCase();
      fallbackLocal = options.inMemoryStories
        .filter((s) => (s.title + ' ' + (s.summary || '')).toLowerCase().includes(qLower))
        .map((s) => ({
          id: s.id,
          title: s.title,
          summary: s.summary,
          category: s.category,
          source: s.source || 'Viralhoods Local News',
          date: s.date,
          url: `#story-${s.id}`,
          image: s.image,
          author: s.author,
          readTime: s.readTime,
        }));
    }

    const fallbackGoogle: GoogleSearchResultItem[] = [
      {
        title: `Google Live Web Search Index for "${cleanQuery}"`,
        url: directGoogleUrl,
        snippet: `Explore live Google web search results, authoritative ranking signals, and verified web citations for "${cleanQuery}".`,
        source: 'google.com',
        date: new Date().toISOString(),
      },
      {
        title: `Google News Breaking Global Coverage on "${cleanQuery}"`,
        url: directGoogleNewsUrl,
        snippet: `Aggregated international news coverage from Reuters, Associated Press, Bloomberg, BBC, and global publishers.`,
        source: 'news.google.com',
        date: new Date().toISOString(),
        isGoogleNews: true,
      },
    ];

    return {
      query: cleanQuery,
      sourceBreakdown: {
        total: fallbackLocal.length + fallbackGoogle.length,
        localNewsCount: fallbackLocal.length,
        googleCount: fallbackGoogle.length,
        usingCustomSearchApi: false,
      },
      localResults: fallbackLocal,
      googleResults: fallbackGoogle,
      aiOverview: `Live Google search index and local publication records for "${cleanQuery}". Explore verified citations and coverage directly.`,
      directGoogleUrl,
      directGoogleNewsUrl,
      directGoogleImagesUrl,
      directGoogleVideosUrl,
    };
  }
}
