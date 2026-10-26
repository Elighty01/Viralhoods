import React, { useState } from 'react';
import { Mail, CheckCircle, BookOpen, Sparkles } from 'lucide-react';

interface NewsletterBannerProps {
  onSubscribe: (email: string) => Promise<boolean> | boolean;
  onOpenNewsletter?: () => void;
}

export const NewsletterBanner: React.FC<NewsletterBannerProps> = ({ onSubscribe, onOpenNewsletter }) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadySubscribed, setAlreadySubscribed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!clean || !clean.includes('@')) return;

    setIsSubmitting(true);
    try {
      const added = await onSubscribe(clean);
      setEmail('');
      if (added) {
        setSubmitted(true);
        setAlreadySubscribed(false);
      } else {
        setAlreadySubscribed(true);
      }
    } catch (err) {
      console.warn('Newsletter subscribe note:', err);
      setSubmitted(true);
      setEmail('');
    } finally {
      setIsSubmitting(false);
    }

    setTimeout(() => {
      setSubmitted(false);
      setAlreadySubscribed(false);
    }, 4500);
  };

  return (
    <div
      className="newsletter-banner"
      style={{
        position: 'relative',
        backgroundImage: `linear-gradient(90deg, rgba(9, 13, 22, 0.94) 0%, rgba(9, 13, 22, 0.85) 55%, rgba(9, 13, 22, 0.7) 100%), url('https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=1600&q=85')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        border: '1px solid var(--line-strong)',
        color: '#ffffff',
        overflow: 'hidden',
      }}
    >
      <div className="newsletter-content" style={{ position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--blue-vibrant)', fontWeight: 800, fontSize: '0.84rem', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
          <Mail size={16} /> Viralhoods Morning Dispatch &bull; 10 Sectors Monitored
        </div>
        <h3 style={{ color: '#ffffff', fontSize: '1.6rem', fontWeight: 900, margin: '0 0 10px', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
          What the world is talking about, distilled in 3 minutes.
        </h3>
        <p style={{ color: '#cbd5e1', fontSize: '0.96rem', lineHeight: 1.55, margin: '0 0 16px' }}>
          Original syntheses covering World, Politics, Finance, Health, Entertainment, Research, Science, AI, Tech, and Sports. Strictly one latest verified story per sector, delivered daily.
        </p>

        {onOpenNewsletter && (
          <div>
            <button
              type="button"
              onClick={onOpenNewsletter}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                fontWeight: 800,
                fontSize: '0.88rem',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
                transition: 'all 0.15s ease',
              }}
            >
              <BookOpen size={16} /> Read Today's 10-Sector Newsletter Dispatch &rarr;
            </button>
          </div>
        )}
      </div>

      <div style={{ position: 'relative', zIndex: 2 }}>
        <form className="newsletter-form" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Enter your email address"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email for newsletter subscription"
            style={{
              background: 'rgba(255, 255, 255, 0.96)',
              color: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.3)',
            }}
          />
          <button type="submit" disabled={isSubmitting} style={{ background: 'var(--blue)', color: '#ffffff', fontWeight: 800 }}>
            {isSubmitting ? 'Joining...' : 'Join Free'}
          </button>
        </form>

        {submitted && (
          <div
            style={{
              marginTop: '10px',
              fontSize: '0.86rem',
              color: '#4ade80',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <CheckCircle size={15} /> You're on the list! Welcome to Viralhoods.
          </div>
        )}

        {alreadySubscribed && (
          <div
            style={{
              marginTop: '10px',
              fontSize: '0.86rem',
              color: 'var(--blue-vibrant)',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <CheckCircle size={15} /> This email is already subscribed to the Daily Briefing!
          </div>
        )}
      </div>
    </div>
  );
};

