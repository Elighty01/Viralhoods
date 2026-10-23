import React, { useState } from 'react';
import { X, AtSign, CheckCircle, AlertCircle } from 'lucide-react';
import { User } from '../types';
import { claimUsername, validateUsername } from '../utils/community';

interface UsernameSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onClaimed: (username: string) => void;
}

export const UsernameSetupModal: React.FC<UsernameSetupModalProps> = ({ isOpen, onClose, currentUser, onClaimed }) => {
  const [value, setValue] = useState(() => (currentUser.name || currentUser.email.split('@')[0] || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateUsername(value);
    if (validationError) {
      setMessage({ text: validationError, isError: true });
      return;
    }
    setIsSubmitting(true);
    setMessage(null);
    const res = await claimUsername(currentUser.uid!, value, currentUser.name || value);
    setIsSubmitting(false);
    setMessage({ text: res.message, isError: !res.success });
    if (res.success) {
      setTimeout(() => onClaimed(res.profile!.username), 500);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>Pick a Username</h3>
          <button className="close-btn" onClick={onClose} aria-label="Close dialog">
            <X size={20} />
          </button>
        </div>
        <p style={{ margin: '0 0 18px', fontSize: '0.86rem', color: 'var(--fg-muted)', lineHeight: 1.5 }}>
          This is how other readers will see you, and it's your profile page's address — Viralhoods.app/u/
          <strong>yourname</strong>. You can't change it later.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username-input">Username</label>
            <div style={{ position: 'relative' }}>
              <AtSign size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)' }} />
              <input
                id="username-input"
                type="text"
                className="form-input"
                style={{ paddingLeft: '32px' }}
                value={value}
                onChange={(e) => setValue(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20))}
                placeholder="yourname"
                autoFocus
                required
              />
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--fg-muted)', marginTop: '6px' }}>
              3-20 characters: lowercase letters, numbers, underscores.
            </div>
          </div>

          {message && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '16px',
                fontSize: '0.86rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: message.isError ? '#fee2e2' : 'var(--blue-tint)',
                color: message.isError ? '#b91c1c' : 'var(--blue)',
              }}
            >
              {message.isError ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
              <div>{message.text}</div>
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ width: '100%', padding: '12px' }}>
            {isSubmitting ? 'Checking availability...' : 'Claim Username'}
          </button>
        </form>
      </div>
    </div>
  );
};
