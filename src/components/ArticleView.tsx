import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { NewsItem, CATEGORIES } from '../types';
import { enrichStoryWithFullContent } from '../utils/articleGenerator';
import { sanitizeHtmlText } from '../utils/sanitize';
import { formatAgo } from './NewsCard';
import { trackPageVisit } from '../utils/analytics';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Volume2,
  VolumeX,
  Sparkles,
  Layers,
  Clock,
  Compass,
  BookOpen,
  Gauge,
  Play,
  Video,
  ExternalLink,
  PartyPopper,
} from 'lucide-react';
import { SocialShareBar } from './SocialShareBar';
import { NewsletterBanner } from './NewsletterBanner';

interface ArticleViewProps {
  story: NewsItem;
  allStories: NewsItem[];
  bookmarks: string[];
  onToggleBookmark: (id: string, e: React.MouseEvent) => void;
  onBack: () => void;
  onSubscribe: (email: string) => Promise<boolean> | boolean | void;
}

/**
 * Calculates estimated reading time and word count dynamically
 * based on the full text content of an article (200 words per minute average reading speed).
 */
export const calculateStoryReadingMetrics = (item: NewsItem) => {
  const textParts = [
    item.title || '',
    item.summary || '',
    ...(item.keyTakeaways || []),
    ...(item.content || []),
    item.whyItMatters || '',
    item.whatNext || '',
  ];
  const combined = textParts.join(' ').trim();
  const words = combined ? combined.split(/\s+/).filter(Boolean).length : 0;

  const wordsPerMinute = 200;
  const rawMinutes = words / wordsPerMinute;
  const minutes = Math.max(1, Math.round(rawMinutes));
  const seconds = Math.round(rawMinutes * 60);

  return {
    wordCount: words,
    minutes,
    seconds,
    readTimeLabel: `${minutes} min read`,
    statsLabel: `${words} words · ~${minutes} min read`,
  };
};

export const getYouTubeId = (url?: string): string | null => {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/i);
  return match ? match[1] : null;
};

export const renderParagraphWithLinks = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s<)"]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: 'var(--blue)',
            textDecoration: 'underline',
            fontWeight: 600,
            wordBreak: 'break-all',
          }}
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

// Picks the next story to auto-load in the continuous reading scroll:
// prefer the same sector (catalog order, which is newest-first within a
// sector — see data/news.json), then fall back to any other unseen story.
// Returns null once nothing is left to show.
const pickNextStory = (currentCategory: string, allStories: NewsItem[], seenIds: Set<string>): NewsItem | null => {
  const sameCategory = allStories.find((s) => s.category === currentCategory && !seenIds.has(s.id));
  if (sameCategory) return sameCategory;
  return allStories.find((s) => !seenIds.has(s.id)) || null;
};

const UpNextDivider: React.FC<{ category: string }> = ({ category }) => (
  <div className="up-next-divider" aria-hidden="true">
    <span>Up Next in {category}</span>
  </div>
);

interface ArticleBlockProps {
  story: NewsItem;
  isBookmarked: boolean;
  onToggleBookmark: (id: string, e: React.MouseEvent) => void;
  isSpeaking: boolean;
  onToggleSpeech: () => void;
  registerNode: (id: string, el: HTMLElement | null) => void;
  showNewsletter: boolean;
  onSubscribe: (email: string) => Promise<boolean> | boolean | void;
}

/** Renders one full story's reading content — header, media, body, and the
 * editorial sections. One of these is mounted per story in the continuous
 * scroll stack managed by ArticleView below; each instance owns only the
 * bits that are genuinely per-article (image-load state, the newsletter
 * "subscribed" toast). Shared, cross-article state (which story is being
 * read aloud, the stack itself) is lifted to the parent. */
