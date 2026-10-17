import React from 'react';
import { Mail, CheckCircle2, ShieldCheck, Newspaper, Compass } from 'lucide-react';

export const AboutView: React.FC = () => {
  return (
    <main className="w prose" style={{ margin: '36px auto 60px' }}>
      <div style={{ marginBottom: '24px' }}>
        <span
          style={{
            color: 'var(--blue)',
            fontWeight: 800,
            fontSize: '0.82rem',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            display: 'block',
            marginBottom: '6px',
          }}
        >
          Editorial Principles
        </span>
        <h1 style={{ margin: 0 }}>About Viralhoods</h1>
      </div>

      <p style={{ fontSize: '1.15rem', color: 'var(--fg-muted)', lineHeight: 1.6 }}>
        Viralhoods is an independent modern news publication dedicated to cutting through information overload. We deliver short, verified, original syntheses of what is shaping the world in politics, finance, health, entertainment, research, science, AI, technology, and sports.
      </p>

      <h2>Our Editorial Standards</h2>
      <p>
        In an internet saturated with algorithmic clickbait and repetitive link farms, Viralhoods follows a strict original reporting model:
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', margin: '20px 0' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <CheckCircle2 size={20} style={{ color: 'var(--blue)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>100% Original Paraphrase & Synthesis:</strong> We never copy raw text from wire feeds. Our journalists and editors analyze incoming developments, distill the verified facts, and write fresh, independent reports in plain, authoritative English.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <CheckCircle2 size={20} style={{ color: 'var(--blue)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>No External Link Dumping:</strong> Every story is self-contained and fully readable on Viralhoods with executive takeaways, background context, and forward-looking analysis.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <CheckCircle2 size={20} style={{ color: 'var(--blue)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Multi-Sector Balance:</strong> We cover developments across ten core sectors without partisan slant, prioritizing substantive societal and market impact.
          </div>
        </div>
      </div>

      <h2>How We Work</h2>
      <p>
        Every day, our editorial desk monitors verified global press wires, academic journals, government releases, and leading institutions. Stories are synthesized, checked for factual accuracy, formatted with executive takeaways, and published for busy professionals who need to stay informed in minutes.
      </p>

      <h2>Corrections & Integrity</h2>
      <p>
        Accuracy is our paramount standard. If you discover a factual mistake or need to submit a clarification, contact our editorial desk at{' '}
        <a href="mailto:yussufelijah@gmail.com" style={{ color: 'var(--blue)', fontWeight: 700 }}>
          yussufelijah@gmail.com
        </a>
        . Verified corrections are published promptly.
      </p>

      <h2>Privacy & Reader Security</h2>
      <p>
        We do not sell personal data, install tracking pixels, or distribute reader email addresses. Readers who subscribe to our Daily Briefing receive editorial emails exclusively from Viralhoods and can unsubscribe at any time with one click.
      </p>
    </main>
  );
};
