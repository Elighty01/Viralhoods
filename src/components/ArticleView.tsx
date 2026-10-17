import React, { useState, useEffect, useMemo } from 'react';
import { NewsItem } from '../types';
import { enrichStoryWithFullContent } from '../utils/articleGenerator';
import { formatAgo } from './NewsCard';
import {
  ArrowLeft,
  Bookmark,
  Share2,
  Volume2,
  VolumeX,
  Check,
  Sparkles,
  Layers,
  Clock,
  Compass,
  BookOpen,
  Gauge,
} from 'lucide-react';
import { SocialShareBar } from './SocialShareBar';

interface ArticleViewProps {
  story: NewsItem;
  allStories: NewsItem[];
  isBookmarked: boolean;
  onToggleBookmark: (id: string, e: React.MouseEvent) => void;
  onBack: () => void;
  onOpenStory: (item: NewsItem) => void;
  onSubscribe: (email: string) => void;
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

export const ArticleView: React.FC<ArticleViewProps> = ({
  story,
  allStories,
  isBookmarked,
  onToggleBookmark,
  onBack,
  onOpenStory,
  onSubscribe,
}) => {
  const [enrichedStory, setEnrichedStory] = useState<NewsItem>(() =>
    enrichStoryWithFullContent(story)
  );
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribedToast, setSubscribedToast] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Update enriched story on prop change
  useEffect(() => {
    setEnrichedStory(enrichStoryWithFullContent(story));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setImageError(false);
  }, [story]);

  // Clean up any web speech synthesis on unmount or story change
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [story]);

  // Calculate dynamic reading metrics based on exact word count
  const readingMetrics = useMemo(() => {
    return calculateStoryReadingMetrics(enrichedStory);
  }, [enrichedStory]);

  // Reading scroll progress tracker
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = Math.min(100, Math.max(0, (window.scrollY / totalHeight) * 100));
        setScrollProgress(progress);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleShare = async () => {
    const url = `${window.location.origin}${window.location.pathname}#story-${story.id}`;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleToggleSpeech = () => {
    if (!('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const textToRead = `${enrichedStory.title}. ${enrichedStory.summary}. Key Takeaways: ${enrichedStory.keyTakeaways?.join('. ')}. ${enrichedStory.content?.slice(0, 2).join(' ')}`;
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.rate = 1.0;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const handleInlineSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes('@')) return;
    onSubscribe(newsletterEmail);
    setNewsletterEmail('');
    setSubscribedToast(true);
    setTimeout(() => setSubscribedToast(false), 3000);
  };

  // Find related stories from same sector (excluding this one)
  const relatedStories = allStories
    .filter((s) => s.id !== story.id && s.category === story.category)
    .slice(0, 3);

  const fallbackBackground = `linear-gradient(135deg, hsl(200 80% 45%), hsl(255 85% 30%))`;

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

        <article>
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
            </div>

            <h1 className="article-title">{enrichedStory.title}</h1>

            <p className="article-summary-lead">{enrichedStory.summary}</p>

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
                    src="/logo.svg"
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
                    onClick={handleToggleSpeech}
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
                  src="/logo.svg"
                  alt="Viralhoods Real Logo"
                  style={{ width: '120px', height: '86px', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}
                />
                <span style={{ fontSize: '1.4rem', fontWeight: 800 }}>Viralhoods Sector Report</span>
              </div>
            )}
          </div>

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
              <p key={index}>{paragraph}</p>
            ))}
          </div>

          {/* Editorial Section: Why It Matters */}
          {enrichedStory.whyItMatters && (
            <div className="editorial-section">
              <h4>
                <Layers size={18} style={{ display: 'inline', verticalAlign: '-3px', marginRight: '6px' }} />
                Why It Matters
              </h4>
              <p>{enrichedStory.whyItMatters}</p>
            </div>
          )}

          {/* Editorial Section: What's Next */}
          {enrichedStory.whatNext && (
            <div className="editorial-section">
              <h4>
                <Compass size={18} style={{ display: 'inline', verticalAlign: '-3px', marginRight: '6px' }} />
                What's Next
              </h4>
              <p>{enrichedStory.whatNext}</p>
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

          {/* In-Article Newsletter Signup */}
          <div className="newsletter-banner" style={{ margin: '40px 0 30px' }}>
            <div className="newsletter-content">
              <h3>Stay ahead with the Viralhoods Daily</h3>
              <p>
                Get concise, high-impact syntheses of global shifts in your inbox every morning. No spam, ever.
              </p>
            </div>
            <form className="newsletter-form" onSubmit={handleInlineSubscribe}>
              <input
                type="email"
                placeholder="Enter your email"
                required
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
              />
              <button type="submit">Subscribe</button>
            </form>
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

          {/* Related Internal Stories */}
          {relatedStories.length > 0 && (
            <div style={{ marginTop: '40px', paddingTop: '28px', borderTop: '1px solid var(--line)' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '16px' }}>
                More from Viralhoods {enrichedStory.category}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {relatedStories.map((rel) => (
                  <div
                    key={rel.id}
                    onClick={() => onOpenStory(rel)}
                    style={{
                      padding: '14px 18px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--line)',
                      background: 'var(--bg-subtle)',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s ease',
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', color: 'var(--blue)', fontWeight: 700, marginBottom: '4px' }}>
                      {rel.category} · {formatAgo(rel.date)}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--fg)' }}>
                      {rel.title}
                    </div>
                    <div style={{ fontSize: '0.88rem', color: 'var(--fg-muted)', marginTop: '4px' }}>
                      {rel.summary.slice(0, 140)}...
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </article>
      </main>
    </>
  );
};
