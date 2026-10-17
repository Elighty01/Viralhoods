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
  Palette,
  Sparkles,
  Film,
} from 'lucide-react';

interface HeaderProps {
  currentCategory: string;
  isFeedView: boolean;
  onSelectCategory: (category: string) => void;
  onNavigateHome: () => void;
  onNavigateBrand: () => void;
  onNavigateAdmin: () => void;
  onOpenAiChat: () => void;
  onOpenAiStudio: () => void;
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
  onSelectCategory,
  onNavigateHome,
  onNavigateBrand,
  onNavigateAdmin,
  onOpenAiChat,
  onOpenAiStudio,
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
        <div className="w ticker-inner">
          <div className="ticker-left">
            <span>{todayFormatted}</span>
            <span className="ticker-bullet">●</span>
            <span style={{ fontWeight: 600 }}>Global Edition</span>
            <span className="ticker-bullet">●</span>
            <span style={{ color: 'var(--fg-muted)' }}>10 Sectors Monitored in Real-Time</span>
          </div>

          <div className="ticker-right">
            <button
              type="button"
              onClick={onNavigateBrand}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--fg-muted)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.82rem',
                fontWeight: 600,
                padding: 0,
              }}
            >
              <Palette size={13} /> Brand & Logo Kit
            </button>
          </div>
        </div>
      </div>

      {/* Main Masthead Header */}
      <header id="h">
        <div className="w">
          <div className="top">
            <BrandLogo size="md" showTagline={true} onClick={onNavigateHome} />

            <div className="header-actions">
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
                style={{ fontWeight: 700 }}
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

              {/* Admin Button (ONLY VISIBLE TO OWNER yussufelijah@gmail.com) */}
              {currentUser?.isAdmin && (
                <button
                  type="button"
                  className="icon-btn"
                  onClick={onNavigateAdmin}
                  style={{
                    borderColor: '#ef4444',
                    color: '#ef4444',
                    background: 'rgba(239, 68, 68, 0.08)',
                    fontWeight: 700,
                  }}
                  title="Site Owner Admin Console"
                >
                  <Shield size={14} /> Admin
                </button>
              )}

              {/* User Authentication Status */}
              {currentUser ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="user-badge" title={`Signed in as ${currentUser.email}`}>
                    <div className="user-avatar">
                      {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
                    </div>
                    <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {currentUser.name || currentUser.email.split('@')[0]}
                    </span>
                    {currentUser.isAdmin && <span className="admin-pill">ADMIN</span>}
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
          </nav>
        </div>
      </header>
    </>
  );
};
