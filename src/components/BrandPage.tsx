import React, { useState } from 'react';
import { BrandLogo, SocialMediaBadges } from './BrandLogo';
import { Copy, Check, Palette, Award, Radio } from 'lucide-react';

export const BrandPage: React.FC = () => {
  const [copiedSvg, setCopiedSvg] = useState(false);

  const tabletSvgCode = `<svg viewBox="0 0 100 72" width="200" height="144" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="2" y="2" width="96" height="68" rx="6" fill="#111827" stroke="#1f2937" stroke-width="2" />
  <circle cx="50" cy="5.5" r="1.5" fill="#4b5563" />
  <rect x="7" y="9" width="86" height="54" rx="3" fill="#ffffff" />
  <text x="50" y="32" text-anchor="middle" font-family="'Arial Black', sans-serif" font-weight="900" font-size="18" fill="#29b6f6" stroke="#000000" stroke-width="1.8" stroke-linejoin="round" paint-order="stroke fill">VIRAL</text>
  <text x="50" y="52" text-anchor="middle" font-family="'Arial Black', sans-serif" font-weight="900" font-size="18" fill="#29b6f6" stroke="#000000" stroke-width="1.8" stroke-linejoin="round" paint-order="stroke fill">HOODS</text>
</svg>`;

  const handleCopySvg = async () => {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(tabletSvgCode);
      setCopiedSvg(true);
      setTimeout(() => setCopiedSvg(false), 2200);
    }
  };

  const palette = [
    {
      name: 'Viral Sky Cyan',
      hex: '#29b6f6',
      role: 'Core Brand Wordmark Fill & Active Focus',
      textColor: '#0f172a',
    },
    {
      name: 'Contour Jet Black',
      hex: '#000000',
      role: 'Bold Lettering Outline & Device Bezel',
      textColor: '#ffffff',
    },
    {
      name: 'Warm Amber Gold',
      hex: '#f59e0b',
      role: 'Podcast Beacon & Solar Accent Energy',
      textColor: '#0f172a',
    },
    {
      name: 'Editorial Deep Sky',
      hex: '#0284c7',
      role: 'Buttons, Links & Category Highlights',
      textColor: '#ffffff',
    },
    {
      name: 'Display Screen White',
      hex: '#ffffff',
      role: 'Tablet Screen & Editorial Background',
      textColor: '#0f172a',
      border: true,
    },
  ];

  return (
    <main className="w brand-page">
      <div
        className="brand-hero"
        style={{
          position: 'relative',
          backgroundImage: `linear-gradient(180deg, rgba(9, 13, 22, 0.92) 0%, rgba(9, 13, 22, 0.85) 60%, rgba(9, 13, 22, 0.95) 100%), url('https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&w=1600&q=85')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color: '#ffffff',
          overflow: 'hidden',
          border: '1px solid var(--line-strong)',
        }}
      >
        <span
          style={{
            color: 'var(--blue-vibrant)',
            fontWeight: 800,
            fontSize: '0.82rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: '8px',
            display: 'block',
          }}
        >
          Official Brand Identity
        </span>
        <h1 style={{ fontSize: '2.4rem', fontWeight: 900, letterSpacing: '-0.04em', margin: '0 0 12px', color: '#ffffff' }}>
          Viralhoods Logo & Visual System
        </h1>
        <p style={{ maxWidth: '640px', margin: '0 auto 28px', color: '#cbd5e1', fontSize: '1.05rem', lineHeight: 1.6 }}>
          Designed around the high-impact tablet emblem: bold sky-cyan lettering with jet-black contour outlines on a pristine display canvas, accompanied by warm amber solar highlights.
        </p>

        {/* Hero Presentation of the Tablet Brand Logo */}
        <div
          style={{
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '30px 44px',
            background: 'var(--bg-card)',
            border: '1px solid var(--line-strong)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--card-shadow-hover)',
          }}
        >
          <BrandLogo size="lg" showTagline={true} />
        </div>
      </div>

      {/* Official Media Channels */}
      <section
        style={{
          background: 'var(--bg-subtle)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px 28px',
          marginBottom: '40px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Radio size={18} style={{ color: 'var(--sun)' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
            Broadcast & Social Channels
          </h2>
        </div>
        <p style={{ color: 'var(--fg-muted)', fontSize: '0.94rem', margin: '0 0 16px' }}>
          Follow Viralhoods across all major platforms for short summaries, breaking news alerts, and podcasts:
        </p>
        <SocialMediaBadges />
      </section>

      {/* Logo Showcase Grid */}
      <section style={{ marginBottom: '48px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0 }}>
            Logo Variations
          </h2>
          <button
            type="button"
            className="icon-btn"
            onClick={handleCopySvg}
            style={{ fontWeight: 700 }}
          >
            {copiedSvg ? (
              <>
                <Check size={16} style={{ color: '#10b981' }} /> Tablet SVG Vector Copied!
              </>
            ) : (
              <>
                <Copy size={16} /> Copy Tablet Logo SVG
              </>
            )}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {/* Tablet Screen Emblem */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-lg)',
              padding: '36px 24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div style={{ margin: '10px 0 20px' }}>
              <BrandLogo size="lg" showTagline={false} variant="badge" />
            </div>
            <span style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--fg)' }}>
              Primary Tablet Emblem
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--fg-muted)', marginTop: '4px' }}>
              Used in app headers, icons, and hero promotions
            </span>
          </div>

          {/* Horizontal Wordmark with Tablet */}
          <div
            style={{
              background: '#090d16',
              color: '#f1f5f9',
              border: '1px solid #1e293b',
              borderRadius: 'var(--radius-lg)',
              padding: '36px 24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ margin: '10px 0 20px' }}>
              <BrandLogo size="md" showTagline={false} />
            </div>
            <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#f1f5f9' }}>
              Dark Masthead Signature
            </span>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>
              Optimized for dark mode navigation and broadcast
            </span>
          </div>
        </div>
      </section>

      {/* Palette */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Palette size={20} style={{ color: 'var(--blue)' }} /> Theme Color Palette
        </h2>
        <div className="color-swatches">
          {palette.map((swatch) => (
            <div key={swatch.name} className="swatch-card">
              <div
                className="swatch-color"
                style={{
                  background: swatch.hex,
                  borderBottom: swatch.border ? '1px solid var(--line)' : 'none',
                }}
              />
              <div className="swatch-info">
                <div style={{ fontWeight: 800, color: 'var(--fg)' }}>{swatch.name}</div>
                <div style={{ fontFamily: 'monospace', color: 'var(--blue)', fontWeight: 700, margin: '2px 0 4px' }}>
                  {swatch.hex}
                </div>
                <div style={{ color: 'var(--fg-muted)', fontSize: '0.78rem' }}>{swatch.role}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Editorial Standards */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Award size={20} style={{ color: 'var(--sun)' }} /> Editorial Promise
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
          <div style={{ padding: '22px', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 8px', color: 'var(--fg)' }}>
              1. 100% Original Paraphrase
            </h3>
            <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--fg-muted)', lineHeight: 1.5 }}>
              Zero external link-dumping. Every story is synthesized in Viralhoods original voice with verified facts.
            </p>
          </div>

          <div style={{ padding: '22px', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 8px', color: 'var(--fg)' }}>
              2. Executive Takeaways First
            </h3>
            <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--fg-muted)', lineHeight: 1.5 }}>
              Readers get high-signal bullet takeaways immediately, followed by in-depth contextual analysis.
            </p>
          </div>

          <div style={{ padding: '22px', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 8px', color: 'var(--fg)' }}>
              3. Ten Sectors Monitored
            </h3>
            <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--fg-muted)', lineHeight: 1.5 }}>
              Continuous real-time tracking across World, Politics, Finance, Tech, AI, Science, Health, and Sports.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
};