const ArticleBlock: React.FC<ArticleBlockProps> = ({
  story,
  isBookmarked,
  onToggleBookmark,
  isSpeaking,
  onToggleSpeech,
  registerNode,
  showNewsletter,
  onSubscribe,
}) => {
  const [imageError, setImageError] = useState(false);
  const [subscribedToast, setSubscribedToast] = useState(false);

  // `story` is stable for this block's whole lifetime — continuous scroll
  // mounts a fresh ArticleBlock (keyed by id) per story rather than
  // reusing one instance across stories, so there's no need to re-derive
  // this on a prop-change effect the way a single-story view would.
  const enrichedStory = useMemo(() => enrichStoryWithFullContent(story), [story]);
  const readingMetrics = useMemo(() => calculateStoryReadingMetrics(enrichedStory), [enrichedStory]);

  const setNodeRef = useCallback((el: HTMLElement | null) => registerNode(story.id, el), [registerNode, story.id]);

  const catIndex = CATEGORIES.indexOf(story.category as (typeof CATEGORIES)[number]);
  const hue = catIndex >= 0 ? catIndex * 36 : 210;
  const fallbackBackground = `linear-gradient(135deg, hsl(${hue} 75% 45%), hsl(${hue + 45} 85% 30%))`;

  return (
    <article ref={setNodeRef} data-story-id={story.id}>
      <header className="article-header">
        {/* Meta Row with Calculated Reading Time & Word Count */}
        <div className="article-kicker-row">
          <span
            style={{
              color: 'var(--blue)',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              fontSize: '0.84rem',
            }}
          >
            {enrichedStory.category}
          </span>
          <span aria-hidden="true">·</span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              color: 'var(--fg)',
              fontWeight: 600,
            }}
            title={`Calculated from ${readingMetrics.wordCount} words at 200 words/minute`}
          >
            <Clock size={14} style={{ color: 'var(--blue)' }} />
            <strong>{readingMetrics.readTimeLabel}</strong>
            <span style={{ color: 'var(--fg-muted)' }}>({readingMetrics.wordCount} words)</span>
          </span>
          <span aria-hidden="true">·</span>
          <span>Published {formatAgo(enrichedStory.date)}</span>
          {(enrichedStory.videoUrl || enrichedStory.hasVideo) && (
            <>
              <span aria-hidden="true">·</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: '#ef4444',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                }}
              >
                <Video size={13} /> Video Coverage
              </span>
            </>
          )}
        </div>

        <h1 className="article-title">{sanitizeHtmlText(enrichedStory.title)}</h1>

        <p className="article-summary-lead">{sanitizeHtmlText(enrichedStory.summary)}</p>

        {/* Reading Estimation Card / Metrics Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '10px 16px',
            background: 'var(--bg-subtle)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.84rem',
            color: 'var(--fg-muted)',
            marginBottom: '20px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <BookOpen size={15} style={{ color: 'var(--blue)' }} />
            <span>
              Estimated Read Time: <strong style={{ color: 'var(--fg)' }}>{readingMetrics.minutes} minute{readingMetrics.minutes === 1 ? '' : 's'}</strong>
            </span>
          </div>
          <span aria-hidden="true">·</span>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Gauge size={15} style={{ color: 'var(--sun)' }} />
            <span>
              Length: <strong style={{ color: 'var(--fg)' }}>{readingMetrics.wordCount} words</strong> (at standard ~200 wpm)
            </span>
          </div>
        </div>

        <div className="article-byline-bar">
          <div className="author-info">
            {/* Real Tablet Logo Used as Author Avatar */}
            <div
              className="author-avatar"
              style={{
                background: 'transparent',
                border: '1px solid var(--line)',
                overflow: 'hidden',
                padding: '2px',
              }}
            >
              <img
                src={`${import.meta.env.BASE_URL}logo.svg`}
                alt="Viralhoods Real Logo"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <div className="author-text">
              <div className="author-name">{enrichedStory.author || 'Viralhoods Editorial Desk'}</div>
              <div style={{ color: 'var(--fg-muted)', fontSize: '0.8rem' }}>
                Original Reporting & Synthesis · Verified by Viralhoods
              </div>
            </div>
          </div>

          <div className="article-actions">
            {'speechSynthesis' in window && (
              <button
                type="button"
                className="icon-btn"
                onClick={onToggleSpeech}
                title={isSpeaking ? 'Stop audio' : 'Listen to story'}
              >
                {isSpeaking ? (
                  <>
                    <VolumeX size={15} style={{ color: '#ef4444' }} /> Stop Audio
                  </>
                ) : (
                  <>
                    <Volume2 size={15} /> Listen ({readingMetrics.minutes}m)
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              className="icon-btn"
              onClick={(e) => onToggleBookmark(story.id, e)}
              title={isBookmarked ? 'Bookmarked' : 'Bookmark story'}
            >
              <Bookmark
                size={15}
                fill={isBookmarked ? 'var(--sun)' : 'none'}
                color={isBookmarked ? 'var(--sun)' : 'currentColor'}
              />
              {isBookmarked ? 'Saved' : 'Save'}
            </button>

            <SocialShareBar
              title={enrichedStory.title}
              storyId={story.id}
              category={enrichedStory.category}
              summary={enrichedStory.summary}
              variant="compact"
            />
          </div>
        </div>
      </header>

      {/* Featured Media */}
      <div className="article-media-hero">
        {enrichedStory.image && !imageError ? (
          <img
            src={enrichedStory.image}
            alt={enrichedStory.title}
            onError={() => setImageError(true)}
          />
        ) : (
          <div
            style={{
              height: '320px',
              background: fallbackBackground,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              gap: '12px',
              padding: '20px',
              textAlign: 'center',
            }}
          >
            <img
              src={`${import.meta.env.BASE_URL}logo.svg`}
              alt="Viralhoods Real Logo"
              style={{ width: '120px', height: '86px', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}
            />
            <span style={{ fontSize: '1.4rem', fontWeight: 800 }}>Viralhoods Sector Report</span>
          </div>
        )}
      </div>

      {/* Video Player / Embed Section if Story Contains Video */}
      {enrichedStory.videoUrl && (
        <div
          className="article-video-container"
          style={{
            margin: '24px 0 28px',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            background: 'var(--bg-subtle)',
            border: '1px solid var(--line)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              background: 'var(--bg)',
              borderBottom: '1px solid var(--line)',
              fontSize: '0.88rem',
              fontWeight: 700,
            }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
              <Play size={16} fill="#ef4444" />
              <span style={{ color: 'var(--fg)' }}>Video Coverage & Multimedia Evidence</span>
            </div>
            <a
              href={enrichedStory.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                color: 'var(--blue)',
                fontSize: '0.82rem',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Source Video <ExternalLink size={13} />
            </a>
          </div>

          {getYouTubeId(enrichedStory.videoUrl) ? (
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden' }}>
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${getYouTubeId(enrichedStory.videoUrl)}?rel=0`}
                title={enrichedStory.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 0,
                }}
              />
            </div>
          ) : enrichedStory.videoUrl.match(/\.(mp4|webm|m3u8)(\?|$)/i) ? (
            <video
              controls
              src={enrichedStory.videoUrl}
              style={{ width: '100%', maxHeight: '480px', background: '#000' }}
            />
          ) : (
            <div
              style={{
                padding: '24px 20px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                background: 'var(--bg-subtle)',
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Play size={24} fill="#ef4444" />
              </div>
              <div>
                <h4 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 700 }}>
                  Official Video Attached
                </h4>
                <p style={{ margin: 0, color: 'var(--fg-muted)', fontSize: '0.88rem' }}>
                  Verified multimedia broadcast is linked to this story.
                </p>
              </div>
              <a
                href={enrichedStory.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  background: '#ef4444',
                  color: '#ffffff',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  marginTop: '4px',
                }}
              >
                <Play size={16} fill="white" /> Watch Video On Source Platform <ExternalLink size={14} />
              </a>
            </div>
          )}
        </div>
      )}

      {/* Key Takeaways Callout */}
      {enrichedStory.keyTakeaways && enrichedStory.keyTakeaways.length > 0 && (
        <div className="takeaways-box">
          <h4>
            <Sparkles size={18} style={{ color: 'var(--sun)' }} />
            Executive Takeaways
          </h4>
          <ul className="takeaways-list">
            {enrichedStory.keyTakeaways.map((takeaway, idx) => (
              <li key={idx}>{takeaway}</li>
            ))}
          </ul>
        </div>
      )}

      {/* In-Depth Article Content */}
      <div className="article-body">
        {enrichedStory.content?.map((paragraph, index) => (
          <p key={index}>{renderParagraphWithLinks(sanitizeHtmlText(paragraph))}</p>
        ))}
      </div>

      {/* Editorial Section: Why It Matters */}
      {enrichedStory.whyItMatters && (
        <div className="editorial-section">
          <h4>
            <Layers size={18} style={{ display: 'inline', verticalAlign: '-3px', marginRight: '6px' }} />
            Why It Matters
          </h4>
          <p>{sanitizeHtmlText(enrichedStory.whyItMatters)}</p>
        </div>
      )}

      {/* Editorial Section: What's Next */}
      {enrichedStory.whatNext && (
        <div className="editorial-section">
          <h4>
            <Compass size={18} style={{ display: 'inline', verticalAlign: '-3px', marginRight: '6px' }} />
            What's Next
          </h4>
          <p>{sanitizeHtmlText(enrichedStory.whatNext)}</p>
        </div>
      )}

      {/* Social Media Sharing Component */}
      <SocialShareBar
        title={enrichedStory.title}
        storyId={story.id}
        category={enrichedStory.category}
        summary={enrichedStory.summary}
        variant="full"
      />

      {showNewsletter && (
        <>
          {/* In-Article Newsletter Banner */}
          <div style={{ margin: '40px 0 30px' }}>
            <NewsletterBanner
              onSubscribe={(email) => {
                onSubscribe(email);
                setSubscribedToast(true);
                setTimeout(() => setSubscribedToast(false), 4000);
                return true;
              }}
            />
          </div>

          {subscribedToast && (
            <div
              style={{
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                background: '#dcfce7',
                color: '#15803d',
                fontWeight: 700,
                textAlign: 'center',
                marginBottom: '24px',
              }}
            >
              Thank you! You are now subscribed to the Viralhoods Daily Briefing.
            </div>
          )}
        </>
      )}
    </article>
  );
};

export const ArticleView: React.FC<ArticleViewProps> = ({
  story,
  allStories,
  bookmarks,
  onToggleBookmark,
  onBack,
  onSubscribe,
}) => {
  const [loadedStories, setLoadedStories] = useState<NewsItem[]>([story]);
  const [activeStoryId, setActiveStoryId] = useState<string>(story.id);
  const [isSpeakingId, setIsSpeakingId] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  const trackedIdsRef = useRef<Set<string>>(new Set([story.id]));
  const blockNodesRef = useRef<Map<string, HTMLElement>>(new Map());
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // A fresh navigation (feed click, hash link, browser back/forward)
  // resets the whole stack back to just the one requested story. Our own
  // continuous-scroll appends never change this `story` prop — see the
  // history.replaceState effect below — so this only fires on a genuine
  // "go to a different story" action.
  useEffect(() => {
    setLoadedStories([story]);
    setActiveStoryId(story.id);
    trackedIdsRef.current = new Set([story.id]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [story]);

  // Stop any in-progress read-aloud when leaving the article view entirely.
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  // Overall reading-progress bar across everything loaded so far, rAF-
  // throttled so a long continuous-scroll session doesn't re-render the
  // whole stack on every single scroll-event tick.
  useEffect(() => {
    let ticking = false;
    const update = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(totalHeight > 0 ? Math.min(100, Math.max(0, (window.scrollY / totalHeight) * 100)) : 0);
      ticking = false;
    };
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    update();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const lastStory = loadedStories[loadedStories.length - 1];
  const nextStory = useMemo(
    () => pickNextStory(lastStory.category, allStories, trackedIdsRef.current),
    [lastStory, allStories, loadedStories.length]
  );

  // Explicit Story Continuation Handlers (Next Button)
  const handleLoadNextStory = (targetStory: NewsItem) => {
    trackedIdsRef.current.add(targetStory.id);
    window.location.hash = `story-${targetStory.id}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAppendStory = (targetStory: NewsItem) => {
    trackedIdsRef.current.add(targetStory.id);
    setLoadedStories((prev) => (prev.some((s) => s.id === targetStory.id) ? prev : [...prev, targetStory]));
    setTimeout(() => {
      const el = blockNodesRef.current.get(targetStory.id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  // Scrollspy: whichever loaded story currently sits in the vertical
  // center of the viewport becomes the "active" one.
  useEffect(() => {
    const nodes = loadedStories.map((s) => blockNodesRef.current.get(s.id)).filter((n): n is HTMLElement => !!n);
    if (nodes.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-story-id');
            if (id) setActiveStoryId((cur) => (cur === id ? cur : id));
          }
        });
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [loadedStories]);

  // Reflect the active story in the URL/tab title + analytics for
  // everything after the first — App.tsx already tracks the first story on
  // initial load, so this only fires for stories reached by scrolling.
  // history.replaceState (not a hash assignment) deliberately does NOT
  // fire `hashchange`, so this never disturbs App.tsx's own navigation
  // state or resets the stack above.
  useEffect(() => {
    if (activeStoryId === story.id) return;
    const active = loadedStories.find((s) => s.id === activeStoryId);
    if (!active) return;
    try {
      window.history.replaceState(null, '', `#story-${activeStoryId}`);
    } catch {
      /* ignore */
    }
    document.title = `${active.title} | Viralhoods`;
    trackPageVisit(`Story: ${active.title}`, `#story-${activeStoryId}`, {
      storyId: activeStoryId,
      storyTitle: active.title,
      category: active.category,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the id should trigger this, not loadedStories/story identity churn
  }, [activeStoryId]);

  const registerBlockNode = useCallback((id: string, el: HTMLElement | null) => {
    if (el) blockNodesRef.current.set(id, el);
    else blockNodesRef.current.delete(id);
  }, []);

  const handleToggleSpeechFor = useCallback((target: NewsItem) => {
    if (!('speechSynthesis' in window)) return;
    if (isSpeakingId === target.id) {
      window.speechSynthesis.cancel();
      setIsSpeakingId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const enriched = enrichStoryWithFullContent(target);
    const textToRead = `${enriched.title}. ${enriched.summary}. Key Takeaways: ${enriched.keyTakeaways?.join('. ')}. ${enriched.content?.slice(0, 2).join(' ')}`;
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.rate = 1.0;
    utterance.onend = () => setIsSpeakingId((cur) => (cur === target.id ? null : cur));
    utterance.onerror = () => setIsSpeakingId((cur) => (cur === target.id ? null : cur));
    window.speechSynthesis.speak(utterance);
    setIsSpeakingId(target.id);
  }, [isSpeakingId]);

  return (
    <>
      {/* Scroll Reading Progress Bar at the top of the viewport */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: `${scrollProgress}%`,
          height: '3.5px',
          background: 'linear-gradient(90deg, var(--blue), var(--sun))',
          zIndex: 100,
          transition: 'width 0.1s ease-out',
        }}
        aria-hidden="true"
      />

      <main className="w article-view">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={16} /> Back to Trending Stories
        </button>

        {loadedStories.map((s, index) => (
          <React.Fragment key={s.id}>
            {index > 0 && <UpNextDivider category={s.category} />}
            <ArticleBlock
              story={s}
              isBookmarked={bookmarks.includes(s.id)}
              onToggleBookmark={onToggleBookmark}
              isSpeaking={isSpeakingId === s.id}
              onToggleSpeech={() => handleToggleSpeechFor(s)}
              registerNode={registerBlockNode}
              showNewsletter={index === 0}
              onSubscribe={onSubscribe}
            />
          </React.Fragment>
        ))}

        {nextStory ? (
          <div
            className="story-continuation-card"
            style={{
              margin: '40px 0 30px',
              padding: '28px 32px',
              background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-subtle) 100%)',
              border: '1px solid var(--line-strong)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--card-shadow)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  background: 'var(--blue-tint)',
                  color: 'var(--blue)',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                <Sparkles size={13} style={{ color: 'var(--sun)' }} />
                Story Continuation &bull; Up Next in {nextStory.category}
              </div>
              <span style={{ fontSize: '0.82rem', color: 'var(--fg-muted)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <Clock size={13} style={{ color: 'var(--blue)' }} />
                {calculateStoryReadingMetrics(nextStory).readTimeLabel}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {nextStory.image && (
                <img
                  src={nextStory.image}
                  alt={nextStory.title}
                  style={{
                    width: '140px',
                    height: '90px',
                    objectFit: 'cover',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--line)',
                    flexShrink: 0,
                  }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              <div style={{ flex: 1, minWidth: '240px' }}>
                <h3
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    margin: '0 0 8px',
                    color: 'var(--fg)',
                    lineHeight: 1.35,
                  }}
                >
                  {nextStory.title}
                </h3>
                <p
                  style={{
                    fontSize: '0.9rem',
                    color: 'var(--fg-muted)',
                    margin: 0,
                    lineHeight: 1.5,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {nextStory.summary}
                </p>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                flexWrap: 'wrap',
                marginTop: '6px',
                paddingTop: '18px',
                borderTop: '1px solid var(--line)',
              }}
            >
              <button
                type="button"
                className="btn-primary"
                onClick={() => handleLoadNextStory(nextStory)}
                style={{
                  padding: '12px 24px',
                  fontSize: '0.94rem',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                  cursor: 'pointer',
                }}
              >
                <span>Continue to Next Story</span>
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                className="btn-outline"
                onClick={() => handleAppendStory(nextStory)}
                style={{
                  padding: '12px 18px',
                  fontSize: '0.88rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                title="Append and read directly below this article"
              >
                <BookOpen size={14} /> Read Below
              </button>

              <button
                type="button"
                className="btn-outline"
                onClick={onBack}
                style={{
                  padding: '12px 18px',
                  fontSize: '0.88rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <ArrowLeft size={14} /> Back to Stories
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              textAlign: 'center',
              padding: '48px 24px',
              marginTop: '20px',
              borderTop: '1px solid var(--line)',
            }}
          >
            <PartyPopper size={30} style={{ color: 'var(--sun)' }} />
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '14px 0 8px' }}>You're all caught up</h3>
            <p style={{ color: 'var(--fg-muted)', maxWidth: '420px', margin: '0 auto 20px', lineHeight: 1.5 }}>
              That's every story we've got queued up for you right now — check back soon for more.
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={onBack}
              style={{ maxWidth: '240px', margin: '0 auto', padding: '10px 20px' }}
            >
              Back to Trending Stories
            </button>
          </div>
        )}
      </main>
    </>
  );
};
