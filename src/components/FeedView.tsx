import React, { useState, useEffect, useRef } from 'react';
import { NewsItem, User, UnifiedSearchResponse } from '../types';
import { NewsCard, formatAgo } from './NewsCard';
import { NewsletterBanner } from './NewsletterBanner';
import { Sidebar } from './Sidebar';
import { CategoryShowcase } from './CategoryShowcase';
import { lazy, Suspense } from 'react';
import type { EntertainmentSubpage } from './EntertainmentHub';

// Lazy: this is a large (~1,800 line) component only needed when the
// reader actually clicks into the Entertainment sector, not on every feed
// load.
const EntertainmentHub = lazy(() => import('./EntertainmentHub').then((m) => ({ default: m.EntertainmentHub })));
import { executeUnifiedSearch } from '../services/searchService';
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
  Layers,
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
  onSubscribe: (email: string) => Promise<boolean> | boolean;
  currentUser?: User | null;
  onOpenAuth?: (message?: string) => void;
  entertainmentSubpage?: EntertainmentSubpage;
  onSelectEntertainmentSubpage?: (subpage: EntertainmentSubpage) => void;
  onNavigateCommunity: () => void;
  onSelectCategory: (category: string) => void;
}

export type SearchEngineMode = 'viralhoods' | 'google' | 'google-news';

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
  onNavigateCommunity,
  onSelectCategory,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTab, setSearchTab] = useState<'all' | 'local' | 'google'>('all');
  
  // Unified Search states
  const [unifiedData, setUnifiedData] = useState<UnifiedSearchResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  // Internal filter - searches titles, summaries, and categories
  const filteredItems = items.filter((item) => {
    if (showOnlyBookmarks && !bookmarks.includes(item.id)) {
      return false;
    }
    const matchesCategory =
      showOnlyBookmarks || !normalizedQuery || category === 'All' || item.category === category;
    const matchesQuery =
      !normalizedQuery ||
      (item.title + ' ' + (item.summary || '') + ' ' + (item.category || '')).toLowerCase().includes(normalizedQuery);
    return matchesCategory && matchesQuery;
  });

  // Pagination for the normal (non-search) browsing view. Without this the
  // feed rendered every matching story at once — fine with a few dozen
  // items, but the catalog now grows continuously (see the scraper's
  // pruning rule, which still allows up to 150 stories per sector), so an
  // unbounded render would get slower over time. Resets whenever the
  // category, bookmarks-only toggle, or search query changes.
  const PAGE_SIZE = 24;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [category, showOnlyBookmarks, normalizedQuery]);

  // Infinite scroll: reveal the next page automatically as the reader
  // nears the bottom of the grid, instead of requiring a click every time.
  // The "Load more" button a little further down still works too — this
  // sentinel just saves the click in the common case. Re-armed whenever
  // visibleCount or the result count changes; it's a no-op once everything
  // currently matching is already visible.
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = loadMoreSentinelRef.current;
    if (!node || visibleCount >= filteredItems.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, filteredItems.length));
        }
      },
      { rootMargin: '800px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visibleCount, filteredItems.length]);

  const updatedText = updatedTime ? `Updated ${formatAgo(updatedTime)}` : 'Live Feed Active';

  // Perform Unified Search across Current Local News Content & Google Custom Search API
  const runUnifiedSearch = async (queryText?: string) => {
    const q = (queryText !== undefined ? queryText : searchQuery).trim();
    if (!q) return;

    setIsSearching(true);
    setSearchError(null);

    try {
      const data = await executeUnifiedSearch(q, {
        category,
        inMemoryStories: items,
      });
      setUnifiedData(data);
    } catch (err: any) {
      console.warn('Unified search client error:', err);
      setSearchError(err?.message || 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  // Automatically trigger debounced unified search whenever search query changes
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) {
      setUnifiedData(null);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(() => {
      runUnifiedSearch(q);
    }, 450);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle Search Input Enter Key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchQuery.trim()) {
        runUnifiedSearch(searchQuery.trim());
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

        {/* Unified Search Control - Searches Website Contents & Entire Google */}
        <div style={{ display: 'flex', alignItems: 'center', minWidth: '300px', flex: '1 1 360px', maxWidth: '580px' }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (searchQuery.trim()) {
                runUnifiedSearch(searchQuery.trim());
              }
            }}
            className="search-box-wrapper"
            style={{ width: '100%' }}
          >
            <Search size={16} className="search-icon" />

            <input
              id="q"
              type="search"
              className="search-input"
              placeholder="Search website contents & entire Google..."
              aria-label="Search website contents and Google"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setUnifiedData(null);
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

            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              style={{
                background: 'var(--blue)',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: searchQuery.trim() ? 'pointer' : 'default',
                opacity: searchQuery.trim() ? 1 : 0.6,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                flexShrink: 0,
              }}
            >
              {isSearching ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
              Search
            </button>
          </form>
        </div>
      </div>

      {/* "What We Cover" sector showcase — only on the all-sectors home
          state; a specific category page already has its tab highlighted,
          so repeating a full sector grid there would just be noise. */}
      {!searchQuery.trim() && category === 'All' && !showOnlyBookmarks && (
        <CategoryShowcase items={items} onSelectCategory={onSelectCategory} />
      )}

      {/* UNIFIED DUAL SEARCH RESULTS VIEW (Local News Content + Google Custom Search API) */}
      {searchQuery.trim() ? (
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {/* Header Panel for Unified Search */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--line-strong)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px 24px',
              boxShadow: 'var(--card-shadow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    background: 'var(--blue-tint)',
                    color: 'var(--blue)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                  }}
                >
                  Unified Search Service
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--fg-muted)' }}>
                  Local News Content &bull; Google Custom Search API
                </span>
                {unifiedData?.sourceBreakdown?.usingCustomSearchApi && (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      background: 'rgba(52, 168, 83, 0.12)',
                      color: '#2e7d32',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    ⚡ Custom Search API Connected
                  </span>
                )}
              </div>

              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>
                Results for &ldquo;{searchQuery}&rdquo;
              </h2>
            </div>

            {/* Quick Metrics & Filter Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setSearchTab('all')}
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  background: searchTab === 'all' ? 'var(--blue)' : 'var(--bg-subtle)',
                  color: searchTab === 'all' ? '#ffffff' : 'var(--fg)',
                  border: '1px solid',
                  borderColor: searchTab === 'all' ? 'var(--blue)' : 'var(--line)',
                  borderRadius: '20px',
                  padding: '5px 12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Layers size={13} />
                All ({filteredItems.length + (unifiedData?.googleResults?.length || 0)})
              </button>

              <button
                type="button"
                onClick={() => setSearchTab('local')}
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  background: searchTab === 'local' ? 'var(--blue)' : 'var(--bg-subtle)',
                  color: searchTab === 'local' ? '#ffffff' : 'var(--fg)',
                  border: '1px solid',
                  borderColor: searchTab === 'local' ? 'var(--blue)' : 'var(--line)',
                  borderRadius: '20px',
                  padding: '5px 12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                📰 Local News ({filteredItems.length})
              </button>

              <button
                type="button"
                onClick={() => setSearchTab('google')}
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  background: searchTab === 'google' ? 'var(--blue)' : 'var(--bg-subtle)',
                  color: searchTab === 'google' ? '#ffffff' : 'var(--fg)',
                  border: '1px solid',
                  borderColor: searchTab === 'google' ? 'var(--blue)' : 'var(--line)',
                  borderRadius: '20px',
                  padding: '5px 12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                🌐 Google Search ({isSearching ? '...' : unifiedData?.googleResults?.length || 0})
              </button>

              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="icon-btn"
                style={{
                  textDecoration: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title="Open on Google.com in new tab"
              >
                Google.com <ExternalLink size={12} />
              </a>
            </div>
          </div>

          {/* SECTION 1: Local News Content */}
          {(searchTab === 'all' || searchTab === 'local') && (
            <section>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: '12px',
                  marginBottom: '16px',
                  borderBottom: '2px solid var(--line)',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.15rem', fontWeight: 800 }}>📰 Local News Content</span>
                  <span
                    style={{
                      background: 'var(--blue)',
                      color: '#fff',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '12px',
                    }}
                  >
                    {filteredItems.length} {filteredItems.length === 1 ? 'story' : 'stories'}
                  </span>
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>
                  Verified editorial reporting from Viralhoods
                </span>
              </div>

              {filteredItems.length === 0 ? (
                <div
                  style={{
                    padding: '30px 20px',
                    textAlign: 'center',
                    background: 'var(--bg-card)',
                    border: '1px dashed var(--line)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--fg-muted)',
                  }}
                >
                  <p style={{ margin: 0, fontSize: '0.92rem' }}>
                    No local news stories match <strong>&ldquo;{searchQuery}&rdquo;</strong>.
                    {searchTab === 'all' ? ' Review the Google Custom Search results below!' : ' Switch to Google Search or All tabs to view web dispatches.'}
                  </p>
                </div>
              ) : (
                <div>
                  <NewsCard
                    item={filteredItems[0]}
                    lead={true}
                    isBookmarked={bookmarks.includes(filteredItems[0].id)}
                    onToggleBookmark={onToggleBookmark}
                    onOpenStory={onOpenStory}
                  />

                  {filteredItems.length > 1 && (
                    <div className="grid" style={{ marginTop: '20px' }}>
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
                </div>
              )}
            </section>
          )}

          {/* SECTION 2: Google Custom Search API & Web Index */}
          {(searchTab === 'all' || searchTab === 'google') && (
            <section>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: '12px',
                  marginBottom: '16px',
                  borderBottom: '2px solid var(--line)',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '1px', alignItems: 'center', fontWeight: 900, fontSize: '1.15rem' }}>
                    <span style={{ color: '#4285F4' }}>G</span>
                    <span style={{ color: '#EA4335' }}>o</span>
                    <span style={{ color: '#FBBC05' }}>o</span>
                    <span style={{ color: '#4285F4' }}>g</span>
                    <span style={{ color: '#34A853' }}>l</span>
                    <span style={{ color: '#EA4335' }}>e</span>
                  </div>
                  <span style={{ fontSize: '1.15rem', fontWeight: 800 }}>Custom Search &amp; Web Index</span>
                  <span
                    style={{
                      background: 'var(--bg-subtle)',
                      border: '1px solid var(--line)',
                      color: 'var(--fg)',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '12px',
                    }}
                  >
                    Entire Google
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <a
                    href={`https://news.google.com/search?q=${encodeURIComponent(searchQuery)}&hl=en-US&gl=US&ceid=US:en`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '0.78rem',
                      color: '#ea4335',
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Newspaper size={12} /> Google News ↗
                  </a>
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&tbm=isch`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '0.78rem',
                      color: 'var(--blue)',
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    Images ↗
                  </a>
                </div>
              </div>

              {/* Loading Indicator */}
              {isSearching && (
                <div style={{ textAlign: 'center', padding: '50px 20px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--line)' }}>
                  <Loader2 size={32} className="animate-spin" style={{ color: 'var(--blue)', margin: '0 auto 12px' }} />
                  <h4 style={{ margin: '0 0 4px', fontSize: '1.1rem' }}>Querying Google Custom Search &amp; Web Index...</h4>
                  <p style={{ margin: 0, color: 'var(--fg-muted)', fontSize: '0.88rem' }}>
                    Fetching live web index, publisher dispatches, and custom search records.
                  </p>
                </div>
              )}

              {/* Google Search AI Overview Card */}
              {!isSearching && unifiedData?.aiOverview && (
                <div
                  style={{
                    background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.06) 0%, rgba(52, 168, 83, 0.04) 100%)',
                    border: '1px solid rgba(66, 133, 244, 0.25)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '22px 26px',
                    marginBottom: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <Sparkles size={16} style={{ color: 'var(--blue)' }} />
                    <span style={{ fontSize: '0.84rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--blue)' }}>
                      Google Search Overview &amp; Verification
                    </span>
                  </div>
                  <p style={{ fontSize: '0.98rem', lineHeight: 1.6, margin: '0 0 14px', color: 'var(--fg)' }}>
                    {unifiedData.aiOverview}
                  </p>

                  {/* Related Google Web Queries */}
                  {unifiedData.webQueries && unifiedData.webQueries.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '10px', borderTop: '1px solid var(--line)' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--fg-muted)', fontWeight: 600 }}>
                        Related searches:
                      </span>
                      {unifiedData.webQueries.map((wq) => (
                        <button
                          key={wq}
                          type="button"
                          onClick={() => {
                            setSearchQuery(wq);
                            runUnifiedSearch(wq);
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
              {!isSearching && unifiedData?.googleResults && unifiedData.googleResults.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
                    <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--fg-muted)' }}>
                      {unifiedData.googleResults.length} results returned from Google Search
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setUnifiedData(null);
                      }}
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
                      Clear Search Filter <X size={13} />
                    </button>
                  </div>

                  {unifiedData.googleResults.map((res, idx) => {
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
                                <span>&bull;</span>
                                <span>{new Date(res.date).toLocaleDateString()}</span>
                              </>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: '6px' }}>
                            {res.isCustomSearch && (
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'rgba(66, 133, 244, 0.12)', color: 'var(--blue)', padding: '2px 6px', borderRadius: '4px' }}>
                                Custom Search
                              </span>
                            )}
                            {res.isGoogleNews && (
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, background: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: '4px' }}>
                                Google News
                              </span>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                          {res.thumbnail && (
                            <img
                              src={res.thumbnail}
                              alt=""
                              style={{
                                width: '70px',
                                height: '70px',
                                objectFit: 'cover',
                                borderRadius: 'var(--radius-sm)',
                                flexShrink: 0,
                                border: '1px solid var(--line)',
                              }}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h3 style={{ margin: '0 0 6px', fontSize: '1.08rem', fontWeight: 700, lineHeight: 1.4 }}>
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
                          </div>
                        </div>

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
            </section>
          )}
        </div>
      ) : (
        /* STANDARD VIRALHOODS FEED VIEW */
        category === 'Entertainment' && !showOnlyBookmarks ? (
          <>
            <Suspense fallback={<div style={{ padding: '60px 16px', textAlign: 'center', color: 'var(--fg-muted)' }}>Loading Entertainment Hub...</div>}>
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
            </Suspense>
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
                        : "There are currently no articles in this category."}
                    </p>

                    {showOnlyBookmarks && (
                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={onClearBookmarksFilter}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          View all stories
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="layout-grid">
                  <div className="posts-main">
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

                    {/* Subsequent Stories Grid — paginated, see visibleCount above */}
                    {filteredItems.length > 1 && (
                      <div className="grid">
                        {filteredItems.slice(1, visibleCount).map((item) => (
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

                    {filteredItems.length > visibleCount && (
                      <>
                        {/* Invisible trigger the infinite-scroll observer above
                            watches — sits ~800px above the real bottom so the
                            next page is already in place by the time the
                            reader scrolls there. */}
                        <div ref={loadMoreSentinelRef} aria-hidden="true" style={{ height: '1px' }} />
                        <div style={{ display: 'flex', justifyContent: 'center', margin: '28px 0 8px' }}>
                          <button
                            type="button"
                            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                            className="btn-outline"
                            style={{ padding: '10px 24px', fontWeight: 700, fontSize: '0.9rem' }}
                          >
                            Load More ({filteredItems.length - visibleCount} remaining)
                          </button>
                        </div>
                      </>
                    )}

                    {filteredItems.length > PAGE_SIZE && filteredItems.length <= visibleCount && (
                      <div
                        style={{
                          textAlign: 'center',
                          color: 'var(--fg-muted)',
                          fontSize: '0.88rem',
                          margin: '28px 0 8px',
                          paddingTop: '20px',
                          borderTop: '1px solid var(--line)',
                        }}
                      >
                        You're all caught up — {filteredItems.length} stories shown.
                      </div>
                    )}
                  </div>

                  <Sidebar
                    items={items}
                    onOpenStory={onOpenStory}
                    onSelectCategory={onSelectCategory}
                    onNavigateCommunity={onNavigateCommunity}
                  />
                  </div>
                )}
              </>
            )}
          </div>
        )
      )}
    </main>
  );
};
