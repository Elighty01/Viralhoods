import React, { useState } from 'react';
import { User, OWNER_EMAIL } from '../types';
import { setCurrentUser, isOwnerEmail } from '../utils/storage';
import { auth, googleProvider, signInWithPopup, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { X, Mail, CheckCircle, ShieldCheck } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);

  if (!isOpen) return null;

  // Sync to Firestore subscribers collection
  const syncToFirestore = async (userEmail: string) => {
    try {
      const subRef = doc(db, 'subscribers', userEmail.replace(/[^a-zA-Z0-9]/g, '_'));
      await setDoc(
        subRef,
        {
          email: userEmail,
          subscribedAt: new Date().toISOString(),
          source: 'firebase_auth',
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Firestore subscription sync error:', err);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoadingGoogle(true);
    setIsError(false);
    setStatusMessage(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const googleUser = result.user;
      const cleanEmail = googleUser.email || '';
      const displayName = googleUser.displayName || cleanEmail.split('@')[0];

      if (!cleanEmail) {
        throw new Error('Google account has no associated email.');
      }

      await syncToFirestore(cleanEmail);
      const user = setCurrentUser(cleanEmail, displayName);

      if (user.isAdmin) {
        setStatusMessage(`Welcome Administrator Yussuf Elijah! Admin unlocked.`);
      } else {
        setStatusMessage(`Welcome ${displayName}! You are signed in & subscribed.`);
      }

      setTimeout(() => {
        onSuccess(user);
        onClose();
      }, 1000);
    } catch (err: any) {
      console.warn('Google sign in error:', err);
      // Fallback message if popup was cancelled or blocked in iframe
      setIsError(true);
      setStatusMessage(
        err?.code === 'auth/popup-closed-by-user'
          ? 'Sign in popup was closed. You can also sign in with email below.'
          : 'Google sign in unavailable in this browser preview. Please use email sign in below.'
      );
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setIsError(true);
      setStatusMessage('Please enter a valid email address.');
      return;
    }

    await syncToFirestore(cleanEmail);
    const user = setCurrentUser(cleanEmail, name);
    setIsError(false);

    if (user.isAdmin) {
      setStatusMessage(`Welcome Administrator Yussuf Elijah! Admin dashboard unlocked.`);
    } else {
      setStatusMessage(`Welcome! You are now subscribed to the Viralhoods Daily Briefing.`);
    }

    setTimeout(() => {
      onSuccess(user);
      onClose();
    }, 1000);
  };

  const handleQuickAdminLogin = () => {
    setEmail(OWNER_EMAIL);
    setName('Yussuf Elijah');
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Sign in to Viralhoods</h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.86rem', color: 'var(--fg-muted)' }}>
              Join readers worldwide with Firebase Authentication & Firestore sync
            </p>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close dialog">
            <X size={20} />
          </button>
        </div>

        {/* Google Sign-in Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoadingGoogle}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            padding: '11px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--line-strong)',
            background: 'var(--bg-subtle)',
            color: 'var(--fg)',
            fontWeight: 700,
            fontSize: '0.94rem',
            cursor: 'pointer',
            marginBottom: '18px',
            transition: 'background 0.15s ease',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          {isLoadingGoogle ? 'Connecting with Google...' : 'Continue with Google'}
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            margin: '14px 0 18px',
            color: 'var(--fg-muted)',
            fontSize: '0.82rem',
          }}
        >
          <div style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
          <span>OR SIGN IN WITH EMAIL</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="auth-email">Email Address</label>
            <input
              id="auth-email"
              type="email"
              className="form-input"
              placeholder="you@domain.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="auth-name">Your Name (Optional)</label>
            <input
              id="auth-name"
              type="text"
              className="form-input"
              placeholder="e.g. Alex Morgan"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div
            style={{
              padding: '12px 14px',
              background: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.84rem',
              color: 'var(--fg-muted)',
              marginBottom: '18px',
              border: '1px solid var(--line)',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
            }}
          >
            <Mail size={18} style={{ color: 'var(--blue)', flexShrink: 0, marginTop: '2px' }} />
            <span>
              <strong>Automatic Newsletter Subscription:</strong> Signing in automatically enrolls your email in the free Viralhoods Daily Briefing. You can unsubscribe at any time.
            </span>
          </div>

          {statusMessage && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '16px',
                fontSize: '0.88rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: isError ? '#fee2e2' : 'var(--blue-tint)',
                color: isError ? '#b91c1c' : 'var(--blue)',
              }}
            >
              {isError ? <X size={16} /> : <CheckCircle size={16} />}
              {statusMessage}
            </div>
          )}

          <button type="submit" className="btn-primary">
            Sign In & Subscribe
          </button>
        </form>

        {/* Admin Login Helper hint for site owner */}
        <div
          style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px dashed var(--line)',
            fontSize: '0.82rem',
            textAlign: 'center',
            color: 'var(--fg-muted)',
          }}
        >
          <span>Site Administrator? </span>
          <button
            type="button"
            onClick={handleQuickAdminLogin}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--blue)',
              fontWeight: 700,
              cursor: 'pointer',
              padding: '0 4px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <ShieldCheck size={14} /> Fill {OWNER_EMAIL}
          </button>
        </div>
      </div>
    </div>
  );
};
