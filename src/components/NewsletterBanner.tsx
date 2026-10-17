import React, { useState } from 'react';
import { Mail, CheckCircle } from 'lucide-react';

interface NewsletterBannerProps {
  onSubscribe: (email: string) => boolean;
}

export const NewsletterBanner: React.FC<NewsletterBannerProps> = ({ onSubscribe }) => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [alreadySubscribed, setAlreadySubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.trim();
    if (!clean || !clean.includes('@')) return;

    const added = onSubscribe(clean);
    setEmail('');
    if (added) {
      setSubmitted(true);
      setAlreadySubscribed(false);
    } else {
      setAlreadySubscribed(true);
    }

    setTimeout(() => {
      setSubmitted(false);
      setAlreadySubscribed(false);
    }, 4000);
  };

  return (
    <div className="newsletter-banner">
      <div className="newsletter-content">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--blue)', fontWeight: 800, fontSize: '0.82rem', textTransform: 'uppercase', marginBottom: '6px' }}>
          <Mail size={16} /> Viralhoods Morning Dispatch
        </div>
        <h3>What the world is talking about, distilled in 3 minutes.</h3>
        <p>
          Join thousands of informed professionals. Hand-curated, original syntheses covering politics, tech, finance, and global breakthroughs delivered every weekday.
        </p>
      </div>

      <div>
        <form className="newsletter-form" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Enter your email address"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email for newsletter subscription"
          />
          <button type="submit">Join Free</button>
        </form>

        {submitted && (
          <div
            style={{
              marginTop: '10px',
              fontSize: '0.85rem',
              color: '#15803d',
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
              fontSize: '0.85rem',
              color: 'var(--blue)',
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
