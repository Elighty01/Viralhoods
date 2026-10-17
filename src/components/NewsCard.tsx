import React, { useState, useMemo } from 'react';
import { NewsItem, CATEGORIES } from '../types';
import { Bookmark, ArrowRight, Clock } from 'lucide-react';
import { sanitizeHtmlText } from '../utils/sanitize';

interface NewsCardProps {
  item: NewsItem;
  lead?: boolean;
  isBookmarked: boolean;
  onToggleBookmark: (id: string, e: React.MouseEvent) => void;
  onOpenStory: (item: NewsItem) => void;
}

export const formatAgo = (dateStr: string): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const minutes = (Date.now() - d.getTime()) / 60000;
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${Math.max(1, Math.floor(minutes))}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
};

export const NewsCard: React.FC<NewsCardProps> = ({
  item,
  lead = false,
  isBookmarked,
  onToggleBookmark,
  onOpenStory,
}) => {
  const [imageError, setImageError] = useState(false);

  const catIndex = CATEGORIES.indexOf(item.category as any);
  const hue = catIndex >= 0 ? catIndex * 36 : 210;

  const style = {
    '--h': `${hue}`,
  } as React.CSSProperties;

  const fallbackBackground = `linear-gradient(135deg, hsl(${hue} 75% 45%), hsl(${hue + 45} 85% 30%))`;

  // Dynamically calculate reading time based on total word count
  const { readTime, wordCount } = useMemo(() => {
    const textParts = [
      item.title || '',
      item.summary || '',
      ...(item.keyTakeaways || []),
      ...(item.content || []),
    ];
    const words = textParts.join(' ').trim().split(/\s+/).filter(Boolean).length;
    // Default assumption if content is not yet pre-expanded: estimate 450 words
    const estimatedWords = words > 60 ? words : 480;
    const mins = Math.max(1, Math.round(estimatedWords / 200));
    return {
      readTime: `${mins} min read`,
      wordCount: estimatedWords,
    };
  }, [item]);

  const authorByline = item.author || `Viralhoods ${item.category} Desk`;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onOpenStory(item);
  };

  return (
    <article
      className={lead ? 'lead-card' : 'news-card'}
      style={style}
      onClick={handleClick}
      tabIndex={0}
      role="button"
      aria-label={`Read story: ${item.title}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenStory(item);
        }
      }}
    >
      <div className="card-media-wrapper">
        {item.image && !imageError ? (
          <img
            className="card-img"
            loading="lazy"
            alt={item.title}
            src={item.image}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="card-gradient-fallback" style={{ background: fallbackBackground }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <img
                src="/logo.svg"
                alt="Viralhoods Real Logo"
                style={{ width: '48px', height: '34px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
              />
              <span style={{ fontSize: '1rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {item.category}
              </span>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleBookmark(item.id, e);
          }}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: 'rgba(0, 0, 0, 0.55)',
            border: 'none',
            color: isBookmarked ? 'var(--sun)' : '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backdropFilter: 'blur(4px)',
            transition: 'transform 0.15s ease',
          }}
          title={isBookmarked ? 'Remove bookmark' : 'Bookmark story'}
          aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark story'}
        >
          <Bookmark size={16} fill={isBookmarked ? 'var(--sun)' : 'none'} />
        </button>
      </div>

      <div className="card-body">
        <div className="card-kicker">
          <span className="category-name">{item.category}</span>
          <span aria-hidden="true">·</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <Clock size={12} /> {readTime}
          </span>
        </div>

        {lead ? <h2>{sanitizeHtmlText(item.title)}</h2> : <h3>{sanitizeHtmlText(item.title)}</h3>}

        <p className="card-summary">{sanitizeHtmlText(item.summary)}</p>

        <div className="card-footer-meta">
          <span>
            {authorByline} · {formatAgo(item.date)}
          </span>
          <span className="read-action-link">
            Read story <ArrowRight size={14} />
          </span>
        </div>
      </div>
    </article>
  );
};
