import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  variant?: 'tablet' | 'horizontal' | 'badge';
  onClick?: () => void;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showTagline = true,
  variant = 'horizontal',
  onClick,
}) => {
  const dimensions = {
    sm: { width: 44, height: 32, fontSize: '1.25rem' },
    md: { width: 62, height: 44, fontSize: '1.75rem' },
    lg: { width: 110, height: 78, fontSize: '2.5rem' },
  }[size];

  return (
    <div
      className="brand-group"
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '12px',
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Real Tablet Logo Image Asset */}
      <div
        className="tablet-logo-emblem"
        style={{
          width: dimensions.width,
          height: dimensions.height,
          flexShrink: 0,
          position: 'relative',
          transition: 'transform 0.18s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img
          src={`${import.meta.env.BASE_URL || './'}logo.svg`}
          alt="Viralhoods Official Logo"
          width={dimensions.width}
          height={dimensions.height}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.18))',
            userSelect: 'none',
          }}
        />
      </div>

      {/* Brand Text */}
      {variant !== 'badge' && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              lineHeight: 1,
            }}
          >
            <span
              className="logo-text-branded"
              style={{
                fontSize: dimensions.fontSize,
                fontWeight: 900,
                letterSpacing: '-0.04em',
                color: 'var(--blue)',
                WebkitTextStroke: '1px #000000',
                textShadow: '0 1px 2px rgba(0,0,0,0.15)',
              }}
            >
              VIRAL
            </span>
            <span
              className="logo-text-branded"
              style={{
                fontSize: dimensions.fontSize,
                fontWeight: 900,
                letterSpacing: '-0.04em',
                color: 'var(--blue)',
                WebkitTextStroke: '1px #000000',
                textShadow: '0 1px 2px rgba(0,0,0,0.15)',
              }}
            >
              HOODS
            </span>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--sun)',
                boxShadow: '0 0 8px var(--sun)',
                marginLeft: '2px',
                marginTop: '4px',
              }}
            />
          </div>

          {showTagline && (
            <span className="tagline" style={{ marginTop: '3px' }}>
              What the world is talking about
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export const SocialMediaBadges: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexWrap: 'wrap',
      }}
    >
      {/* YouTube */}
      <a
        href="#youtube"
        className="social-badge-pill yt"
        title="Viralhoods on YouTube"
        onClick={(e) => e.preventDefault()}
      >
        <div className="yt-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="6" fill="#FF0000" />
            <path d="M10 8L16 12L10 16V8Z" fill="white" />
          </svg>
        </div>
        <span>YouTube</span>
      </a>

      {/* Twitter / X */}
      <a
        href="#twitter"
        className="social-badge-pill tw"
        title="Viralhoods on X / Twitter"
        onClick={(e) => e.preventDefault()}
      >
        <div className="tw-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="6" fill="#1DA1F2" />
            <path
              d="M18.244 5H20.75L15.27 11.26L21.72 19.78H16.68L12.73 14.62L8.21 19.78H5.704L11.53 13.12L5.354 5H10.52L14.12 9.76L18.244 5Z"
              fill="white"
            />
          </svg>
        </div>
        <span>Twitter / X</span>
      </a>

      {/* Instagram */}
      <a
        href="#instagram"
        className="social-badge-pill ig"
        title="Viralhoods on Instagram"
        onClick={(e) => e.preventDefault()}
      >
        <div className="ig-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="6" fill="#000000" />
            <rect x="5" y="5" width="14" height="14" rx="4" stroke="white" strokeWidth="1.8" />
            <circle cx="12" cy="12" r="3.5" stroke="white" strokeWidth="1.8" />
            <circle cx="16" cy="8" r="1" fill="white" />
          </svg>
        </div>
        <span>Instagram</span>
      </a>

      {/* Facebook */}
      <a
        href="#facebook"
        className="social-badge-pill fb"
        title="Viralhoods on Facebook"
        onClick={(e) => e.preventDefault()}
      >
        <div className="fb-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="6" fill="#000000" />
            <path
              d="M14 9H16V6H13C10.79 6 9 7.79 9 10V12H7V15H9V21H12V15H15L16 12H12V10C12 9.45 12.45 9 13 9H14Z"
              fill="white"
            />
          </svg>
        </div>
        <span>Facebook</span>
      </a>

      {/* Podcast (Gold circle from user image) */}
      <a
        href="#podcast"
        className="social-badge-pill pod"
        title="Viralhoods Podcast"
        onClick={(e) => e.preventDefault()}
      >
        <div className="pod-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="11" fill="#FFB703" />
            <rect x="9.5" y="6" width="5" height="8" rx="2.5" fill="#000000" />
            <path
              d="M7.5 11C7.5 13.48 9.52 15.5 12 15.5C14.48 15.5 16.5 13.48 16.5 11"
              stroke="#000000"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path d="M12 15.5V18.5" stroke="#000000" strokeWidth="1.8" />
            <path d="M9 18.5H15" stroke="#000000" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M5.5 10V12M18.5 10V12" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <span>Podcast</span>
      </a>

      {/* TikTok */}
      <a
        href="#tiktok"
        className="social-badge-pill tt"
        title="Viralhoods on TikTok"
        onClick={(e) => e.preventDefault()}
      >
        <div className="tt-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="6" fill="#000000" />
            <path
              d="M15.5 7.5C14.7 7.2 14.1 6.3 14 5.5H12V15C12 16.1 11.1 17 10 17C8.9 17 8 16.1 8 15C8 13.9 8.9 13 10 13C10.4 13 10.7 13.1 11 13.3V11.2C10.7 11.1 10.3 11 10 11C7.8 11 6 12.8 6 15C6 17.2 7.8 19 10 19C12.2 19 14 17.2 14 15V10C15 10.7 16.2 11.1 17.5 11.1V9.1C16.8 9.1 16 8.5 15.5 7.5Z"
              fill="#25F4EE"
            />
            <path
              d="M15 8C14.2 7.7 13.6 6.8 13.5 6H12.5V14.5C12.5 15.6 11.6 16.5 10.5 16.5C9.4 16.5 8.5 15.6 8.5 14.5C8.5 13.4 9.4 12.5 10.5 12.5C10.9 12.5 11.2 12.6 11.5 12.8V11.8C11.2 11.7 10.8 11.6 10.5 11.6C8.8 11.6 7.5 12.9 7.5 14.5C7.5 16.2 8.8 17.5 10.5 17.5C12.2 17.5 13.5 16.2 13.5 14.5V9.5C14.5 10.2 15.7 10.6 17 10.6V9.6C16.3 9.6 15.5 9 15 8Z"
              fill="#FE2C55"
              fillOpacity="0.8"
            />
          </svg>
        </div>
        <span>TikTok</span>
      </a>
    </div>
  );
};
