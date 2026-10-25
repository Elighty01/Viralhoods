import React, { useEffect, useMemo, useState } from 'react';
import { NewsItem, CommunityPost, CATEGORIES } from '../types';
import { fetchAllPosts } from '../utils/community';
import { formatAgo } from './NewsCard';
import { Users, Flame, Layers, ArrowRight, MessageSquarePlus } from 'lucide-react';
import initialAds from '../../data/ads.json';

interface SidebarProps {
  items: NewsItem[];
  onOpenStory: (item: NewsItem) => void;
  onSelectCategory: (category: string) => void;
  onNavigateCommunity: () => void;
}

/**
 * The right-hand rail shown alongside the main feed. Four self-contained
 * widgets stacked in one sticky column:
 *   1. Advertisement  — sponsor placements, editable via data/ads.json
 *   2. Community       — a live snapshot of CommunityHub, not a mockup
 *   3. Trending Now    — freshest stories across every sector
 *   4. Browse by Sector — live per-category counts
 *
 * Each widget fails gracefully on its own (empty state or silent skip)
 * so one broken data source never takes down the rest of the column.
 */
export const Sidebar: React.FC<SidebarProps> = ({ items, onOpenStory, onSelectCategory, onNavigateCommunity }) => {
  return (
    <aside className="side-col" aria-label="Sidebar">
      <AdWidget />
      <CommunityWidget onNavigateCommunity={onNavigateCommunity} />
      <TrendingWidget items={items} onOpenStory={onOpenStory} />
      <SectorWidget items={items} onSelectCategory={onSelectCategory} />
    </aside>
  );
};

// ---------------------------------------------------------------------------
// 1. Advertisement
// ---------------------------------------------------------------------------

interface AdCreative {
  id: string;
  sponsor?: string;
  title: string;
  description?: string;
  imageUrl?: string;
  href: string;
  cta?: string;
}

