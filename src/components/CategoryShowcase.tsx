The error is caused by malformed JSX quoting in the `Next` button block — the escaped quotes were left in the file as `type=\"button\"` instead of proper JSX syntax.

Use this corrected version of `src/components/CategoryShowcase.tsx`:

```tsx name=src/components/CategoryShowcase.tsx
import React, { useMemo, useState, useEffect } from 'react';
import { NewsItem, CATEGORIES } from '../types';
import {
  Globe,
  Landmark,
  TrendingUp,
  HeartPulse,
  Sparkles,
  Microscope,
  Atom,
  Bot,
  Cpu,
  Trophy,
  type LucideIcon,
} from 'lucide-react';

// One icon per sector. Kept in its own map (rather than inline in the
// render) so it's a single obvious place to update if CATEGORIES ever
// changes.
const SECTOR_ICONS: Record<string, LucideIcon> = {
  World: Globe,
  Politics: Landmark,
  Finance: TrendingUp,
  Health: HeartPulse,
  Entertainment: Sparkles,
  Research: Microscope,
  Science: Atom,
  AI: Bot,
  Tech: Cpu,
  Sports: Trophy,
};

interface CategoryShowcaseProps {
  items: NewsItem[];
  onSelectCategory: (category: string) => void;
}

/**
 * A welcoming "what we cover" entry point for first-time readers — one card
 * per sector with a live story count pulled from the actual feed, not a
 * number someone has to remember to update by hand. Shown only on the
 * all-sectors home state (see FeedView); category pages already have the
 * active sector called out in the nav tabs, so repeating this there would
 * just be noise.
 */
export const CategoryShowcase: React.FC<CategoryShowcaseProps> = ({ items, onSelectCategory }) => {
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      map.set(item.category, (map.get(item.category) || 0) + 1);
    }
    return map;
  }, [items]);

  const PAGE_SIZE = 5;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(CATEGORIES.length / PAGE_SIZE));

  useEffect(() => {
    setPage((current) => Math.min(Math.max(current, 1), totalPages));
  }, [totalPages]);

  const visibleCategories = CATEGORIES.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <section className="category-showcase" aria-label="Browse by sector">
      <div className="category-showcase-head">
        <h2>What We Cover</h2>
        <p>Ten sectors, refreshed continuously — pick one or scroll on for everything at once.</p>
      </div>

      <div className="category-showcase-grid">
        {visibleCategories.map((cat, i) => {
          const Icon = SECTOR_ICONS[cat] || Globe;
          const hue = ((page - 1) * PAGE_SIZE + i) * 36;
          const count = counts.get(cat) || 0;
          return (
            <button
              key={cat}
              type="button"
              className="category-showcase-card"
              style={{ '--h': `${hue}` } as React.CSSProperties}
              onClick={() => onSelectCategory(cat)}
            >
              <Icon size={26} strokeWidth={1.8} />
              <span className="category-showcase-name">{cat}</span>
              <span className="category-showcase-count">
                {count} {count === 1 ? 'story' : 'stories'}
              </span>
            </button>
          );
        })}
      </div>

      {CATEGORIES.length > PAGE_SIZE && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
            marginTop: '18px',
          }}
        >
          <button
            type="button"
            className="btn-outline"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1}
            style={{ opacity: page === 1 ? 0.5 : 1 }}
          >
            Prev
          </button>

          <span style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', fontWeight: 700 }}>
            Page {page} of {totalPages}
          </span>

          <button
            type="button"
            className="btn-outline"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page === totalPages}
            style={{ opacity: page === totalPages ? 0.5 : 1 }}
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
};
```

The key fix is: use normal JSX attribute quotes, not escaped quotes.
