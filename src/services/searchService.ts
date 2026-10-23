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
 *
 * Searches the in-memory story catalog client-side and pairs it with direct
 * links into Google's own search, news, image, and video indexes.
 *
 * This previously tried a `/api/search/unified` backend endpoint first and
 * only fell back to this local search when that failed — but no such
 * endpoint exists anywhere in this project (the GitHub Pages deployment is
 * static and can't run one), so that request 404'd on every single search
 * and just added a wasted network round-trip before falling back anyway.
 * Going straight to local search is equally capable and noticeably faster.
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

  let localResults: LocalSearchResultItem[] = [];
  if (options?.inMemoryStories && options.inMemoryStories.length > 0) {
    const qLower = cleanQuery.toLowerCase();
    localResults = options.inMemoryStories
      .filter((s) => (s.title + ' ' + (s.summary || '') + ' ' + (s.category || '')).toLowerCase().includes(qLower))
      .filter((s) => !options.category || options.category === 'All' || s.category.toLowerCase() === options.category.toLowerCase())
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
        score: 100,
      }));
  }

  const googleResults: GoogleSearchResultItem[] = [
    {
      title: `Google Web Search for "${cleanQuery}"`,
      url: directGoogleUrl,
      snippet: `See the full live Google web search results for "${cleanQuery}".`,
      source: 'google.com',
      date: new Date().toISOString(),
    },
    {
      title: `Google News coverage of "${cleanQuery}"`,
      url: directGoogleNewsUrl,
      snippet: `Aggregated news coverage from outlets worldwide for "${cleanQuery}".`,
      source: 'news.google.com',
      date: new Date().toISOString(),
      isGoogleNews: true,
    },
  ];

  return {
    query: cleanQuery,
    sourceBreakdown: {
      total: localResults.length + googleResults.length,
      localNewsCount: localResults.length,
      googleCount: googleResults.length,
      usingCustomSearchApi: false,
    },
    localResults,
    googleResults,
    aiOverview: `${localResults.length} matching ${localResults.length === 1 ? 'story' : 'stories'} on Viralhoods, plus the live Google search index, for "${cleanQuery}".`,
    directGoogleUrl,
    directGoogleNewsUrl,
    directGoogleImagesUrl,
    directGoogleVideosUrl,
  };
}
