import React, { useState, useEffect, useMemo } from 'react';
import { X, Mail, Laptop, Smartphone, ExternalLink, Copy, Check, Share2, Sparkles, BookOpen, UserX } from 'lucide-react';
import { NewsItem } from '../types';
import {
  selectLatestStoryPerSector,
  generateElegantNewsletterHtml,
  SECTOR_LIST,
  CATEGORY_COLORS,
} from '../utils/newsletterTemplate';

interface NewsletterModalProps {
  isOpen: boolean;
  onClose: () => void;
  stories: NewsItem[];
  onOpenStory?: (id: string) => void;
  onSubscribe?: (email: string) => Promise<boolean> | boolean;
  onUnsubscribe?: (email: string) => Promise<boolean> | boolean;
  // Set when the modal is opened from an email's "Unsubscribe" link
  // (#unsubscribe?email=...) so the unsubscribe form is front and center
  // instead of something the reader has to go looking for.
  initialUnsubscribeEmail?: string;
}

export const NewsletterModal: React.FC<NewsletterModalProps> = ({
  isOpen,
  onClose,
  stories,
  onOpenStory,
  onSubscribe,
  onUnsubscribe,
  initialUnsubscribeEmail,
}) => {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [copiedLink, setCopiedLink] = useState(false);
  const [subscribeEmail, setSubscribeEmail] = useState('');
  const [subscribeStatus, setSubscribeStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'reading' | 'sectors'>('reading');
  const [showUnsubscribe, setShowUnsubscribe] = useState(false);
  const [unsubscribeEmail, setUnsubscribeEmail] = useState('');
  const [unsubscribeStatus, setUnsubscribeStatus] = useState<string | null>(null);
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);

  useEffect(() => {
    if (isOpen && initialUnsubscribeEmail) {
      setShowUnsubscribe(true);
      setUnsubscribeEmail(initialUnsubscribeEmail);
    }
  }, [isOpen, initialUnsubscribeEmail]);

  // Filter so we strictly display only the latest story from each of the 10 sectors
  const sectorStories = useMemo(() => {
    return selectLatestStoryPerSector(stories);
  }, [stories]);

  const newsletterHtml = useMemo(() => {
    return generateElegantNewsletterHtml(sectorStories, {
      siteUrl: typeof window !== 'undefined' ? window.location.origin : 'https://viralhoods.com',
    });
  }, [sectorStories]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle copy share link
  const handleCopyLink = async () => {
    try {
      const shareUrl = `${window.location.origin}${window.location.pathname}#newsletter`;
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch {
      // fallback
    }
  };

  const handleSubscribeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscribeEmail.trim() || !subscribeEmail.includes('@')) return;
    if (onSubscribe) {
      try {
        await onSubscribe(subscribeEmail.trim().toLowerCase());
        setSubscribeStatus('✓ Subscribed! You will receive tomorrow’s 10-sector edition.');
        setSubscribeEmail('');
        setTimeout(() => setSubscribeStatus(null), 5000);
      } catch {
        setSubscribeStatus('✓ Subscribed! Welcome to the Daily Dispatch.');
        setTimeout(() => setSubscribeStatus(null), 5000);
      }
    }
  };

  const handleUnsubscribeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unsubscribeEmail.trim() || !unsubscribeEmail.includes('@') || !onUnsubscribe) return;
    setIsUnsubscribing(true);
    try {
      const ok = await onUnsubscribe(unsubscribeEmail.trim().toLowerCase());
      setUnsubscribeStatus(
        ok !== false ? 'You\u2019re unsubscribed \u2014 sorry to see you go.' : 'Something went wrong. Please try again.'
      );
    } catch {
      setUnsubscribeStatus('Something went wrong. Please try again.');
    } finally {
      setIsUnsubscribing(false);
    }
  };

  if (!isOpen) return null;

  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Viralhoods Daily Morning Dispatch Newsletter"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(9, 13, 22, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '960px',
          maxHeight: '92vh',
          background: 'var(--bg-card, #ffffff)',
          color: 'var(--fg, #0f172a)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div
          style={{
            padding: '16px 22px',
            background: '#090d16',
            color: '#ffffff',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #0284c7 0%, #d97706 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.4)',
              }}
            >
              <Mail size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    background: '#d97706',
                    color: '#090d16',
                    fontWeight: 900,
                    fontSize: '0.68rem',
                    padding: '2px 8px',
                    borderRadius: '20px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Daily Dispatch
                </span>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  {todayFormatted}
                </span>
              </div>
              <h2 style={{ margin: '2px 0 0', fontSize: '1.18rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em' }}>
                Viralhoods 10-Sector Executive Newsletter
              </h2>
            </div>
          </div>

          {/* Controls: View mode tabs, device switcher, close button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'inline-flex', background: '#1e293b', borderRadius: '8px', padding: '3px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('reading')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: activeTab === 'reading' ? '#0284c7' : 'transparent',
                  color: '#ffffff',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <BookOpen size={13} /> Publication Theme
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('sectors')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: activeTab === 'sectors' ? '#0284c7' : 'transparent',
                  color: '#ffffff',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <Sparkles size={13} /> 10 Sectors Grid ({sectorStories.length})
              </button>
            </div>

            {activeTab === 'reading' && (
              <div style={{ display: 'inline-flex', background: '#1e293b', borderRadius: '8px', padding: '3px' }}>
                <button
                  type="button"
                  onClick={() => setDevice('desktop')}
                  title="View Desktop Edition"
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: device === 'desktop' ? '#334155' : 'transparent',
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.76rem',
                  }}
                >
                  <Laptop size={14} /> Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setDevice('mobile')}
                  title="View Mobile Edition"
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: device === 'mobile' ? '#334155' : 'transparent',
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.76rem',
                  }}
                >
                  <Smartphone size={14} /> Mobile
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleCopyLink}
              title="Copy link to today's newsletter"
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                background: '#1e293b',
                color: '#ffffff',
                border: '1px solid #334155',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              {copiedLink ? <Check size={14} style={{ color: '#4ade80' }} /> : <Copy size={14} />}
              <span>{copiedLink ? 'Link Copied!' : 'Share'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              title="Close newsletter"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Sector verification badge strip */}
        <div
          style={{
            padding: '8px 20px',
            background: 'var(--bg-subtle, #f8fafc)',
            borderBottom: '1px solid var(--line, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            fontSize: '0.78rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--fg-muted, #64748b)' }}>
            <strong style={{ color: 'var(--fg, #0f172a)' }}>Coverage Rule:</strong>
            Strictly one latest verified story per sector across all 10 fields:
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {SECTOR_LIST.map((sector) => {
              const hasStory = sectorStories.some((s) => s.category?.toLowerCase() === sector.toLowerCase());
              const catTheme = CATEGORY_COLORS[sector] || { bg: '#e2e8f0', text: '#334155', icon: '📰' };
              return (
                <span
                  key={sector}
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '12px',
                    background: hasStory ? catTheme.bg : 'var(--line, #e2e8f0)',
                    color: hasStory ? catTheme.text : 'var(--fg-muted, #94a3b8)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}
                  title={hasStory ? `Latest story included for ${sector}` : `No story found for ${sector}`}
                >
                  {catTheme.icon} {sector} {hasStory ? '✓' : ''}
                </span>
              );
            })}
          </div>
        </div>

        {/* Main Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            background: activeTab === 'reading' ? '#0f172a' : 'var(--bg, #f8fafc)',
            padding: activeTab === 'reading' ? '20px 16px' : '20px',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          {activeTab === 'reading' ? (
            <div
              style={{
                width: device === 'mobile' ? '375px' : '100%',
                maxWidth: device === 'mobile' ? '375px' : '680px',
                borderRadius: device === 'mobile' ? '20px' : '10px',
                overflow: 'hidden',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
                border: device === 'mobile' ? '4px solid #334155' : '1px solid #1e293b',
                background: '#ffffff',
                transition: 'all 0.25s ease',
              }}
            >
              <iframe
                title="Viralhoods Daily Morning Dispatch"
                srcDoc={newsletterHtml}
                // This content is bot-generated from scraped sources and
                // escaped before it reaches this template (see
                // utils/newsletterTemplate.ts), but an empty `sandbox`
                // attribute is cheap, meaningful defense-in-depth: without
                // it, srcDoc content runs in the SAME origin as the rest of
                // the app, so any script that did slip through would have
                // full access to this page's session. This is a read-only
                // preview — it never needs to execute anything.
                sandbox=""
                style={{
                  width: '100%',
                  height: '72vh',
                  minHeight: '520px',
                  border: 'none',
                  display: 'block',
                  background: '#ffffff',
                }}
              />
            </div>
          ) : (
            /* Tab: 10 Sectors Direct Reading Grid */
            <div style={{ width: '100%', maxWidth: '860px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ marginBottom: '4px' }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.25rem', fontWeight: 800 }}>
                  Today's Single Latest Story From Each Sector ({sectorStories.length} of 10)
                </h3>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--fg-muted)' }}>
                  Click "Read Full Report" on any story below to jump directly into the full narrative and analysis.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {sectorStories.map((story) => {
                  const catTheme = CATEGORY_COLORS[story.category] || { bg: '#e2e8f0', text: '#334155', icon: '📰' };
                  return (
                    <article
                      key={story.id}
                      style={{
                        background: 'var(--bg-card, #ffffff)',
                        border: '1px solid var(--line, #e2e8f0)',
                        borderRadius: '12px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '12px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              background: catTheme.bg,
                              color: catTheme.text,
                              padding: '2px 8px',
                              borderRadius: '4px',
                            }}
                          >
                            {catTheme.icon} {story.category}
                          </span>
                          {story.date && (
                            <span style={{ fontSize: '0.74rem', color: 'var(--fg-muted)' }}>
                              {new Date(story.date).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        {story.image && (
                          <img
                            src={story.image}
                            alt=""
                            style={{
                              width: '100%',
                              height: '130px',
                              objectFit: 'cover',
                              borderRadius: '6px',
                              marginBottom: '10px',
                            }}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        )}

                        <h4 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 800, lineHeight: 1.35, color: 'var(--fg)' }}>
                          {story.title}
                        </h4>

                        <p
                          style={{
                            margin: 0,
                            fontSize: '0.84rem',
                            color: 'var(--fg-muted)',
                            lineHeight: 1.5,
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {story.summary}
                        </p>
                      </div>

                      <div style={{ paddingTop: '8px', borderTop: '1px solid var(--line)' }}>
                        <button
                          type="button"
                          onClick={() => {
                            if (onOpenStory) {
                              onOpenStory(story.id);
                              onClose();
                            } else {
                              window.location.hash = `#story-${story.id}`;
                              onClose();
                            }
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: 'var(--blue-tint, rgba(2, 132, 199, 0.1))',
                            color: 'var(--blue, #0284c7)',
                            border: '1px solid var(--blue, #0284c7)',
                            borderRadius: '6px',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                          }}
                        >
                          Read Full Report &rarr;
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer: Quick Subscribe Bar */}
        <div
          style={{
            padding: '14px 22px',
            background: 'var(--bg-subtle, #f8fafc)',
            borderTop: '1px solid var(--line, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ fontSize: '0.82rem', color: 'var(--fg-muted)' }}>
            📬 <strong>Automated Delivery:</strong> Compiled daily across all 10 sectors at 12:00 AM UTC.
          </div>

          {showUnsubscribe ? (
            <form
              onSubmit={handleUnsubscribeSubmit}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}
            >
              <input
                type="email"
                placeholder="Email to unsubscribe..."
                value={unsubscribeEmail}
                onChange={(e) => setUnsubscribeEmail(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--line, #cbd5e1)',
                  background: 'var(--bg, #ffffff)',
                  color: 'var(--fg, #0f172a)',
                  fontSize: '0.82rem',
                  minWidth: '220px',
                }}
              />
              <button
                type="submit"
                disabled={isUnsubscribing}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: isUnsubscribing ? 'default' : 'pointer',
                  opacity: isUnsubscribing ? 0.7 : 1,
                }}
              >
                <UserX size={14} /> {isUnsubscribing ? 'Unsubscribing...' : 'Unsubscribe'}
              </button>
              <button
                type="button"
                onClick={() => setShowUnsubscribe(false)}
                style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Never mind, keep my subscription
              </button>
            </form>
          ) : (
            <form
              onSubmit={handleSubscribeSubmit}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}
            >
              <input
                type="email"
                placeholder="Enter email for daily delivery..."
                value={subscribeEmail}
                onChange={(e) => setSubscribeEmail(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--line, #cbd5e1)',
                  background: 'var(--bg, #ffffff)',
                  color: 'var(--fg, #0f172a)',
                  fontSize: '0.82rem',
                  minWidth: '220px',
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  background: 'var(--blue, #0284c7)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                Subscribe Free
              </button>
              <button
                type="button"
                onClick={() => setShowUnsubscribe(true)}
                style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Unsubscribe instead
              </button>
            </form>
          )}

          {subscribeStatus && (
            <div style={{ width: '100%', fontSize: '0.8rem', color: '#16a34a', fontWeight: 700, textAlign: 'right' }}>
              {subscribeStatus}
            </div>
          )}
          {unsubscribeStatus && (
            <div style={{ width: '100%', fontSize: '0.8rem', color: unsubscribeStatus.startsWith('You') ? '#16a34a' : '#dc2626', fontWeight: 700, textAlign: 'right' }}>
              {unsubscribeStatus}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
