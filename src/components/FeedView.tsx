import React, { useState, useEffect } from 'react';
import { NewsItem, User } from '../types';
import { NewsCard, formatAgo } from './NewsCard';
import { NewsletterBanner } from './NewsletterBanner';
import { EntertainmentHub, EntertainmentSubpage } from './EntertainmentHub';
import {
  Search,
  Bookmark,
  X,
  Globe,
  ExternalLink,
  Sparkles,
  Newspaper,
  ArrowRight,
  Loader2,
  Share2,
} from 'lucide-react';

interface FeedViewProps {
  items: NewsItem[];
  updatedTime: string;
  category: string;
  isLoading: boolean;
  error: string | null;
  bookmarks: string[];
  showOnlyBookmarks: boolean;
  onClearBookmarksFilter: () => void;
  onToggleBookmark: (id: string, e: React.MouseEvent) => void;
  onOpenStory: (item: NewsItem) => void;
  onSubscribe: (email: string) => boolean;
  currentUser?: User | null;
  onOpenAuth?: (message?: string) => void;
  entertainmentSubpage?: EntertainmentSubpage;
  onSelectEntertainmentSubpage?: (subpage: EntertainmentSubpage) => void;
}

export type SearchEngineMode = 'viralhoods' | 'google' | 'google-news';

interface GoogleSearchResultItem {
  title: string;
  url: string;
  snippet: string;
  source: string;
  date?: string;
  isGoogleNews?: boolean;
}

interface GoogleSearchResponse {
  query: string;
  type: string;
  aiOverview?: string;
  results: GoogleSearchResultItem[];
  groundingSources?: { title: string; url: string }[];
  webQueries?: string[];
  directGoogleUrl: string;
  directGoogleNewsUrl: string;
  directGoogleImagesUrl?: string;
  directGoogleVideosUrl?: string;
}

