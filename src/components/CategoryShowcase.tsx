import React, { useMemo } from 'react';
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

  return (
    <section className="category-showcase" aria-label="Browse by sector">
      <div className="category-showcase-head">
        <h2>What We Cover</h2>
        <p>Ten sectors, refreshed continuously — pick one or scroll on for everything at once.</p>
      </div>

      <div className="category-showcase-grid">
        {CATEGORIES.map((cat, i) => {
          const Icon = SECTOR_ICONS[cat] || Globe;
          const hue = i * 36;
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
    </section>
  );
};
