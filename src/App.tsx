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
import { LogOut, X } from 'lucide-react';
import { EntertainmentSubpage } from './components/EntertainmentHub';
import { auth, onAuthStateChanged, fbSignOut, db, getRedirectResult } from './firebase';
import { collection, getDocs, limit, query, orderBy } from 'firebase/firestore';
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
import { trackPageVisit } from './utils/analytics';
import { sanitizeNewsItem } from './utils/sanitize';
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
  const [authPromptMessage, setAuthPromptMessage] = useState<string | undefined>(undefined);

  // Entertainment Subpage State ('news' | 'videos' | 'music' | 'movies' | 'novels')
  const [entertainmentSubpage, setEntertainmentSubpage] = useState<EntertainmentSubpage>('news');

  // AI Drawers and Studio Modals
  const [isAiChatOpen, setIsAiChatOpen] = useState<boolean>(false);
  const [isAiStudioOpen, setIsAiStudioOpen] = useState<boolean>(false);
  const [pendingAiAction, setPendingAiAction] = useState<'chat' | 'studio' | null>(null);

  // Sign out confirmation modal state
  const [isSignOutConfirmOpen, setIsSignOutConfirmOpen] = useState<boolean>(false);

  // Bookmarks
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [showOnlyBookmarks, setShowOnlyBookmarks] = useState<boolean>(false);

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Initialize theme, user, custom stories, and bookmarks on mount
  useEffect(() => {
    const user = getCurrentUser();
    if (user) setCurrentUser(user);

    let mounted = true;

    getRedirectResult(auth)
      .then((result) => {
        if (!mounted || !result?.user?.email) return;
        const syncd = persistUser(result.user.email, result.user.displayName || '');
        setCurrentUser(syncd);
      })
      .catch((err) => {
        console.warn('Google redirect result note:', err);
      });

    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser && fbUser.email) {
        const syncd = persistUser(fbUser.email, fbUser.displayName || '');
        setCurrentUser(syncd);
      }
    });

    setBookmarks(getBookmarks());
    setCustomStories(getCustomStories());

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

    return () => {
      mounted = false;
      unsubscribe();
    };
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

  const allStories = useMemo(() => {
    const baseItems = newsData?.items || [];
    const customIds = new Set(customStories.map((s) => s.id));
    const dedupedBase = baseItems.filter((b) => !customIds.has(b.id));
    return [...customStories, ...dedupedBase].map(sanitizeNewsItem);
  }, [newsData, customStories]);

  const currentActiveStory = useMemo(() => {
    if (!activeStoryId) return null;
    return allStories.find((s) => s.id === activeStoryId) || null;
  }, [allStories, activeStoryId]);

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

    if (rawHash.toLowerCase().startsWith('entertainment')) {
      setView('feed');
      setShowOnlyBookmarks(false);
      setCurrentCategory('Entertainment');
      const parts = rawHash.split('/');
      if (parts[1]) {
        const sub = parts[1].toLowerCase();
        if (['videos', 'music', 'movies', 'novels', 'news'].includes(sub)) {
          setEntertainmentSubpage(sub as any);
        }
      } else {
        setEntertainmentSubpage('news');
      }
      return;
    }

    setView('feed');
    setShowOnlyBookmarks(false);

    if (!rawHash || rawHash.toLowerCase() === 'all') {
      setCurrentCategory('All');
    } else {
      const match = CATEGORIES.find((c) => c.toLowerCase() === rawHash.toLowerCase());
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

  useEffect(() => {
    let pageName = 'Home Feed (All 10 Sectors)';
    let path = window.location.hash || '#all';
    let category: string | undefined = undefined;
    let storyTitle: string | undefined = undefined;

    if (view === 'story') {
      storyTitle = currentActiveStory?.title || (activeStoryId ? `Story #${activeStoryId}` : 'Featured Article');
      pageName = `Story: ${storyTitle}`;
      category = currentActiveStory?.category;
      path = `#story-${activeStoryId}`;
    } else if (view === 'about') {
      pageName = 'About Viralhoods';
      path = '#about';
    } else if (view === 'brand') {
      pageName = 'Brand & Logo Kit';
      path = '#brand';
    } else if (view === 'admin') {
      pageName = 'Admin Editorial Console';
      path = '#admin';
    } else if (view === 'feed') {
      if (showOnlyBookmarks) {
        pageName = 'Saved Bookmarks';
        path = '#saved';
      } else if (currentCategory === 'Entertainment') {
        pageName = `Entertainment Hub (${entertainmentSubpage || 'news'})`;
        category = 'Entertainment';
        path = `#entertainment/${entertainmentSubpage || 'news'}`;
      } else if (currentCategory === 'All') {
        pageName = 'Home Feed (All 10 Sectors)';
        category = 'All';
        path = '#all';
      } else {
        pageName = `${currentCategory} Sector`;
        category = currentCategory;
        path = `#${currentCategory.toLowerCase()}`;
      }
    }

    trackPageVisit(pageName, path, {
      storyId: activeStoryId || undefined,
      storyTitle,
      category,
    });
  }, [view, currentCategory, entertainmentSubpage, activeStoryId, showOnlyBookmarks, currentActiveStory]);

  const fetchNews = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    let loadedItems: NewsItem[] = [];
    let updatedTime = new Date().toISOString();

    try {
      const base = (import.meta.env.BASE_URL || './').replace(/\/$/, '');
      const newsUrl = `${base}/data/news.json?t=${Date.now()}`;
      const response = await fetch(newsUrl);
      if (response.ok) {
        const data: NewsData = await response.json();
        if (data.items) {
          loadedItems = data.items;
          updatedTime = data.updated || updatedTime;
        }
      }
    } catch (err: any) {
      console.warn('Could not fetch dynamic news.json, using fallback data:', err);
    }

    try {
      const storiesQuery = query(collection(db, 'stories'), limit(100));
      const querySnap = await getDocs(storiesQuery);
      if (!querySnap.empty) {
        const firestoreStories: NewsItem[] = [];
        querySnap.forEach((docSnap) => {
          firestoreStories.push(docSnap.data() as NewsItem);
        });
        if (firestoreStories.length > 0) {
          const fsIds = new Set(firestoreStories.map((s) => s.id));
          const dedupedLocal = loadedItems.filter((item) => !fsIds.has(item.id));
          loadedItems = [...firestoreStories, ...dedupedLocal];
        }
      }
    } catch (fsErr) {
      console.warn('Note reading Firestore stories:', fsErr);
    }

    if (loadedItems.length > 0) {
      setNewsData({
        updated: updatedTime,
        items: loadedItems,
      });
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const handleToggleBookmark = (storyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isSaved = toggleBookmark(storyId);
    setBookmarks((prev) => (isSaved ? [...prev, storyId] : prev.filter((id) => id !== storyId)));
  };

  const handleSelectEntertainmentSubpage = (sub: EntertainmentSubpage) => {
    setEntertainmentSubpage(sub);
    window.location.hash = sub === 'news' ? 'Entertainment' : `Entertainment/${sub}`;
  };

  const handleOpenAuthWithMessage = (msg?: string) => {
    setAuthPromptMessage(msg);
    setIsAuthOpen(true);
  };

  const handleOpenAiAssistant = () => {
    setIsAiChatOpen(true);
  };

  const handleOpenAiStudio = () => {
    setIsAiStudioOpen(true);
  };

  const handleSelectCategory = (cat: string) => {
    setShowOnlyBookmarks(false);
    if (cat === 'Entertainment') {
      setEntertainmentSubpage('news');
    }
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

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    setAuthPromptMessage(undefined);
    setIsAuthOpen(false);

    if (pendingAiAction === 'chat') {
      setIsAiChatOpen(true);
      setPendingAiAction(null);
    } else if (pendingAiAction === 'studio') {
      setIsAiStudioOpen(true);
      setPendingAiAction(null);
    }
  };

  const handleRequestSignOut = () => {
    setIsSignOutConfirmOpen(true);
  };

  const handleConfirmSignOut = async () => {
    setIsSignOutConfirmOpen(false);
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

  const handleSubscribe = (email: string): boolean => {
    return addSubscriber(email, 'newsletter_box');
  };

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
        onOpenAiChat={handleOpenAiAssistant}
        onOpenAiStudio={handleOpenAiStudio}
        currentUser={currentUser}
        onOpenAuth={() => handleOpenAuthWithMessage()}
        onSignOut={handleRequestSignOut}
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
          currentUser={currentUser}
          onOpenAuth={handleOpenAuthWithMessage}
          entertainmentSubpage={entertainmentSubpage}
          onSelectEntertainmentSubpage={handleSelectEntertainmentSubpage}
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
          onOpenAuth={() => handleOpenAuthWithMessage()}
          onAuthorizeAdmin={(user) => setCurrentUser(user)}
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
        onClose={() => {
          setIsAuthOpen(false);
          setAuthPromptMessage(undefined);
        }}
        onSuccess={handleAuthSuccess}
        initialPromptMessage={authPromptMessage}
      />

      {/* Gemini AI Assistant Drawer */}
      <AiAssistantDrawer
        isOpen={isAiChatOpen}
        onClose={() => setIsAiChatOpen(false)}
        activeSector={currentCategory}
        currentUser={currentUser}
        onOpenAuth={handleOpenAuthWithMessage}
      />

      {/* Gemini Media Studio Modal */}
      <AiMediaStudioModal
        isOpen={isAiStudioOpen}
        onClose={() => setIsAiStudioOpen(false)}
        currentUser={currentUser}
        onOpenAuth={handleOpenAuthWithMessage}
      />

      {/* Sign Out Confirmation Modal */}
      {isSignOutConfirmOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsSignOutConfirmOpen(false)}
          role="dialog"
          aria-modal="true"
          style={{ zIndex: 120 }}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '440px',
              width: '90%',
              padding: '28px 24px',
              textAlign: 'center',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
              <button
                type="button"
                className="close-btn"
                onClick={() => setIsSignOutConfirmOpen(false)}
                aria-label="Cancel sign out"
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                color: '#ef4444',
              }}
            >
              <LogOut size={26} />
            </div>

            <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: 800 }}>
              Confirm Sign Out
            </h3>

            <p style={{ margin: '0 0 22px', color: 'var(--fg-muted)', fontSize: '0.9rem', lineHeight: 1.55 }}>
              Are you sure you want to sign out of Viralhoods
              {currentUser ? (
                <>
                  {' '}as <strong>{currentUser.name || currentUser.email}</strong>
                </>
              ) : null}
              ? You will need your login credentials to sign back in.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsSignOutConfirmOpen(false)}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleConfirmSignOut}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  background: '#ef4444',
                  borderColor: '#ef4444',
                  color: '#ffffff',
                }}
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default App;