const AdWidget: React.FC = () => {
  const [ads, setAds] = useState<AdCreative[]>((initialAds as { ads: AdCreative[] }).ads || []);

  // Re-fetched at runtime, same as /data/news.json — so new ad creative can
  // be posted by editing public/data/ads.json and redeploying, without
  // touching any component code.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const base = (import.meta.env.BASE_URL || './').replace(/\/$/, '');
        const res = await fetch(`${base}/data/ads.json?t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && Array.isArray(data?.ads)) {
            setAds(data.ads);
          }
        }
      } catch (err) {
        console.warn('Could not fetch dynamic ads.json, using bundled ads:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (ads.length === 0) return null;

  return (
    <div className="widget-box ad-widget">
      <span className="widget-label">Advertisement</span>
      <div className="ad-stack">
        {ads.map((ad) => (
          <a key={ad.id} className="ad-card" href={ad.href} target="_blank" rel="noopener noreferrer sponsored">
            {ad.imageUrl ? (
              <img className="ad-card-img" src={ad.imageUrl} alt="" loading="lazy" />
            ) : null}
            {ad.sponsor && <span className="ad-card-sponsor">{ad.sponsor}</span>}
            <h4 className="ad-card-title">{ad.title}</h4>
            {ad.description && <p className="ad-card-desc">{ad.description}</p>}
            <span className="ad-card-cta">
              {ad.cta || 'Learn more'} <ArrowRight size={13} />
            </span>
          </a>
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 2. Community preview — a real snapshot of CommunityHub, not a mockup
// ---------------------------------------------------------------------------

const CommunityWidget: React.FC<{ onNavigateCommunity: () => void }> = ({ onNavigateCommunity }) => {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchAllPosts(4).then((data) => {
      if (!cancelled) {
        setPosts(data);
        setHasLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const voiceCount = useMemo(() => new Set(posts.map((p) => p.authorUsername)).size, [posts]);

  return (
    <div className="widget-box">
      <h3 className="widget-title">
        <Users size={16} /> From the Community
      </h3>

      {!hasLoaded ? (
        <p className="widget-muted">Loading recent posts…</p>
      ) : posts.length === 0 ? (
        <p className="widget-muted">No posts yet — be the first to share something.</p>
      ) : (
        <ul className="community-preview-list">
          {posts.slice(0, 3).map((post) => (
            <li key={post.id}>
              <button type="button" className="community-preview-item" onClick={onNavigateCommunity}>
                <span className="community-avatar" aria-hidden="true">
                  {(post.authorName || post.authorUsername || '?').charAt(0).toUpperCase()}
                </span>
                <span className="community-preview-text">
                  <span className="community-preview-title">{post.title}</span>
                  <small>
                    @{post.authorUsername} · {formatAgo(post.createdAt)}
                  </small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button type="button" className="btn-outline widget-cta" onClick={onNavigateCommunity}>
        <MessageSquarePlus size={14} />
        {posts.length > 0 ? `Join ${voiceCount > 1 ? `${voiceCount} voices` : 'the conversation'}` : 'Visit the Community'}
      </button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 3. Trending Now — freshest stories across every sector, not just the one
//    currently being browsed
// ---------------------------------------------------------------------------

const TrendingWidget: React.FC<{ items: NewsItem[]; onOpenStory: (item: NewsItem) => void }> = ({ items, onOpenStory }) => {
  const trending = useMemo(() => {
    return [...items]
      .filter((i) => i.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);
  }, [items]);

  if (trending.length === 0) return null;

  return (
    <div className="widget-box">
      <h3 className="widget-title">
        <Flame size={16} /> Trending Now
      </h3>
      <ul className="trend-list">
        {trending.map((item) => {
          const catIndex = CATEGORIES.indexOf(item.category as any);
          const hue = catIndex >= 0 ? catIndex * 36 : 210;
          return (
            <li key={item.id}>
              <button type="button" className="trend-list-item" onClick={() => onOpenStory(item)}>
                <span className="trend-dot" style={{ background: `hsl(${hue} 75% 50%)` }} aria-hidden="true" />
                <span className="trend-list-text">
                  {item.title}
                  <small>
                    {item.category} · {formatAgo(item.date)}
                  </small>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 4. Browse by Sector — live per-category counts, click to filter the feed
// ---------------------------------------------------------------------------

const SectorWidget: React.FC<{ items: NewsItem[]; onSelectCategory: (category: string) => void }> = ({ items, onSelectCategory }) => {
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      map.set(item.category, (map.get(item.category) || 0) + 1);
    }
    return map;
  }, [items]);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;
  const totalPages = Math.max(1, Math.ceil(CATEGORIES.length / PAGE_SIZE));

  useEffect(() => {
    setPage((current) => Math.min(Math.max(current, 1), totalPages));
  }, [totalPages]);

  const visibleCategories = CATEGORIES.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="widget-box">
      <h3 className="widget-title">
        <Layers size={16} /> Browse by Sector
      </h3>
      <ul className="trend-list">
        {visibleCategories.map((cat) => (
          <li key={cat}>
            <button type="button" className="trend-list-item" onClick={() => onSelectCategory(cat)}>
              <span className="trend-list-text" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                {cat}
                <small style={{ marginTop: 0 }}>{counts.get(cat) || 0}</small>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {CATEGORIES.length > PAGE_SIZE && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
          <button
            type="button"
            className="btn-outline"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1}
            style={{ opacity: page === 1 ? 0.5 : 1, padding: '6px 10px', fontSize: '0.75rem' }}
          >
            Prev
          </button>
          <span style={{ fontSize: '0.75rem', color: 'var(--fg-muted)', fontWeight: 700 }}>
            {page}/{totalPages}
          </span>
          <button
            type="button"
            className="btn-outline"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page === totalPages}
            style={{ opacity: page === totalPages ? 0.5 : 1, padding: '6px 10px', fontSize: '0.75rem' }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
