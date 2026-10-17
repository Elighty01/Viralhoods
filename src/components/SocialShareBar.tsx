import React, { useState } from 'react';
import { Copy, Check, Share2 } from 'lucide-react';

interface SocialShareBarProps {
  title: string;
  storyId: string;
  category?: string;
  summary?: string;
  variant?: 'compact' | 'full';
}

export const SocialShareBar: React.FC<SocialShareBarProps> = ({
  title,
  storyId,
  category,
  summary,
  variant = 'compact',
}) => {
  const [copied, setCopied] = useState(false);

  // Generate canonical article URL
  const getStoryUrl = () => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}${window.location.pathname}#story-${storyId}`;
  };

  const handleCopyLink = async () => {
    const url = getStoryUrl();
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2400);
      } catch (err) {
        console.error('Copy to clipboard failed:', err);
      }
    }
  };

  const shareText = `Viralhoods: ${title}`;
  const storyUrl = getStoryUrl();

  const handleTwitterShare = (e: React.MouseEvent) => {
    e.preventDefault();
    const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(storyUrl)}`;
    window.open(intentUrl, '_blank', 'noopener,noreferrer,width=600,height=460');
  };

  const handleFacebookShare = (e: React.MouseEvent) => {
    e.preventDefault();
    const intentUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(storyUrl)}&quote=${encodeURIComponent(shareText)}`;
    window.open(intentUrl, '_blank', 'noopener,noreferrer,width=600,height=520');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: summary ? `${title} — ${summary}` : title,
          url: storyUrl,
        });
      } catch {
        // User dismissed share sheet
      }
    } else {
      handleCopyLink();
    }
  };

  if (variant === 'compact') {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        {/* Twitter Share Button */}
        <button
          type="button"
          onClick={handleTwitterShare}
          className="icon-btn"
          style={{
            borderColor: '#1DA1F2',
            color: '#1DA1F2',
            padding: '6px 10px',
            fontSize: '0.82rem',
            fontWeight: 700,
          }}
          title="Share article on Twitter / X"
          aria-label="Share on Twitter"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 5H20.75L15.27 11.26L21.72 19.78H16.68L12.73 14.62L8.21 19.78H5.704L11.53 13.12L5.354 5H10.52L14.12 9.76L18.244 5Z" />
          </svg>
          <span>Share</span>
        </button>

        {/* Facebook Share Button */}
        <button
          type="button"
          onClick={handleFacebookShare}
          className="icon-btn"
          style={{
            borderColor: '#1877F2',
            color: '#1877F2',
            padding: '6px 10px',
            fontSize: '0.82rem',
            fontWeight: 700,
          }}
          title="Share article on Facebook"
          aria-label="Share on Facebook"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14 9H16V6H13C10.79 6 9 7.79 9 10V12H7V15H9V21H12V15H15L16 12H12V10C12 9.45 12.45 9 13 9H14Z" />
          </svg>
          <span>Post</span>
        </button>

        {/* Copy Link Button */}
        <button
          type="button"
          onClick={handleCopyLink}
          className="icon-btn"
          style={{
            borderColor: copied ? '#10b981' : 'var(--line)',
            color: copied ? '#10b981' : 'var(--fg)',
            padding: '6px 10px',
            fontSize: '0.82rem',
            fontWeight: 700,
            background: copied ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
          }}
          title="Copy link to clipboard"
          aria-label="Copy link to clipboard"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <span>{copied ? 'Copied!' : 'Copy Link'}</span>
        </button>
      </div>
    );
  }

  // Full Social Sharing Card (Placed after article body)
  return (
    <div
      style={{
        background: 'var(--bg-subtle)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius-lg)',
        padding: '22px 24px',
        margin: '32px 0 36px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Spread the Word
          </span>
          <h4 style={{ margin: '3px 0 0', fontSize: '1.12rem', fontWeight: 800, color: 'var(--fg)' }}>
            Share this story with your network
          </h4>
        </div>

        {copied && (
          <span
            style={{
              fontSize: '0.82rem',
              color: '#15803d',
              fontWeight: 700,
              background: '#dcfce7',
              padding: '4px 10px',
              borderRadius: '999px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Check size={14} /> Link copied to clipboard
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {/* Twitter / X */}
        <button
          type="button"
          onClick={handleTwitterShare}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: '#0f172a',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            transition: 'opacity 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 5H20.75L15.27 11.26L21.72 19.78H16.68L12.73 14.62L8.21 19.78H5.704L11.53 13.12L5.354 5H10.52L14.12 9.76L18.244 5Z" />
          </svg>
          Share on X / Twitter
        </button>

        {/* Facebook */}
        <button
          type="button"
          onClick={handleFacebookShare}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: '#1877F2',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            transition: 'opacity 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14 9H16V6H13C10.79 6 9 7.79 9 10V12H7V15H9V21H12V15H15L16 12H12V10C12 9.45 12.45 9 13 9H14Z" />
          </svg>
          Share on Facebook
        </button>

        {/* Copy Link button */}
        <button
          type="button"
          onClick={handleCopyLink}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--line-strong)',
            background: copied ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-card)',
            color: copied ? '#10b981' : 'var(--fg)',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'Link Copied!' : 'Copy Link to Clipboard'}
        </button>

        {/* Mobile Native Share (if supported) */}
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button
            type="button"
            onClick={handleNativeShare}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--line)',
              background: 'transparent',
              color: 'var(--fg-muted)',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
            }}
          >
            <Share2 size={15} /> More Options
          </button>
        )}
      </div>
    </div>
  );
};
