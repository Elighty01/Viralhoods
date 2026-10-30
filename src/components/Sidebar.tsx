import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Layers, TrendingUp, Users, Megaphone, Mail } from 'lucide-react';
import { CATEGORIES, type NewsItem, type AdEntry, type AdsData } from '../types';

interface SidebarProps {
  items: NewsItem[];
  onOpenStory: (item: NewsItem) => void;
  onSelectCategory: (category: string) => void;
  onNavigateCommunity: () => void;
  onOpenAdContact: () => void;
}

const SectorWidget: React.FC<{ items: NewsItem[]; onSelectCategory: (category: string) => void }> = ({ items, onSelectCategory }) => {
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      const category = item.category || 'World';
      map.set(category, (map.get(category) || 0) + 1);
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

/** One ad slot — either a data-driven card (image/title/description/CTA) or
 * a raw embed (e.g. a Spotify player) read straight from data/ads.json. */
const AdSlot: React.FC<{ ad: AdEntry }> = ({ ad }) => {
  const embedSrc = ad.embedUrl || (ad.embedHtml ? ad.embedHtml.match(/src=["']([^"']+)["']/i)?.[1] : undefined);
  if (ad.type === 'embed' && embedSrc) {
    return (
      <div style={{ marginBottom: '14px' }}>
        {ad.title && (
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--fg-muted)', marginBottom: '6px' }}>{ad.title}</div>
        )}
        <iframe
          data-testid="embed-iframe"
          title={ad.title || 'Advertisement'}
          style={{ borderRadius: '12px', display: 'block', border: 'none' }}
          src={embedSrc}
          width="100%"
          height={ad.embedHeight || 352}
          frameBorder={0}
          allowFullScreen
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <a
      href={ad.href || '#'}
      target={ad.href?.startsWith('mailto:') ? undefined : '_blank'}
      rel="noopener noreferrer"
      style={{
        display: 'block',
        marginBottom: '14px',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      {ad.imageUrl && (
        <img src={ad.imageUrl} alt={ad.title || ad.sponsor || 'Advertisement'} style={{ width: '100%', display: 'block', maxHeight: '140px', objectFit: 'cover' }} loading="lazy" />
      )}
      <div style={{ padding: '10px 12px' }}>
        {ad.sponsor && (
          <div style={{ fontSize: '0.66rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: '4px' }}>
            {ad.sponsor}
          </div>
        )}
        {ad.title && <div style={{ fontSize: '0.86rem', fontWeight: 700, marginBottom: '4px' }}>{ad.title}</div>}
        {ad.description && <div style={{ fontSize: '0.78rem', color: 'var(--fg-muted)', marginBottom: '6px' }}>{ad.description}</div>}
        {ad.cta && (
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--blue)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            {ad.cta} <ArrowUpRight size={12} />
          </span>
        )}
      </div>
    </a>
  );
};

const AdvertisementWidget: React.FC<{ onOpenAdContact: () => void }> = ({ onOpenAdContact }) => {
  const [ads, setAds] = useState<AdEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    const base = (import.meta.env.BASE_URL || './').replace(/\/$/, '');
    fetch(`${base}/data/ads.json?t=${Date.now()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: AdsData | null) => {
        if (!cancelled && data?.ads) setAds(data.ads);
      })
      .catch(() => {
        /* no ads configured yet — the widget still renders the Contact card below */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="widget-box">
      <h3 className="widget-title">
        <Megaphone size={16} /> Advertisement
      </h3>

      {ads.map((ad) => (
        <AdSlot key={ad.id} ad={ad} />
      ))}

      {/* The "extra column" for advertiser outreach — always present, even
          with no ads.json entries yet. */}
      <div
        style={{
          border: '1px dashed var(--line-strong)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 14px',
          textAlign: 'center',
        }}
      >
        <Mail size={18} color="var(--blue)" style={{ marginBottom: '6px' }} />
        <div style={{ fontSize: '0.84rem', fontWeight: 700, marginBottom: '2px' }}>Your ad here</div>
        <p style={{ fontSize: '0.76rem', color: 'var(--fg-muted)', margin: '0 0 10px' }}>
          Put your brand in front of Viralhoods readers.
        </p>
        <button type="button" className="btn-outline" onClick={onOpenAdContact} style={{ width: '100%', padding: '8px', fontSize: '0.8rem' }}>
          Contact Us for Ads
        </button>
      </div>
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ items, onOpenStory, onSelectCategory, onNavigateCommunity, onOpenAdContact }) => {
  const trendingStories = useMemo(() => {
    return [...items]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 4);
  }, [items]);

  return (
    <aside className="side-col">
      <AdvertisementWidget onOpenAdContact={onOpenAdContact} />

      <div className="widget-box">
        <h3 className="widget-title">
          <TrendingUp size={16} /> Trending Now
        </h3>
        <ul className="trend-list">
          {trendingStories.map((item) => (
            <li key={item.id}>
              <button type="button" className="trend-list-item" onClick={() => onOpenStory(item)}>
                <span className="trend-list-text">{item.title}</span>
                <span className="trend-list-meta">{item.category}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="widget-box">
        <h3 className="widget-title">
          <Users size={16} /> From the Community
        </h3>
        <button
          type="button"
          className="community-link"
          onClick={onNavigateCommunity}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            background: 'transparent',
            border: 'none',
            padding: 0,
            color: 'var(--fg)',
            cursor: 'pointer',
          }}
        >
          <span>Join the discussion</span>
          <ArrowUpRight size={14} />
        </button>
      </div>

      <SectorWidget items={items} onSelectCategory={onSelectCategory} />
    </aside>
  );
};

export default Sidebar;
