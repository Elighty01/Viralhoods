import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { FeedView } from './components/FeedView';
import { ArticleView } from './components/ArticleView';
import { AboutView } from './components/AboutView';
import { AdminView } from './components/AdminView';
import { BrandPage } from './components/BrandPage';
import { AuthModal } from './components/AuthModal';
import { AiAssistantDrawer } from './components/AiAssistantDrawer';
import { AiMediaStudioModal } from './components/AiMediaStudioModal';
import { NewsData, NewsItem, CATEGORIES, User } from './types';
import { auth, onAuthStateChanged, fbSignOut } from './firebase';
import {
  getCurrentUser,
  setCurrentUser as persistUser,
  clearCurrentUser,
  getBookmarks,
  toggleBookmark,
  getCustomStories,
  saveCustomStory,
  deleteCustomStory,
  addSubscriber,
} from './utils/storage';
import initialNewsData from '../data/news.json';

type ActiveView = 'feed' | 'story' | 'about' | 'admin' | 'brand';

export const App: React.FC = () => {
  const [view, setView] = useState<ActiveView>('feed');
  const [currentCategory, setCurrentCategory] = useState<string>('All');
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);

  // Raw news data & custom admin created stories
  const [newsData, setNewsData] = useState<NewsData>(initialNewsData as NewsData);
  const [customStories, setCustomStories] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // User auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);

  // AI Drawers and Studio Modals
  const [isAiChatOpen, setIsAiChatOpen] = useState<boolean>(false);
  const [isAiStudioOpen, setIsAiStudioOpen] = useState<boolean>(false);

  // Bookmarks
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [showOnlyBookmarks, setShowOnlyBookmarks] = useState<boolean>(false);

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Initialize theme, user, custom stories, and bookmarks on mount
  useEffect(() => {
    // 1. User from local storage
    const user = getCurrentUser();
    if (user) setCurrentUser(user);

    // 2. Firebase Auth Listener
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser && fbUser.email) {
        const syncd = persistUser(fbUser.email, fbUser.displayName || '');
        setCurrentUser(syncd);
      }
    });

    // 3. Bookmarks
    setBookmarks(getBookmarks());

    // 4. Custom stories
    setCustomStories(getCustomStories());

    // 5. Theme
    const savedTheme = localStorage.getItem('viralhoods_theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    }

    return () => unsubscribe();
  }, []);

  const handleToggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('viralhoods_theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Combine fetched items with user-generated custom stories
  const allStories = useMemo(() => {
    const baseItems = newsData?.items || [];
    const customIds = new Set(customStories.map((s) => s.id));
    const dedupedBase = baseItems.filter((b) => !customIds.has(b.id));
    return [...customStories, ...dedupedBase];
  }, [newsData, customStories]);

  // Active story lookup
  const currentActiveStory = useMemo(() => {
    if (!activeStoryId) return null;
    return allStories.find((s) => s.id === activeStoryId) || null;
  }, [allStories, activeStoryId]);

  // Sync state from window.location.hash
  const handleHashChange = useCallback(() => {
    const rawHash = decodeURIComponent(window.location.hash.slice(1)).trim();

    if (rawHash.startsWith('story-')) {
      const id = rawHash.replace('story-', '');
      setActiveStoryId(id);
      setView('story');
      return;
    }

    if (rawHash.toLowerCase() === 'about') {
      setView('about');
      return;
    }

    if (rawHash.toLowerCase() === 'brand') {
      setView('brand');
      return;
    }

    if (rawHash.toLowerCase() === 'admin') {
      setView('admin');
      return;
    }

    // Otherwise it's feed view
    setView('feed');
    setShowOnlyBookmarks(false);

    if (!rawHash || rawHash.toLowerCase() === 'all') {
      setCurrentCategory('All');
    } else {
      const match = CATEGORIES.find(
        (c) => c.toLowerCase() === rawHash.toLowerCase()
      );
      if (match) {
        setCurrentCategory(match);
      } else {
        setCurrentCategory('All');
      }
    }
  }, []);

  useEffect(() => {
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [handleHashChange]);

  // Fetch latest data from /data/news.json
  const fetchNews = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/data/news.json?t=${Date.now()}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data: NewsData = await response.json();
      setNewsData(data);
    } catch (err: any) {
      console.warn('Could not fetch dynamic news.json, using fallback data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  // Bookmark toggle
  const handleToggleBookmark = (storyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isSaved = toggleBookmark(storyId);
    setBookmarks((prev) => (isSaved ? [...prev, storyId] : prev.filter((id) => id !== storyId)));
  };

  // Internal Navigation Handlers
  const handleSelectCategory = (cat: string) => {
    setShowOnlyBookmarks(false);
    window.location.hash = cat;
  };

  const handleNavigateHome = () => {
    setShowOnlyBookmarks(false);
    window.location.hash = 'All';
  };

  const handleNavigateView = (targetView: 'about' | 'admin' | 'brand') => {
    window.location.hash = targetView;
  };

  const handleOpenStory = (item: NewsItem) => {
    window.location.hash = `story-${item.id}`;
  };

  const handleBackToFeed = () => {
    window.location.hash = currentCategory || 'All';
  };

  // Sign in / Sign out handlers
  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
  };

  const handleSignOut = async () => {
    try {
      await fbSignOut(auth);
    } catch (e) {
      // ignore
    }
    clearCurrentUser();
    setCurrentUser(null);
    if (view === 'admin') {
      window.location.hash = 'All';
    }
  };

  // Newsletter subscribe helper
  const handleSubscribe = (email: string): boolean => {
    return addSubscriber(email, 'newsletter_box');
  };

  // Admin Story operations
  const handleAddCustomStory = (story: NewsItem) => {
    setCustomStories((prev) => [story, ...prev]);
  };

  const handleDeleteStory = (storyId: string) => {
    setCustomStories((prev) => prev.filter((s) => s.id !== storyId));
    setNewsData((prev) => ({
      ...prev,
      items: prev.items.filter((s) => s.id !== storyId),
    }));
  };

  return (
    <>
      <Header
        currentCategory={currentCategory}
        isFeedView={view === 'feed'}
        onSelectCategory={handleSelectCategory}
        onNavigateHome={handleNavigateHome}
        onNavigateBrand={() => handleNavigateView('brand')}
        onNavigateAdmin={() => handleNavigateView('admin')}
        onOpenAiChat={() => setIsAiChatOpen(true)}
        onOpenAiStudio={() => setIsAiStudioOpen(true)}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onSignOut={handleSignOut}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        bookmarksCount={bookmarks.length}
        showOnlyBookmarks={showOnlyBookmarks}
        onToggleBookmarksFilter={() => setShowOnlyBookmarks((prev) => !prev)}
      />

      {view === 'feed' && (
        <FeedView
          items={allStories}
          updatedTime={newsData?.updated || ''}
          category={currentCategory}
          isLoading={isLoading}
          error={error}
          bookmarks={bookmarks}
          showOnlyBookmarks={showOnlyBookmarks}
          onClearBookmarksFilter={() => setShowOnlyBookmarks(false)}
          onToggleBookmark={handleToggleBookmark}
          onOpenStory={handleOpenStory}
          onSubscribe={handleSubscribe}
        />
      )}

      {view === 'story' && currentActiveStory && (
        <ArticleView
          story={currentActiveStory}
          allStories={allStories}
          isBookmarked={bookmarks.includes(currentActiveStory.id)}
          onToggleBookmark={handleToggleBookmark}
          onBack={handleBackToFeed}
          onOpenStory={handleOpenStory}
          onSubscribe={handleSubscribe}
        />
      )}

      {view === 'story' && !currentActiveStory && (
        <main className="w prose" style={{ margin: '60px auto', textAlign: 'center' }}>
          <h2>Story Not Found</h2>
          <p>The requested story could not be located or has been archived.</p>
          <button type="button" className="btn-primary" onClick={handleNavigateHome} style={{ maxWidth: '200px' }}>
            Return to Feed
          </button>
        </main>
      )}

      {view === 'about' && <AboutView />}

      {view === 'brand' && <BrandPage />}

      {view === 'admin' && (
        <AdminView
          currentUser={currentUser}
          onOpenAuth={() => setIsAuthOpen(true)}
          allStories={allStories}
          onAddStory={handleAddCustomStory}
          onDeleteStory={handleDeleteStory}
          onPreviewStory={handleOpenStory}
          onRefreshData={fetchNews}
        />
      )}

      <Footer currentUser={currentUser} onNavigate={handleNavigateView} />

      {/* Auth & Newsletter Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Gemini AI Assistant Drawer */}
      <AiAssistantDrawer
        isOpen={isAiChatOpen}
        onClose={() => setIsAiChatOpen(false)}
        activeSector={currentCategory}
      />

      {/* Gemini Media Studio Modal */}
      <AiMediaStudioModal
        isOpen={isAiStudioOpen}
        onClose={() => setIsAiStudioOpen(false)}
      />
    </>
  );
};

export default App;
