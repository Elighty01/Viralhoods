import React, { useState } from 'react';
import { NewsItem, User } from '../types';
import { NewsCard, formatAgo } from './NewsCard';
import { NewsletterBanner } from './NewsletterBanner';
import { EntertainmentHub, EntertainmentSubpage } from './EntertainmentHub';
import { Search, Bookmark, X } from 'lucide-react';

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

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredItems = items.filter((item) => {
    // If filtering by bookmarks only
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

  return (
    <main className="w">
      {/* Search and Live Status Bar */}
      <div className="controls-bar">
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

        <div className="search-box-wrapper">
          <Search size={16} className="search-icon" />
          <input
            id="q"
            type="search"
            className="search-input"
            placeholder="Search stories, topics, or sectors..."
            aria-label="Search stories"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {category === 'Entertainment' && !showOnlyBookmarks ? (
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
                  <p style={{ color: 'var(--fg-muted)', margin: '0 0 16px' }}>
                    {showOnlyBookmarks
                      ? "You haven't bookmarked any stories yet. Click the bookmark icon on any card to save it."
                      : 'No stories match your current search criteria or category filter.'}
                  </p>
                  {searchQuery && (
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => setSearchQuery('')}
                    >
                      Clear search query
                    </button>
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
      )}
    </main>
  );
};
