import React, { useEffect, useState } from 'react';
import { X, Megaphone, Loader2, CheckCircle2 } from 'lucide-react';
import { User } from '../types';
import { submitAdInquiry } from '../utils/contact';

interface AdContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
}

/**
 * "Send us a message" popup for advertisers — opened from the Sidebar's
 * Advertisement widget and from the Footer. The message is only ever
 * visible to the Chief Administrator (see firestore.rules and AdminView's
 * "Ad Inquiries" tab), which is why this asks for the sender's email even
 * when they're already signed in.
 */
export const AdContactModal: React.FC<AdContactModalProps> = ({ isOpen, onClose, currentUser }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEmail(currentUser?.email || '');
      setName(currentUser?.name || '');
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (isSubmitting) return;
    setMessage('');
    setError(null);
    setDone(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email so we can reply.');
      return;
    }
    if (!message.trim()) {
      setError('Please add a short message.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    const ok = await submitAdInquiry(cleanEmail, message, name);
    setIsSubmitting(false);
    if (ok) {
      setDone(true);
      setTimeout(handleClose, 1800);
    } else {
      setError('Something went wrong sending that. Please try again.');
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose} role="dialog" aria-modal="true" aria-label="Contact us for advertising">
      <div className="modal-card" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 4px' }}>
          <h2 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Megaphone size={18} color="var(--blue)" /> Advertise with Viralhoods
          </h2>
          <button type="button" onClick={handleClose} className="icon-btn" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {done ? (
          <div style={{ padding: '30px 20px', textAlign: 'center' }}>
            <CheckCircle2 size={32} color="#16a34a" style={{ marginBottom: '10px' }} />
            <p style={{ fontWeight: 700, margin: 0 }}>Message sent — thanks!</p>
            <p style={{ color: 'var(--fg-muted)', fontSize: '0.86rem', margin: '4px 0 0' }}>We'll get back to you by email.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '10px 20px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--fg-muted)' }}>
              Tell us a bit about what you'd like to promote. Your message goes straight to our ad team.
            </p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name (optional)"
              maxLength={120}
              className="form-input"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email"
              required
              className="form-input"
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 4000))}
              placeholder="What would you like to advertise?"
              rows={4}
              className="form-input"
              style={{ resize: 'vertical' }}
            />
            {error && <p style={{ color: '#dc2626', fontSize: '0.82rem', margin: 0 }}>{error}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={handleClose} className="btn-outline" disabled={isSubmitting}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 size={15} className="spin-icon" /> : 'Send message'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
