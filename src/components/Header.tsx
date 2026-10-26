import React from 'react';
import { CATEGORIES, User } from '../types';
import { BrandLogo } from './BrandLogo';
import {
  Sun,
  Moon,
  Bookmark,
  Shield,
  LogIn,
  LogOut,
  Sparkles,
  Film,
  Users,
  Mail,
} from 'lucide-react';

interface HeaderProps {
  currentCategory: string;
  isFeedView: boolean;
  isCommunityView: boolean;
  onSelectCategory: (category: string) => void;
  onNavigateHome: () => void;
  onNavigateAdmin: () => void;
  onNavigateCommunity: () => void;
  onOpenAiChat: () => void;
  onOpenAiStudio: () => void;
  onOpenNewsletter?: () => void;
  currentUser: User | null;
  onOpenAuth: () => void;
  onSignOut: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  bookmarksCount: number;
  showOnlyBookmarks: boolean;
  onToggleBookmarksFilter: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentCategory,
  isFeedView,
  isCommunityView,
  onSelectCategory,
  onNavigateHome,
  onNavigateAdmin,
  onNavigateCommunity,
  onOpenAiChat,
  onOpenAiStudio,
  onOpenNewsletter,
  currentUser,
  onOpenAuth,
  onSignOut,
  theme,
  onToggleTheme,
  bookmarksCount,
  showOnlyBookmarks,
  onToggleBookmarksFilter,
}) => {
  const allCategories = ['All', ...CATEGORIES];

  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  return (
    <>
      {/* Top Edition Ticker */}
      <div className="top-ticker">
        <div className="w ticker-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div className="ticker-left" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{todayFormatted}</span>
            <span className="ticker-bullet">●</span>
            <span style={{ fontWeight: 600 }}>Global Edition</span>
            <span className="ticker-bullet">●</span>
            <span style={{ color: 'var(--fg-muted)' }}>10 Sectors Monitored in Real-Time</span>
          </div>

          {onOpenNewsletter && (
            <button
              type="button"
              onClick={onOpenNewsletter}
              style={{
                background: 'rgba(217, 119, 6, 0.14)',
                border: '1px solid rgba(217, 119, 6, 0.4)',
                color: '#d97706',
                padding: '3px 10px',
                borderRadius: '12px',
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
              }}
              title="Open Today's 10-Sector Executive Newsletter"
            >
              <Mail size={12} /> Today's 10-Sector Newsletter Dispatch
            </button>
          )}
        </div>
      </div>

      {/* Main Masthead Header */}
      <header id="h">
        <div className="w">
          <div className="top">
            <BrandLogo size="md" showTagline={true} onClick={onNavigateHome} />

            <div className="header-actions">
              {/* Daily Newsletter Button */}
              {onOpenNewsletter && (
                <button
                  type="button"
                  className="icon-btn"
                  onClick={onOpenNewsletter}
                  style={{
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    borderColor: 'rgba(217, 119, 6, 0.4)',
                    background: 'rgba(217, 119, 6, 0.08)',
                    color: 'var(--fg)',
                  }}
                  title="Read Today's 10-Sector Newsletter Digest"
                >
                  <Mail size={14} style={{ color: '#d97706' }} /> Newsletter
                </button>
              )}

              {/* AI Chatbot Assistant Button */}
              <button
                type="button"
                className="icon-btn"
                onClick={onOpenAiChat}
                style={{
                  background: 'var(--blue-tint)',
                  borderColor: 'var(--blue)',
                  color: 'var(--blue)',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                title="Open Viralhoods AI Intelligence Assistant"
              >
                <Sparkles size={14} /> AI Assistant
              </button>

              {/* AI Media Studio Button (Veo 3, Nano Banana, Lyria) */}
              <button
                type="button"
                className="icon-btn"
                onClick={onOpenAiStudio}
                style={{
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                title="Open AI Media Studio (Veo 3, Images, Audio & Maps)"
              >
                <Film size={14} /> AI Studio
              </button>

              {/* Theme Toggle Button */}
              <button
                type="button"
                className="theme-toggle-btn"
                onClick={onToggleTheme}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                aria-label="Toggle visual theme"
              >
                {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                <span style={{ fontSize: '0.8rem' }}>{theme === 'dark' ? 'Light' : 'Dark'}</span>
              </button>

              {/* Bookmarks Filter */}
              <button
                type="button"
                className={`icon-btn ${showOnlyBookmarks ? 'on' : ''}`}
                onClick={onToggleBookmarksFilter}
                style={{
                  background: showOnlyBookmarks ? 'var(--blue-tint)' : 'transparent',
                  color: showOnlyBookmarks ? 'var(--blue)' : 'inherit',
                  borderColor: showOnlyBookmarks ? 'var(--blue)' : 'var(--line)',
                }}
                title="View saved stories"
              >
                <Bookmark size={15} fill={bookmarksCount > 0 ? 'currentColor' : 'none'} />
                <span>Saved ({bookmarksCount})</span>
              </button>

              {/* Discreet Editorial Console Button for Authorized Session */}
              {currentUser?.isAdmin && (
                <button
                  type="button"
                  className="icon-btn"
                  onClick={onNavigateAdmin}
                  style={{ fontWeight: 600 }}
                  title="Editorial Management Console"
                >
                  <Shield size={14} /> Console
                </button>
              )}

              {/* User Authentication Status */}
              {currentUser ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="user-badge" title={`Signed in as ${currentUser.name || currentUser.email}`}>
                    <div className="user-avatar">
                      {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
                    </div>
                    <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {currentUser.name || currentUser.email.split('@')[0]}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="icon-btn"
                    onClick={onSignOut}
                    title="Sign out of Viralhoods"
                    aria-label="Sign out"
                  >
                    <LogOut size={14} />
                  </button>
                </div>
              ) : (
                <button type="button" className="auth-btn" onClick={onOpenAuth}>
                  <LogIn size={15} /> Sign In
                </button>
              )}
            </div>
          </div>

          {/* Category Navigation Bar */}
          <nav className="category-nav" aria-label="News categories">
            {allCategories.map((c) => {
              const isActive = isFeedView && !showOnlyBookmarks && currentCategory === c;
              return (
                <button
                  key={c}
                  type="button"
                  className={`nav-tab ${isActive ? 'on' : ''}`}
                  onClick={() => onSelectCategory(c)}
                >
                  {c}
                </button>
              );
            })}
            <button
              type="button"
              className={`nav-tab ${isCommunityView ? 'on' : ''}`}
              onClick={onNavigateCommunity}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <Users size={13} /> Community
            </button>
          </nav>
        </div>
      </header>
    </>
  );
};
