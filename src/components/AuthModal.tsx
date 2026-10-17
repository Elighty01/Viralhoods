import React, { useState } from 'react';
import { User, ADMIN_MASTER_PASSWORD, CHIEF_ADMIN_EMAIL } from '../types';
import {
  setCurrentUser,
  registerAccount,
  verifyAccountCredentials,
  verifyAdminPassword,
  isUserAdmin,
  findRegisteredAccount,
  resetAccountPassword,
} from '../utils/storage';
import { auth, googleProvider, signInWithPopup, db, sendPasswordResetEmail } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { X, Mail, CheckCircle, AlertCircle, UserPlus, LogIn, Lock, User as UserIcon, Sparkles, KeyRound, ArrowLeft } from 'lucide-react';

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

  // Form Fields
  const [identifier, setIdentifier] = useState(''); // username or gmail/email
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');

  // Password Recovery Fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPasswordResetFields, setShowPasswordResetFields] = useState(false);

  // UI status
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Sync subscriber or account to Firestore
  const syncToFirestore = async (userEmailOrUsername: string, isAccount = false) => {
    try {
      const cleanKey = userEmailOrUsername.replace(/[^a-zA-Z0-9]/g, '_');
      if (userEmailOrUsername.includes('@')) {
        const subRef = doc(db, 'subscribers', cleanKey);
        await setDoc(
          subRef,
          {
            email: userEmailOrUsername,
            subscribedAt: new Date().toISOString(),
            source: isAccount ? 'registration' : 'firebase_auth',
          },
          { merge: true }
        );
      }
      const memberRef = doc(db, 'members', cleanKey);
      await setDoc(
        memberRef,
        {
          identifier: userEmailOrUsername,
          lastActive: new Date().toISOString(),
          type: isAccount ? 'password_account' : 'google_auth',
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Firestore sync note:', err);
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
        throw new Error('Google account has no associated email address.');
      }

      await syncToFirestore(cleanEmail);
      const isAdmin = isUserAdmin(cleanEmail) || cleanEmail.toLowerCase() === CHIEF_ADMIN_EMAIL.toLowerCase();
      const user = setCurrentUser(cleanEmail, displayName, isAdmin);

      setStatusMessage(`Welcome ${displayName}! You are signed in.`);
      setTimeout(() => {
        onSuccess(user);
        onClose();
      }, 750);
    } catch (err: any) {
      console.warn('Google sign in note:', err);
      setIsError(true);
      setStatusMessage(
        err?.code === 'auth/popup-closed-by-user'
          ? 'Sign in window closed. You can also sign in with your username or password.'
          : 'Google sign in unavailable in this browser environment. Please use username & password below.'
      );
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setIsError(false);
    setStatusMessage(null);

    const cleanId = identifier.trim().toLowerCase();
    if (!cleanId) {
      setIsError(true);
      setStatusMessage('Please enter your registered email address or username.');
      setIsSubmitting(false);
      return;
    }

    // Step 1: If user wants to directly set a new password on a found account
    if (showPasswordResetFields) {
      if (!newPassword || newPassword.length < 6) {
        setIsError(true);
        setStatusMessage('New password must be at least 6 characters long.');
        setIsSubmitting(false);
        return;
      }
      if (newPassword !== confirmNewPassword) {
        setIsError(true);
        setStatusMessage('Passwords do not match. Please re-enter.');
        setIsSubmitting(false);
        return;
      }
      const resetRes = resetAccountPassword(cleanId, newPassword);
      if (resetRes.success) {
        setIsError(false);
        setStatusMessage(resetRes.message);
        setShowPasswordResetFields(false);
        setPassword(newPassword);
        setTimeout(() => {
          setTab('signin');
        }, 1800);
      } else {
        setIsError(true);
        setStatusMessage(resetRes.message);
      }
      setIsSubmitting(false);
      return;
    }

    // Step 2: Request recovery link or initiate reset
    let emailSent = false;
    if (cleanId.includes('@')) {
      try {
        await sendPasswordResetEmail(auth, cleanId);
        emailSent = true;
      } catch (err: any) {
        console.warn('Firebase sendPasswordResetEmail note:', err?.message || err);
      }
    }

    const localAccount = findRegisteredAccount(cleanId);
    if (localAccount || emailSent) {
      setIsError(false);
      setShowPasswordResetFields(true);
      setStatusMessage(
        emailSent
          ? `Password reset link dispatched to ${cleanId}! You can also set a new password below immediately.`
          : `Account verified for "${cleanId}". Enter your new password below to reset your credentials.`
      );
    } else {
      setIsError(true);
      setStatusMessage('No account found with this username or email. Please check your spelling or register.');
    }
    setIsSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setIsError(false);
    setStatusMessage(null);

    const cleanId = identifier.trim();

    if (!cleanId) {
      setIsError(true);
      setStatusMessage('Please enter your Gmail or username.');
      setIsSubmitting(false);
      return;
    }

    if (!password) {
      setIsError(true);
      setStatusMessage('Please enter your password.');
      setIsSubmitting(false);
      return;
    }

    if (tab === 'register') {
      // REGISTRATION FLOW
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

      const regResult = registerAccount(cleanId, password, name);
      if (!regResult.success) {
        setIsError(true);
        setStatusMessage(regResult.error || 'Failed to create account.');
        setIsSubmitting(false);
        return;
      }

      await syncToFirestore(cleanId, true);
      const isAdmin = verifyAdminPassword(password);
      const user = setCurrentUser(cleanId, name || cleanId.split('@')[0], isAdmin);

      setStatusMessage('Account created successfully! Welcome to Viralhoods.');
      setTimeout(() => {
        onSuccess(user);
        onClose();
      }, 800);
      setIsSubmitting(false);
      return;
    }

    // SIGN IN FLOW: Member MUST have an account first!
    const verifyResult = verifyAccountCredentials(cleanId, password);
    if (!verifyResult.success) {
      setIsError(true);
      setStatusMessage(verifyResult.error || 'Unable to sign in.');
      setIsSubmitting(false);
      return;
    }

    const acc = verifyResult.account!;
    const isAdmin = Boolean(acc.isAdmin || verifyAdminPassword(password));
    await syncToFirestore(cleanId, false);
    const user = setCurrentUser(cleanId, acc.name || cleanId.split('@')[0], isAdmin);

    setStatusMessage(`Welcome back${user.name ? ', ' + user.name : ''}!`);
    setTimeout(() => {
      onSuccess(user);
      onClose();
    }, 750);
    setIsSubmitting(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>
              {tab === 'signin'
                ? 'Sign In to Viralhoods'
                : tab === 'register'
                ? 'Create an Account'
                : 'Reset / Retrieve Password'}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.86rem', color: 'var(--fg-muted)' }}>
              {tab === 'signin'
                ? 'Members must have an account first before signing in.'
                : tab === 'register'
                ? 'Join Viralhoods with your Gmail or username and password.'
                : 'Enter your registered email or username to retrieve or reset your password.'}
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

        {/* Auth Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--line)',
            marginBottom: '18px',
            gap: '4px',
          }}
        >
            <button
              type="button"
              onClick={() => {
                setTab('signin');
                setStatusMessage(null);
                setShowPasswordResetFields(false);
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
                setShowPasswordResetFields(false);
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
                setShowPasswordResetFields(false);
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

        {/* Google Continue Button (only in signin or register) */}
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
                margin: '12px 0 16px',
                color: 'var(--fg-muted)',
                fontSize: '0.8rem',
              }}
            >
              <div style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
              <span>OR USE ACCOUNT CREDENTIALS</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
            </div>
          </>
        )}

        {/* FORGOT PASSWORD FORM */}
        {tab === 'forgot' ? (
          <form onSubmit={handleForgotPasswordSubmit}>
            <div style={{ marginBottom: '14px', background: 'var(--bg-subtle)', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--blue)', fontWeight: 700, fontSize: '0.88rem', marginBottom: '4px' }}>
                <Mail size={16} /> Password Recovery via Email
              </div>
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--fg-muted)', lineHeight: 1.45 }}>
                Enter your registered member email address below. We'll send an official password reset link directly to your email inbox so you can securely retrieve and update your credentials.
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="auth-forgot-id">Your Registered Member Email</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="auth-forgot-id"
                  type="text"
                  className="form-input"
                  placeholder="name@gmail.com or username"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  disabled={showPasswordResetFields}
                />
              </div>
            </div>

            {showPasswordResetFields && (
              <>
                <div className="form-group">
                  <label htmlFor="auth-new-password">New Password</label>
                  <input
                    id="auth-new-password"
                    type="password"
                    className="form-input"
                    placeholder="Enter new password (min. 6 chars)"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="auth-confirm-new-password">Confirm New Password</label>
                  <input
                    id="auth-confirm-new-password"
                    type="password"
                    className="form-input"
                    placeholder="Re-enter new password"
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                  />
                </div>
              </>
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
              style={{ width: '100%', padding: '12px', fontSize: '0.96rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {isSubmitting ? (
                'Processing...'
              ) : showPasswordResetFields ? (
                <>
                  <KeyRound size={16} /> Update Password & Sign In
                </>
              ) : (
                <>
                  <Mail size={16} /> Send Password Retrieval Email
                </>
              )}
            </button>
          </form>
        ) : (
          /* STANDARD SIGN IN / REGISTER FORM */
          <form onSubmit={handleSubmit}>
            {tab === 'register' && (
              <div className="form-group">
                <label htmlFor="auth-name">Your Full Name (Optional)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="auth-name"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Alex Morgan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="auth-id">Gmail or Username</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="auth-id"
                  type="text"
                  className="form-input"
                  placeholder={tab === 'register' ? 'user@gmail.com or username' : 'Enter your Gmail or username'}
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
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
                      setShowPasswordResetFields(false);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--blue)',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0,
                    }}
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
                <div>
                  {statusMessage}
                  {isError && tab === 'signin' && statusMessage.includes('create an account first') && (
                    <button
                      type="button"
                      onClick={() => {
                        setTab('register');
                        setStatusMessage(null);
                      }}
                      style={{
                        display: 'block',
                        marginTop: '4px',
                        background: 'none',
                        border: 'none',
                        color: 'var(--blue)',
                        fontWeight: 800,
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      Click here to create an account now →
                    </button>
                  )}
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
              style={{ width: '100%', padding: '12px', fontSize: '0.96rem' }}
            >
              {isSubmitting
                ? 'Processing...'
                : tab === 'signin'
                ? 'Sign In'
                : 'Create Account & Sign In'}
            </button>
          </form>
        )}

        <div
          style={{
            marginTop: '16px',
            textAlign: 'center',
            fontSize: '0.84rem',
            color: 'var(--fg-muted)',
          }}
        >
          {tab === 'signin' ? (
            <span>
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => {
                  setTab('register');
                  setStatusMessage(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--blue)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Create an account first
              </button>
            </span>
          ) : tab === 'register' ? (
            <span>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => {
                  setTab('signin');
                  setStatusMessage(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--blue)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Sign in here
              </button>
            </span>
          ) : (
            <span>
              Remembered your password?{' '}
              <button
                type="button"
                onClick={() => {
                  setTab('signin');
                  setStatusMessage(null);
                  setShowPasswordResetFields(false);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--blue)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Sign in here
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
