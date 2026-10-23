import React, { useState } from 'react';
import { User, isChiefAdminEmail } from '../types';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithRedirect,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  refreshAdminStatus,
  db,
} from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { X, Mail, CheckCircle, AlertCircle, UserPlus, LogIn, User as UserIcon, Sparkles, KeyRound } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
  initialPromptMessage?: string;
  initialTab?: 'signin' | 'register' | 'forgot';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialPromptMessage,
  initialTab = 'signin',
}) => {
  const [tab, setTab] = useState<'signin' | 'register' | 'forgot'>(initialTab);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Best-effort denormalized record of registered members, for the Admin
  // dashboard's roster view. Keyed by uid (matching firestore.rules) so the
  // writes actually succeed instead of silently failing on a permission
  // mismatch. Never grants any privilege by itself.
  const syncMemberRecord = async (uid: string, userEmail: string, displayName: string, source: string) => {
    try {
      const nowIso = new Date().toISOString();
      await setDoc(
        doc(db, 'registered_users', uid),
        {
          id: uid,
          usernameOrEmail: userEmail,
          email: userEmail,
          name: displayName,
          lastLogin: nowIso,
          source,
          isAdmin: isChiefAdminEmail(userEmail),
        },
        { merge: true }
      );
      await setDoc(
        doc(db, 'subscribers', uid),
        { email: userEmail, uid, subscribedAt: nowIso, source: 'firebase_auth' },
        { merge: true }
      );
    } catch (err) {
      // Non-fatal — the member roster is a nice-to-have, not a trust boundary.
      console.warn('Member record sync note:', err);
    }
  };

  const finishSignIn = async (fbUser: NonNullable<typeof auth.currentUser>, displayName: string, source: string) => {
    const userEmail = fbUser.email || '';
    const isAdmin = await refreshAdminStatus(fbUser);
    await syncMemberRecord(fbUser.uid, userEmail, displayName, source);
    const user: User = { email: userEmail, name: displayName, isAdmin, uid: fbUser.uid };
    setStatusMessage(`Welcome${displayName ? ', ' + displayName : ''}!`);
    setTimeout(() => {
      onSuccess(user);
      onClose();
    }, 600);
  };

  const handleGoogleSignIn = async () => {
    setIsLoadingGoogle(true);
    setIsError(false);
    setStatusMessage(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      if (!fbUser.email) throw new Error('Google account has no associated email address.');
      const displayName = fbUser.displayName || fbUser.email.split('@')[0];
      await finishSignIn(fbUser, displayName, 'google_auth');
    } catch (err: any) {
      console.warn('Google sign in note:', err);
      setIsError(true);
      if (err?.code === 'auth/unauthorized-domain') {
        const domain = typeof window !== 'undefined' ? window.location.hostname : 'elighty01.github.io';
        setStatusMessage(
          `Domain not authorized: Please add "${domain}" to your Firebase Console under Authentication > Settings > Authorized domains.`
        );
      } else if (err?.code === 'auth/operation-not-allowed') {
        setStatusMessage(
          'Google sign-in is not enabled. In your Firebase Console, go to Authentication > Sign-in method and enable Google.'
        );
      } else if (err?.code === 'auth/popup-blocked') {
        try {
          setStatusMessage('Popup was blocked by your browser. Redirecting to Google Sign-In...');
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr: any) {
          setStatusMessage('Popup blocked. Please allow popups for this site or use email & password below.');
        }
      } else if (err?.code === 'auth/popup-closed-by-user') {
        setStatusMessage('Sign-in window was closed. You can try again or use email & password below.');
      } else {
        setStatusMessage(
          err?.message || 'Google sign-in is unavailable right now. Please use email & password below.'
        );
      }
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setIsError(false);
    setStatusMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setIsError(true);
      setStatusMessage('Please enter the email address on your account.');
      setIsSubmitting(false);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setIsError(false);
      setStatusMessage(`If an account exists for ${cleanEmail}, a password reset link has been sent — check your inbox.`);
    } catch (err: any) {
      // Firebase deliberately doesn't reveal whether the account exists for
      // most errors; only surface a real problem (e.g. malformed email).
      if (err?.code === 'auth/invalid-email') {
        setIsError(true);
        setStatusMessage('That doesn\u2019t look like a valid email address.');
      } else {
        setIsError(false);
        setStatusMessage(`If an account exists for ${cleanEmail}, a password reset link has been sent — check your inbox.`);
      }
    }
    setIsSubmitting(false);
  };

  const friendlyAuthError = (err: any): string => {
    switch (err?.code) {
      case 'auth/email-already-in-use':
        return 'An account already exists with this email. Try signing in instead.';
      case 'auth/invalid-email':
        return 'That doesn\u2019t look like a valid email address.';
      case 'auth/weak-password':
        return 'Password must be at least 6 characters.';
      case 'auth/user-not-found':
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
        return 'Incorrect email or password.';
      case 'auth/too-many-requests':
        return 'Too many attempts — please wait a moment and try again.';
      default:
        return err?.message || 'Something went wrong. Please try again.';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setIsError(false);
    setStatusMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setIsError(true);
      setStatusMessage('Please enter a valid email address.');
      setIsSubmitting(false);
      return;
    }
    if (!password) {
      setIsError(true);
      setStatusMessage('Please enter your password.');
      setIsSubmitting(false);
      return;
    }

    try {
      if (tab === 'register') {
        if (password.length < 6) {
          setIsError(true);
          setStatusMessage('Password must be at least 6 characters.');
          setIsSubmitting(false);
          return;
        }
        if (password !== confirmPassword) {
          setIsError(true);
          setStatusMessage('Passwords do not match. Please re-enter.');
          setIsSubmitting(false);
          return;
        }

        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        const displayName = name.trim() || cleanEmail.split('@')[0];
        if (displayName) {
          try {
            await updateProfile(cred.user, { displayName });
          } catch {
            /* non-fatal */
          }
        }
        try {
          await sendEmailVerification(cred.user);
        } catch {
          /* non-fatal — account still works even if the verification email fails to send */
        }
        await finishSignIn(cred.user, displayName, 'registration');
      } else {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
        const displayName = cred.user.displayName || cleanEmail.split('@')[0];
        await finishSignIn(cred.user, displayName, 'login_portal');
      }
    } catch (err: any) {
      console.warn('Auth error:', err);
      setIsError(true);
      setStatusMessage(friendlyAuthError(err));
    }
    setIsSubmitting(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>
              {tab === 'signin' ? 'Sign In to Viralhoods' : tab === 'register' ? 'Create an Account' : 'Reset Your Password'}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.86rem', color: 'var(--fg-muted)' }}>
              {tab === 'signin'
                ? 'Welcome back — sign in to bookmark stories and more.'
                : tab === 'register'
                ? 'Join Viralhoods with Google or your email address.'
                : 'Enter your email and we\u2019ll send you a reset link.'}
            </p>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close dialog">
            <X size={20} />
          </button>
        </div>

        {initialPromptMessage && (
          <div
            style={{
              background: 'rgba(2, 132, 199, 0.08)',
              border: '1px solid var(--blue)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              margin: '14px 0 16px',
              fontSize: '0.86rem',
              color: 'var(--blue)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Sparkles size={16} style={{ flexShrink: 0 }} />
            <span>{initialPromptMessage}</span>
          </div>
        )}

        <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', marginBottom: '18px', gap: '4px' }}>
          <button
            type="button"
            onClick={() => {
              setTab('signin');
              setStatusMessage(null);
            }}
            style={{
              flex: 1,
              padding: '10px 8px',
              border: 'none',
              background: 'transparent',
              borderBottom: tab === 'signin' ? '2px solid var(--blue)' : '2px solid transparent',
              color: tab === 'signin' ? 'var(--fg)' : 'var(--fg-muted)',
              fontWeight: tab === 'signin' ? 800 : 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '0.88rem',
            }}
          >
            <LogIn size={15} /> Sign In
          </button>

          <button
            type="button"
            onClick={() => {
              setTab('register');
              setStatusMessage(null);
            }}
            style={{
              flex: 1,
              padding: '10px 8px',
              border: 'none',
              background: 'transparent',
              borderBottom: tab === 'register' ? '2px solid var(--blue)' : '2px solid transparent',
              color: tab === 'register' ? 'var(--fg)' : 'var(--fg-muted)',
              fontWeight: tab === 'register' ? 800 : 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '0.88rem',
            }}
          >
            <UserPlus size={15} /> Register
          </button>

          <button
            type="button"
            onClick={() => {
              setTab('forgot');
              setStatusMessage(null);
            }}
            style={{
              flex: 1,
              padding: '10px 8px',
              border: 'none',
              background: 'transparent',
              borderBottom: tab === 'forgot' ? '2px solid var(--blue)' : '2px solid transparent',
              color: tab === 'forgot' ? 'var(--fg)' : 'var(--fg-muted)',
              fontWeight: tab === 'forgot' ? 800 : 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '0.88rem',
            }}
          >
            <KeyRound size={15} /> Forgot Password
          </button>
        </div>

        {tab !== 'forgot' && (
          <>
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
                fontSize: '0.92rem',
                cursor: 'pointer',
                marginBottom: '16px',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              {isLoadingGoogle ? 'Connecting with Google...' : 'Continue with Google'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '12px 0 16px', color: 'var(--fg-muted)', fontSize: '0.8rem' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
              <span>OR USE EMAIL</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
            </div>
          </>
        )}

        {tab === 'forgot' ? (
          <form onSubmit={handleForgotPasswordSubmit}>
            <div style={{ marginBottom: '14px', background: 'var(--bg-subtle)', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--blue)', fontWeight: 700, fontSize: '0.88rem', marginBottom: '4px' }}>
                <Mail size={16} /> Password Recovery via Email
              </div>
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--fg-muted)', lineHeight: 1.45 }}>
                Enter your account email and we'll send a secure reset link from Firebase.
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="auth-forgot-email">Your Email</label>
              <input
                id="auth-forgot-email"
                type="email"
                className="form-input"
                placeholder="name@example.com"
                required
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
              />
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
                  lineHeight: 1.4,
                }}
              >
                {isError ? <AlertCircle size={18} style={{ flexShrink: 0 }} /> : <CheckCircle size={18} style={{ flexShrink: 0 }} />}
                <div>{statusMessage}</div>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
              style={{ width: '100%', padding: '12px', fontSize: '0.96rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {isSubmitting ? 'Sending...' : (<><Mail size={16} /> Send Reset Link</>)}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit}>
            {tab === 'register' && (
              <div className="form-group">
                <label htmlFor="auth-name">Your Full Name (Optional)</label>
                <input
                  id="auth-name"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Alex Morgan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="auth-email">Email</label>
              <div style={{ position: 'relative' }}>
                <UserIcon size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)' }} />
                <input
                  id="auth-email"
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: '34px' }}
                  placeholder="name@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label htmlFor="auth-password" style={{ margin: 0 }}>Password</label>
                {tab === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setTab('forgot');
                      setStatusMessage(null);
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                id="auth-password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {tab === 'register' && (
              <div className="form-group">
                <label htmlFor="auth-confirm-password">Confirm Password</label>
                <input
                  id="auth-confirm-password"
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            )}

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
                  lineHeight: 1.4,
                }}
              >
                {isError ? <AlertCircle size={18} style={{ flexShrink: 0 }} /> : <CheckCircle size={18} style={{ flexShrink: 0 }} />}
                <div>{statusMessage}</div>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
              style={{ width: '100%', padding: '12px', fontSize: '0.96rem' }}
            >
              {isSubmitting ? 'Processing...' : tab === 'signin' ? 'Sign In' : 'Create Account & Sign In'}
            </button>
          </form>
        )}

        <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '0.84rem', color: 'var(--fg-muted)' }}>
          {tab === 'signin' ? (
            <span>
              Don't have an account yet?{' '}
              <button type="button" onClick={() => { setTab('register'); setStatusMessage(null); }} style={{ background: 'none', border: 'none', color: 'var(--blue)', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                Create one
              </button>
            </span>
          ) : tab === 'register' ? (
            <span>
              Already registered?{' '}
              <button type="button" onClick={() => { setTab('signin'); setStatusMessage(null); }} style={{ background: 'none', border: 'none', color: 'var(--blue)', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                Sign in here
              </button>
            </span>
          ) : (
            <span>
              Remembered your password?{' '}
              <button type="button" onClick={() => { setTab('signin'); setStatusMessage(null); }} style={{ background: 'none', border: 'none', color: 'var(--blue)', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                Sign in here
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