export const FeedView: React.FC<FeedViewProps> = ({
  items,
  updatedTime,
  category,
  isLoading,
  error,
  bookmarks,
  showOnlyBookmarks,
  onClearBookmarksFilter,
  onToggleBookmark,
  onOpenStory,
  onSubscribe,
  currentUser,
  onOpenAuth,
  entertainmentSubpage = 'news',
  onSelectEntertainmentSubpage,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchEngine, setSearchEngine] = useState<SearchEngineMode>('viralhoods');
  
  // Google Search states
  const [googleData, setGoogleData] = useState<GoogleSearchResponse | null>(null);
  const [isSearchingGoogle, setIsSearchingGoogle] = useState(false);
  const [googleSearchError, setGoogleSearchError] = useState<string | null>(null);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  // Internal filter
  const filteredItems = items.filter((item) => {
    if (showOnlyBookmarks && !bookmarks.includes(item.id)) {
      return false;
    }
    const matchesCategory =
      showOnlyBookmarks || category === 'All' || item.category === category;
    const matchesQuery =
      !normalizedQuery ||
      (item.title + ' ' + (item.summary || '')).toLowerCase().includes(normalizedQuery);
    return matchesCategory && matchesQuery;
  });

  const updatedText = updatedTime ? `Updated ${formatAgo(updatedTime)}` : 'Live Feed Active';

  // Perform Google Search Query
  const executeGoogleSearch = async (queryText?: string, mode: SearchEngineMode = searchEngine) => {
    const q = (queryText !== undefined ? queryText : searchQuery).trim();
    if (!q) return;

    setIsSearchingGoogle(true);
    setGoogleSearchError(null);

    const type = mode === 'google-news' ? 'news' : 'web';

    try {
      const res = await fetch(`/api/search/google?q=${encodeURIComponent(q)}&type=${type}`);
      if (!res.ok) {
        throw new Error(`Google Search request failed: ${res.statusText}`);
      }
      const data: GoogleSearchResponse = await res.json();
      setGoogleData(data);
    } catch (err: any) {
      console.warn('Google Search integration notice:', err);
      // Fallback response with direct Google search links
      setGoogleData({
        query: q,
        type,
        aiOverview: `Live Google Search and News coverage on "${q}". Query Google web indices or explore live publisher coverage directly.`,
        directGoogleUrl: `https://www.google.com/search?q=${encodeURIComponent(q)}`,
        directGoogleNewsUrl: `https://news.google.com/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`,
        results: [
          {
            title: `Google Live Web Search Index for "${q}"`,
            url: `https://www.google.com/search?q=${encodeURIComponent(q)}`,
            snippet: `Explore live Google web search results, authoritative ranking signals, and verified web citations for "${q}".`,
            source: 'google.com',
            date: new Date().toISOString(),
          },
          {
            title: `Google News Breaking Global Coverage on "${q}"`,
            url: `https://news.google.com/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`,
            snippet: `Aggregated international news coverage from Reuters, Associated Press, Bloomberg, BBC, and global publishers.`,
            source: 'news.google.com',
            date: new Date().toISOString(),
            isGoogleNews: true,
          },
        ],
      });
    } finally {
      setIsSearchingGoogle(false);
    }
  };

  // Switch search engine mode
  const handleSelectEngine = (mode: SearchEngineMode) => {
    setSearchEngine(mode);
    if ((mode === 'google' || mode === 'google-news') && searchQuery.trim()) {
      executeGoogleSearch(searchQuery.trim(), mode);
    }
  };

  // Handle Search Input Submit
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (searchEngine === 'google' || searchEngine === 'google-news') {
        executeGoogleSearch();
      } else if (searchQuery.trim() && filteredItems.length === 0) {
        // Auto prompt to Google if 0 local results
        handleSelectEngine('google');
      }
    }
  };

  return (
    <main className="w">
      {/* Search and Live Status Bar */}
      <div className="controls-bar" style={{ flexWrap: 'wrap', gap: '14px' }}>
        <div className="status-indicator">
          <span className="pulse-dot" />
          <span style={{ fontWeight: 600 }}>{updatedText}</span>
          {category !== 'All' && !showOnlyBookmarks && (
            <>
              <span aria-hidden="true">·</span>
              <span style={{ color: 'var(--blue)', fontWeight: 700 }}>
                {category} Sector
              </span>
            </>
          )}
          {showOnlyBookmarks && (
            <>
              <span aria-hidden="true">·</span>
              <span style={{ color: 'var(--sun)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Bookmark size={14} fill="currentColor" /> Saved Stories ({filteredItems.length})
              </span>
              <button
                type="button"
                onClick={onClearBookmarksFilter}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--fg-muted)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'inline-flex',
                }}
                title="Clear filter"
              >
                <X size={14} />
              </button>
            </>
          )}
        </div>

        {/* Integrated Multi-Engine Search Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '320px', flex: '1 1 360px', maxWidth: '640px' }}>
          <div className="search-box-wrapper" style={{ width: '100%' }}>
            {searchEngine === 'viralhoods' ? (
              <Search size={16} className="search-icon" />
            ) : searchEngine === 'google' ? (
              <Globe size={16} className="search-icon" style={{ color: 'var(--blue)' }} />
            ) : (
              <Newspaper size={16} className="search-icon" style={{ color: '#ea4335' }} />
            )}

            <input
              id="q"
              type="search"
              className="search-input"
              placeholder={
                searchEngine === 'viralhoods'
                  ? 'Search 10 news sectors & stories...'
                  : searchEngine === 'google'
                  ? 'Search Google Live Web Index...'
                  : 'Search Google News breaking wire...'
              }
              aria-label="Search news"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setGoogleData(null);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--fg-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
                title="Clear search"
              >
                <X size={15} />
              </button>
            )}

            {(searchEngine === 'google' || searchEngine === 'google-news') && (
              <button
                type="button"
                onClick={() => executeGoogleSearch()}
                disabled={isSearchingGoogle || !searchQuery.trim()}
                style={{
                  background: 'var(--blue)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '5px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: searchQuery.trim() ? 'pointer' : 'default',
                  opacity: searchQuery.trim() ? 1 : 0.6,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {isSearchingGoogle ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                Search
              </button>
            )}
          </div>

          {/* Engine Selector Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase' }}>
              Engine:
            </span>

            <button
              type="button"
              onClick={() => handleSelectEngine('viralhoods')}
              style={{
                background: searchEngine === 'viralhoods' ? 'var(--blue)' : 'var(--bg-subtle)',
                color: searchEngine === 'viralhoods' ? '#ffffff' : 'var(--fg)',
                border: '1px solid ' + (searchEngine === 'viralhoods' ? 'var(--blue)' : 'var(--line)'),
                borderRadius: '16px',
                padding: '3px 10px',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s ease',
              }}
            >
              <Search size={11} /> Viralhoods Stories
            </button>

            <button
              type="button"
              onClick={() => handleSelectEngine('google')}
              style={{
                background: searchEngine === 'google' ? 'var(--blue)' : 'var(--bg-subtle)',
                color: searchEngine === 'google' ? '#ffffff' : 'var(--fg)',
                border: '1px solid ' + (searchEngine === 'google' ? 'var(--blue)' : 'var(--line)'),
                borderRadius: '16px',
                padding: '3px 10px',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s ease',
              }}
            >
              <Globe size={11} /> Google Search
            </button>

            <button
              type="button"
              onClick={() => handleSelectEngine('google-news')}
              style={{
                background: searchEngine === 'google-news' ? '#ea4335' : 'var(--bg-subtle)',
                color: searchEngine === 'google-news' ? '#ffffff' : 'var(--fg)',
                border: '1px solid ' + (searchEngine === 'google-news' ? '#ea4335' : 'var(--line)'),
                borderRadius: '16px',
                padding: '3px 10px',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s ease',
              }}
            >
              <Newspaper size={11} /> Google News
            </button>

            {searchQuery.trim() && (
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'var(--fg-muted)',
                  fontSize: '0.74rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  marginLeft: 'auto',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
                title="Open on Google.com in new tab"
              >
                Google.com <ExternalLink size={11} />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Quick Search on Google Banner when user types in Viralhoods mode */}
      {searchEngine === 'viralhoods' && searchQuery.trim().length >= 2 && (
        <div
          style={{
            background: 'linear-gradient(90deg, var(--bg-card) 0%, var(--bg-subtle) 100%)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            fontSize: '0.86rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Globe size={15} style={{ color: 'var(--blue)' }} />
            <span>
              Searching Viralhoods for <strong>"{searchQuery}"</strong> ({filteredItems.length} stories found)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => handleSelectEngine('google')}
              style={{
                background: 'var(--blue-tint)',
                color: 'var(--blue)',
                border: '1px solid var(--blue)',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              Search on Google Index <ArrowRight size={12} />
            </button>

            <button
              type="button"
              onClick={() => handleSelectEngine('google-news')}
              style={{
                background: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #f87171',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              Search Google News <ArrowRight size={12} />
            </button>
          </div>
        </div>
      )}

      {/* GOOGLE SEARCH & GOOGLE NEWS RESULTS VIEW */}
      {(searchEngine === 'google' || searchEngine === 'google-news') ? (
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header Panel for Google Search */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--line-strong)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', gap: '2px', alignItems: 'center', fontWeight: 900, fontSize: '1.2rem', letterSpacing: '-0.5px' }}>
                    <span style={{ color: '#4285F4' }}>G</span>
                    <span style={{ color: '#EA4335' }}>o</span>
                    <span style={{ color: '#FBBC05' }}>o</span>
                    <span style={{ color: '#4285F4' }}>g</span>
                    <span style={{ color: '#34A853' }}>l</span>
                    <span style={{ color: '#EA4335' }}>e</span>
                  </div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: searchEngine === 'google' ? 'var(--blue-tint)' : '#fee2e2', color: searchEngine === 'google' ? 'var(--blue)' : '#b91c1c' }}>
                    {searchEngine === 'google' ? 'Live Web Search Index' : 'Google News Breaking Wire'}
                  </span>
                </div>

                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 6px' }}>
                  {searchQuery ? `Google Search: "${searchQuery}"` : 'Google Search Engine'}
                </h2>
                <p style={{ color: 'var(--fg-muted)', fontSize: '0.9rem', margin: 0 }}>
                  Real-time Google search groundings, breaking publisher wire dispatches, and authoritative sources.
                </p>
              </div>

              {/* Direct External Search Buttons */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(searchQuery || 'top stories')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="icon-btn"
                  style={{ textDecoration: 'none', fontWeight: 600, fontSize: '0.84rem' }}
                >
                  <Globe size={14} style={{ color: '#4285F4' }} /> Google Search ↗
                </a>

                <a
                  href={`https://news.google.com/search?q=${encodeURIComponent(searchQuery || 'top news')}&hl=en-US&gl=US&ceid=US:en`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="icon-btn"
                  style={{ textDecoration: 'none', fontWeight: 600, fontSize: '0.84rem' }}
                >
                  <Newspaper size={14} style={{ color: '#EA4335' }} /> Google News ↗
                </a>

                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(searchQuery || 'news')}&tbm=isch`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="icon-btn"
                  style={{ textDecoration: 'none', fontWeight: 600, fontSize: '0.84rem' }}
                >
                  Images ↗
                </a>

                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(searchQuery || 'news')}&tbm=vid`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="icon-btn"
                  style={{ textDecoration: 'none', fontWeight: 600, fontSize: '0.84rem' }}
                >
                  Videos ↗
                </a>
              </div>
            </div>

            {/* Quick search input within panel if empty */}
            {!searchQuery && (
              <div style={{ marginTop: '20px', padding: '16px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                <p style={{ margin: '0 0 10px', fontSize: '0.9rem', fontWeight: 600 }}>
                  Enter any topic, keyword, or breaking event above to query Google in real time:
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['Artificial Intelligence Frontier', 'SpaceX Starship Orbit', 'Federal Reserve Interest Rates', 'Champions League Scores', 'James Webb Telescope Discoveries'].map((suggest) => (
                    <button
                      key={suggest}
                      type="button"
                      onClick={() => {
                        setSearchQuery(suggest);
                        executeGoogleSearch(suggest);
                      }}
                      style={{
                        padding: '4px 10px',
                        background: 'var(--bg)',
                        border: '1px solid var(--line)',
                        borderRadius: '14px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {suggest}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Loading Indicator */}
          {isSearchingGoogle && (
            <div style={{ textAlign: 'center', padding: '50px 20px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--line)' }}>
              <Loader2 size={32} className="animate-spin" style={{ color: 'var(--blue)', margin: '0 auto 12px' }} />
              <h4 style={{ margin: '0 0 4px', fontSize: '1.1rem' }}>Querying Google Search Engine...</h4>
              <p style={{ margin: 0, color: 'var(--fg-muted)', fontSize: '0.88rem' }}>
                Fetching live web indexing and publisher dispatches via Google Search grounding.
              </p>
            </div>
          )}

          {/* Google Search AI Overview Card */}
          {!isSearchingGoogle && googleData?.aiOverview && (
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.06) 0%, rgba(52, 168, 83, 0.04) 100%)',
                border: '1px solid rgba(66, 133, 244, 0.25)',
                borderRadius: 'var(--radius-lg)',
                padding: '22px 26px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Sparkles size={16} style={{ color: 'var(--blue)' }} />
                <span style={{ fontSize: '0.84rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--blue)' }}>
                  Google Search AI Overview & Verification
                </span>
              </div>
              <p style={{ fontSize: '0.98rem', lineHeight: 1.6, margin: '0 0 14px', color: 'var(--fg)' }}>
                {googleData.aiOverview}
              </p>

              {/* Related Google Web Queries */}
              {googleData.webQueries && googleData.webQueries.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '10px', borderTop: '1px solid var(--line)' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--fg-muted)', fontWeight: 600 }}>
                    Google search queries:
                  </span>
                  {googleData.webQueries.map((wq) => (
                    <button
                      key={wq}
                      type="button"
                      onClick={() => {
                        setSearchQuery(wq);
                        executeGoogleSearch(wq);
                      }}
                      style={{
                        padding: '3px 9px',
                        background: 'var(--bg)',
                        border: '1px solid var(--line)',
                        borderRadius: '12px',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        color: 'var(--blue)',
                      }}
                    >
                      {wq}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Google Search Results Grid / List */}
          {!isSearchingGoogle && googleData?.results && googleData.results.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
                <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--fg-muted)' }}>
                  {googleData.results.length} results returned from Google Search Index
                </span>
                <button
                  type="button"
                  onClick={() => handleSelectEngine('viralhoods')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--blue)',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  Return to Viralhoods Newsfeed <ArrowRight size={13} />
                </button>
              </div>

              {googleData.results.map((res, idx) => {
                const isInternalStory = res.url.startsWith('#story-');
                return (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--line)',
                      borderRadius: 'var(--radius-md)',
                      padding: '18px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      transition: 'border-color 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--fg-muted)' }}>
                        {res.isGoogleNews ? (
                          <Newspaper size={13} style={{ color: '#EA4335' }} />
                        ) : (
                          <Globe size={13} style={{ color: '#4285F4' }} />
                        )}
                        <span style={{ fontWeight: 700, color: 'var(--fg)' }}>{res.source}</span>
                        {res.date && (
                          <>
                            <span>·</span>
                            <span>{new Date(res.date).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>

                      {res.isGoogleNews && (
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, background: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: '4px' }}>
                          Google News
                        </span>
                      )}
                    </div>

                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, lineHeight: 1.4 }}>
                      <a
                        href={res.url}
                        target={isInternalStory ? '_self' : '_blank'}
                        rel={isInternalStory ? '' : 'noopener noreferrer'}
                        style={{ color: 'var(--fg)', textDecoration: 'none' }}
                        onMouseOver={(e) => (e.currentTarget.style.color = 'var(--blue)')}
                        onMouseOut={(e) => (e.currentTarget.style.color = 'var(--fg)')}
                      >
                        {res.title} {!isInternalStory && <ExternalLink size={13} style={{ display: 'inline', marginLeft: '4px', verticalAlign: 'middle', color: 'var(--blue)' }} />}
                      </a>
                    </h3>

                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--fg-muted)', lineHeight: 1.5 }}>
                      {res.snippet}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px', marginTop: '4px' }}>
                      <a
                        href={res.url}
                        target={isInternalStory ? '_self' : '_blank'}
                        rel={isInternalStory ? '' : 'noopener noreferrer'}
                        style={{
                          fontSize: '0.8rem',
                          color: 'var(--blue)',
                          fontWeight: 700,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {isInternalStory ? 'Read in Viralhoods' : 'Read original report on source'} <ArrowRight size={12} />
                      </a>

                      <a
                        href={`https://www.google.com/search?q=${encodeURIComponent(res.title)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '0.78rem',
                          color: 'var(--fg-muted)',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        Google Search <ExternalLink size={11} />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* STANDARD VIRALHOODS FEED VIEW */
        category === 'Entertainment' && !showOnlyBookmarks ? (
          <>
            <EntertainmentHub
              currentSubpage={entertainmentSubpage}
              onSelectSubpage={onSelectEntertainmentSubpage || (() => {})}
              entertainmentStories={filteredItems}
              bookmarks={bookmarks}
              onToggleBookmark={onToggleBookmark}
              onOpenStory={onOpenStory}
              currentUser={currentUser || null}
              onOpenAuth={onOpenAuth || (() => {})}
            />
            <NewsletterBanner onSubscribe={onSubscribe} />
          </>
        ) : (
          <div id="list">
            {error && (
              <div
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--bg-subtle)',
                  margin: '30px 0',
                }}
              >
                <p className="mut" style={{ margin: 0 }}>
                  {error}
                </p>
              </div>
            )}

            {!error && isLoading && items.length === 0 && (
              <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--fg-muted)' }}>
                <p>Loading the latest original reports...</p>
              </div>
            )}

            {!error && (!isLoading || items.length > 0) && (
              <>
                {filteredItems.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '60px 20px',
                      background: 'var(--bg-subtle)',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--line)',
                      margin: '20px 0 40px',
                    }}
                  >
                    <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem' }}>No stories found</h3>
                    <p style={{ color: 'var(--fg-muted)', margin: '0 0 18px', maxWidth: '520px', marginLeft: 'auto', marginRight: 'auto' }}>
                      {showOnlyBookmarks
                        ? "You haven't bookmarked any stories yet. Click the bookmark icon on any card to save it."
                        : `No stories match "${searchQuery}" in our local database. Would you like to search the entire web via Google?`}
                    </p>

                    {searchQuery && (
                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() => handleSelectEngine('google')}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <Globe size={14} /> Search on Google Search
                        </button>

                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => handleSelectEngine('google-news')}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <Newspaper size={14} /> Search Google News
                        </button>

                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => setSearchQuery('')}
                        >
                          Clear filter
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Featured Lead Story */}
                    <NewsCard
                      item={filteredItems[0]}
                      lead={true}
                      isBookmarked={bookmarks.includes(filteredItems[0].id)}
                      onToggleBookmark={onToggleBookmark}
                      onOpenStory={onOpenStory}
                    />

                    {/* Newsletter In-Feed Banner */}
                    <NewsletterBanner onSubscribe={onSubscribe} />

                    {/* Subsequent Stories Grid */}
                    {filteredItems.length > 1 && (
                      <div className="grid">
                        {filteredItems.slice(1).map((item) => (
                          <NewsCard
                            key={item.id}
                            item={item}
                            lead={false}
                            isBookmarked={bookmarks.includes(item.id)}
                            onToggleBookmark={onToggleBookmark}
                            onOpenStory={onOpenStory}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )
      )}
    </main>
  );
};
