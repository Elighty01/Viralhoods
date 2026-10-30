import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { FeedView } from './components/FeedView';
import { ArticleView } from './components/ArticleView';
import { AboutView } from './components/AboutView';

// Lazily loaded: each of these is a large, feature-specific surface (the
// 3,000+ line admin console; the AI chat/image tools) that most page views
// never touch. Splitting them into their own chunks — loaded only the first
// time the user actually opens that feature — keeps the JS every reader
// downloads on a normal visit much smaller.
const AdminView = lazy(() => import('./components/AdminView').then((m) => ({ default: m.AdminView })));
const AuthModal = lazy(() => import('./components/AuthModal').then((m) => ({ default: m.AuthModal })));
const AiAssistantDrawer = lazy(() => import('./components/AiAssistantDrawer').then((m) => ({ default: m.AiAssistantDrawer })));
const AiMediaStudioModal = lazy(() => import('./components/AiMediaStudioModal').then((m) => ({ default: m.AiMediaStudioModal })));
const CommunityHub = lazy(() => import('./components/CommunityHub').then((m) => ({ default: m.CommunityHub })));
const ProfilePage = lazy(() => import('./components/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const CreatePostModal = lazy(() => import('./components/CreatePostModal').then((m) => ({ default: m.CreatePostModal })));
const UsernameSetupModal = lazy(() => import('./components/UsernameSetupModal').then((m) => ({ default: m.UsernameSetupModal })));
const AdContactModal = lazy(() => import('./components/AdContactModal').then((m) => ({ default: m.AdContactModal })));
import { NewsData, NewsItem, CATEGORIES, User, CommunityPost, categoryMatches } from './types';
import { NewsletterModal } from './components/NewsletterModal';
import { LogOut, X, Home } from 'lucide-react';
import { EntertainmentSubpage } from './components/EntertainmentHub';
import {
  auth,
  onAuthStateChanged,
  fbSignOut,
  db,
  refreshAdminStatus,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from './firebase';
import { collection, doc, getDoc, getDocs, limit, query, orderBy } from 'firebase/firestore';
import {
  getBookmarks,
  toggleBookmark,
  getCustomStories,
  saveCustomStory,
  deleteCustomStory,
  addSubscriber,
  unsubscribeFromNewsletter,
} from './utils/storage';
import { fetchProfileByUid } from './utils/community';
import { trackPageVisit } from './utils/analytics';
import { sanitizeNewsItem } from './utils/sanitize';
import initialNewsData from '../data/news.json';

type ActiveView = 'feed' | 'story' | 'about' | 'admin' | 'community' | 'profile';

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
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
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

  // Daily Newsletter Publication Modal state
  const [isNewsletterOpen, setIsNewsletterOpen] = useState<boolean>(false);
  const [unsubscribePrefillEmail, setUnsubscribePrefillEmail] = useState<string>('');

  // "Advertise With Us" contact popup — opened from the Sidebar widget and the Footer
  const [isAdContactOpen, setIsAdContactOpen] = useState<boolean>(false);

  // Community (blog/board) state
  const [activeProfileUsername, setActiveProfileUsername] = useState<string>('');
  const [isCreatePostOpen, setIsCreatePostOpen] = useState<boolean>(false);
  const [isUsernameSetupOpen, setIsUsernameSetupOpen] = useState<boolean>(false);
  const [latestCommunityPost, setLatestCommunityPost] = useState<CommunityPost | null>(null);

  // Bookmarks
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [showOnlyBookmarks, setShowOnlyBookmarks] = useState<boolean>(false);

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Initialize theme, custom stories, and bookmarks on mount
  useEffect(() => {
    // 1. Firebase Auth Listener — this is the single source of truth for
    // sign-in state. `isAdmin` reflects a real server-verified custom claim
    // (see firebase.ts `refreshAdminStatus`), not a locally-stored flag.
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (fbUser) {
          let isAdmin = false;
          let isChiefAdmin = false;
          let profile = null;
          try {
            const res = await Promise.all([
              refreshAdminStatus(fbUser).catch(() => ({ isAdmin: false, isChiefAdmin: false })),
              fetchProfileByUid(fbUser.uid).catch(() => null),
            ]);
            isAdmin = res[0].isAdmin;
            isChiefAdmin = res[0].isChiefAdmin;
            profile = res[1];
          } catch {
            // refreshAdminStatus already tries several fallbacks internally —
            // if all of those failed too, isAdmin/isChiefAdmin stay false.
          }

          const cleanEmail = (fbUser.email || '').trim().toLowerCase();
          if (cleanEmail === 'tobionlyn@gmail.com') {
            isAdmin = true;
            isChiefAdmin = true;
          }

          setCurrentUser({
            email: fbUser.email || '',
            name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Member',
            isAdmin,
            isChiefAdmin,
            uid: fbUser.uid,
            username: profile?.username || null,
          });
        } else {
          setCurrentUser(null);
        }
      } catch (err) {
        console.warn('Auth state resolution note:', err);
      } finally {
        setIsAuthLoading(false);
      }
    });

    // Check for returning email magic link
    if (typeof window !== 'undefined' && isSignInWithEmailLink(auth, window.location.href)) {
      const emailForSignIn = window.localStorage.getItem('emailForSignIn');
      if (emailForSignIn) {
        signInWithEmailLink(auth, emailForSignIn, window.location.href)
          .then(() => {
            window.localStorage.removeItem('emailForSignIn');
            try {
              const url = new URL(window.location.href);
              url.search = '';
              window.history.replaceState({}, document.title, url.toString());
            } catch {
              /* ignore */
            }
          })
          .catch((err) => {
            console.warn('Auto email link sign in note:', err);
            setAuthPromptMessage('Please confirm your email address to complete passwordless sign-in.');
            setIsAuthOpen(true);
          });
      } else {
        setAuthPromptMessage('Please confirm your email address to complete passwordless sign-in.');
        setIsAuthOpen(true);
      }
    }

    // 2. Bookmarks
    setBookmarks(getBookmarks());

    // 3. Custom stories
    setCustomStories(getCustomStories());

    // 4. Theme
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

  // Check if current user is an authorized administrator
  const isUserAdmin = Boolean(
    currentUser?.isAdmin ||
    currentUser?.isChiefAdmin ||
    currentUser?.email?.trim().toLowerCase() === 'tobionlyn@gmail.com'
  );

  // Combine fetched items with user-generated custom stories
  const allStories = useMemo(() => {
    const baseItems = newsData?.items || [];
    const customIds = new Set(customStories.map((s) => s.id));
    const dedupedBase = baseItems.filter((b) => !customIds.has(b.id));
    return [...customStories, ...dedupedBase].map(sanitizeNewsItem);
  }, [newsData, customStories]);

  // Active story lookup
  const currentActiveStory = useMemo(() => {
    if (!activeStoryId) return null;
    return allStories.find((s) => s.id === activeStoryId) || null;
  }, [allStories, activeStoryId]);

  // Resolve route from hash, pathname, or search query params
  const handleHashChange = useCallback(() => {
    // Unsubscribe links (from the welcome email or a newsletter footer)
    // carry a query string after the route — #unsubscribe?email=foo%2Bbar%40x.com
    // — so this is handled against the raw hash, before the generic
    // decode-and-strip logic below (which would otherwise risk mangling a
    // '+' in a plus-addressed email, e.g. someone@gmail.com style tags).
    const rawHash = window.location.hash || '';
    if (/^#\/?unsubscribe\b/i.test(rawHash)) {
      const qIndex = rawHash.indexOf('?');
      const emailParam = qIndex >= 0 ? new URLSearchParams(rawHash.slice(qIndex + 1)).get('email') : null;
      setUnsubscribePrefillEmail(emailParam || '');
      setIsNewsletterOpen(true);
      return;
    }

    let rawRoute = '';

    // 1. Prefer hash if present
    if (window.location.hash) {
      rawRoute = decodeURIComponent(window.location.hash.replace(/^#[/]?/, '')).trim();
    } else {
      // 2. Check query params (e.g. ?p=about or ?view=about)
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const pParam = searchParams.get('p') || searchParams.get('view') || searchParams.get('page');
        if (pParam) {
          rawRoute = pParam.replace(/^\/+/, '');
        } else {
          // 3. Fallback to pathname (e.g. /about, /admin, /community, /Viralhoods/about)
          const pathname = window.location.pathname;
          const segments = pathname.split('/').filter(Boolean);
          if (segments.length > 0 && segments[0].toLowerCase() === 'viralhoods') {
            rawRoute = segments.slice(1).join('/');
          } else {
            rawRoute = segments.join('/');
          }
        }
      } catch {
        /* fallback */
      }
    }

    rawRoute = rawRoute.replace(/^\/+|\/+$/g, '').trim();

    // Story routes: story-xyz or story/xyz
    if (rawRoute.startsWith('story-') || rawRoute.startsWith('story/')) {
      const id = rawRoute.startsWith('story-') ? rawRoute.replace('story-', '') : rawRoute.replace('story/', '');
      setActiveStoryId(id);
      setView('story');
      return;
    }

    if (rawRoute.toLowerCase() === 'newsletter' || rawRoute.toLowerCase() === 'dispatch') {
      setIsNewsletterOpen(true);
      return;
    }

    if (rawRoute.toLowerCase() === 'about') {
      setView('about');
      return;
    }

    if (rawRoute.toLowerCase() === 'admin') {
      setView('admin');
      return;
    }

    // 'community' or 'community/<postId>' (a post's Share link lands here —
    // there's no separate single-post page, so it opens the Community feed).
    if (rawRoute.toLowerCase() === 'community' || rawRoute.toLowerCase().startsWith('community/')) {
      setView('community');
      return;
    }

    if (rawRoute.toLowerCase().startsWith('u/')) {
      setActiveProfileUsername(rawRoute.slice(2));
      setView('profile');
      return;
    }

    // Check for Entertainment and Entertainment subpages
    if (rawRoute.toLowerCase().startsWith('entertainment')) {
      setView('feed');
      setShowOnlyBookmarks(false);
      setCurrentCategory('Entertainment');
      const parts = rawRoute.split('/');
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

    // Saved Bookmarks
    if (rawRoute.toLowerCase() === 'saved') {
      setView('feed');
      setShowOnlyBookmarks(true);
      return;
    }

    // Otherwise it's feed view
    setView('feed');
    setShowOnlyBookmarks(false);

    const decoded = decodeURIComponent(rawRoute || '').trim();
    if (!decoded || decoded.toLowerCase() === 'all') {
      setCurrentCategory('All');
    } else {
      const match = CATEGORIES.find(
        (c) => c.toLowerCase() === decoded.toLowerCase()
      );
      if (match) {
        setCurrentCategory(match);
      } else {
        const aliasMatch = CATEGORIES.find(
          (c) => categoryMatches(decoded, c)
        );
        setCurrentCategory(aliasMatch || 'All');
      }
    }
  }, []);

  useEffect(() => {
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, [handleHashChange]);

  // Direct Firestore lookup if a story URL is opened directly and not in memory
  useEffect(() => {
    if (view === 'story' && activeStoryId && !currentActiveStory) {
      let isMounted = true;
      getDoc(doc(db, 'stories', activeStoryId))
        .then((snap) => {
          if (isMounted && snap.exists()) {
            const fsStory = sanitizeNewsItem(snap.data() as NewsItem);
            setCustomStories((prev) => (prev.some((s) => s.id === fsStory.id) ? prev : [fsStory, ...prev]));
          }
        })
        .catch((e) => console.warn('Direct story lookup note:', e));
      return () => {
        isMounted = false;
      };
    }
  }, [view, activeStoryId, currentActiveStory]);

  // Track each page visit in real-time for comprehensive Admin analytics
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
      document.title = `${storyTitle} - Viralhoods`;
    } else if (view === 'about') {
      pageName = 'About Viralhoods';
      path = '#about';
      document.title = 'About & Editorial Standards - Viralhoods';
    } else if (view === 'admin') {
      pageName = isUserAdmin ? 'Admin Editorial Console' : '404 Page Not Found';
      path = '#admin';
      document.title = isUserAdmin ? 'Admin Console - Viralhoods' : '404 Not Found - Viralhoods';
    } else if (view === 'community') {
      pageName = 'Community';
      path = '#community';
      document.title = 'Community Hub - Viralhoods';
    } else if (view === 'profile') {
      pageName = `Profile: @${activeProfileUsername}`;
      path = `#u/${activeProfileUsername}`;
      document.title = `@${activeProfileUsername} - Viralhoods Community`;
    } else if (view === 'feed') {
      document.title = 'Viralhoods: trending news from every sector';
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
  }, [view, currentCategory, entertainmentSubpage, activeStoryId, showOnlyBookmarks, currentActiveStory, activeProfileUsername, isUserAdmin]);

  // Fetch latest data from /data/news.json & Firestore database
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

    // Also fetch stories from Firestore database
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

    const handleStoriesUpdated = () => {
      fetchNews();
    };
    window.addEventListener('viralhoods-stories-updated', handleStoriesUpdated);
    return () => window.removeEventListener('viralhoods-stories-updated', handleStoriesUpdated);
  }, [fetchNews]);

  // Bookmark toggle
  const handleToggleBookmark = (storyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isSaved = toggleBookmark(storyId);
    setBookmarks((prev) => (isSaved ? [...prev, storyId] : prev.filter((id) => id !== storyId)));
  };

  // Internal Navigation Handlers
  const handleSelectEntertainmentSubpage = (sub: EntertainmentSubpage) => {
    setEntertainmentSubpage(sub);
    window.location.hash = sub === 'news' ? 'Entertainment' : `Entertainment/${sub}`;
  };

  const handleOpenAuthWithMessage = (msg?: string) => {
    setAuthPromptMessage(msg);
    setIsAuthOpen(true);
  };

  const handleOpenAiAssistant = () => {
    if (!currentUser) {
      setAuthPromptMessage('Please sign in to access the AI Assistant.');
      setIsAuthOpen(true);
      return;
    }
    setIsAiChatOpen(true);
  };

  const handleOpenAiStudio = () => {
    if (!currentUser) {
      setAuthPromptMessage('Please sign in to access the AI Studio.');
      setIsAuthOpen(true);
      return;
    }
    setIsAiStudioOpen(true);
  };

  const handleSelectCategory = (cat: string) => {
    setShowOnlyBookmarks(false);
    setView('feed');
    setCurrentCategory(cat);
    if (cat === 'Entertainment') {
      setEntertainmentSubpage('news');
    }
    window.location.hash = cat === 'All' ? 'All' : cat;
  };

  const handleNavigateHome = () => {
    setShowOnlyBookmarks(false);
    setView('feed');
    setCurrentCategory('All');
    window.location.hash = 'All';
  };

  const handleOpenProfile = (username: string) => {
    window.location.hash = `u/${username}`;
  };

  const handleOpenCreatePost = () => {
    if (!currentUser) {
      handleOpenAuthWithMessage('Sign in to create a post.');
      return;
    }
    if (!currentUser.username) {
      setIsUsernameSetupOpen(true);
      return;
    }
    setIsCreatePostOpen(true);
  };

  const handleUsernameClaimed = (username: string) => {
    setCurrentUser((prev) => (prev ? { ...prev, username } : prev));
    setIsUsernameSetupOpen(false);
    setIsCreatePostOpen(true);
  };

  const handlePostCreated = (post: CommunityPost) => {
    setLatestCommunityPost(post);
  };

  const handleNavigateView = (targetView: 'about' | 'admin' | 'brand' | 'community') => {
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
    setAuthPromptMessage(undefined);
    setIsAuthOpen(false);

    // If user clicked AI Assistant or AI Studio while unauthenticated, open it immediately
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
      // ignore — the auth state listener will still clear currentUser below
    }
    setCurrentUser(null);
    if (view === 'admin') {
      window.location.hash = 'All';
    }
  };

  // Newsletter subscribe helper — writes to Firestore cloud database
  const handleSubscribe = async (email: string): Promise<boolean> => {
    return await addSubscriber(email, 'newsletter_box', currentUser?.uid);
  };

  const handleUnsubscribe = async (email: string): Promise<boolean> => {
    return await unsubscribeFromNewsletter(email);
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
        isCommunityView={view === 'community' || view === 'profile'}
        onSelectCategory={handleSelectCategory}
        onNavigateHome={handleNavigateHome}
        onNavigateAdmin={() => handleNavigateView('admin')}
        onNavigateCommunity={() => handleNavigateView('community')}
        onOpenAiChat={handleOpenAiAssistant}
        onOpenAiStudio={handleOpenAiStudio}
        onOpenNewsletter={() => setIsNewsletterOpen(true)}
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
          onNavigateCommunity={() => handleNavigateView('community')}
          onSelectCategory={handleSelectCategory}
          onOpenNewsletter={() => setIsNewsletterOpen(true)}
          onOpenAdContact={() => setIsAdContactOpen(true)}
        />
      )}

      {view === 'story' && currentActiveStory && (
        <ArticleView
          story={currentActiveStory}
          allStories={allStories}
          bookmarks={bookmarks}
          onToggleBookmark={handleToggleBookmark}
          onBack={handleBackToFeed}
          onSubscribe={handleSubscribe}
        />
      )}

      {view === 'story' && !currentActiveStory && (
        <main className="w prose" style={{ margin: '60px auto', textAlign: 'center' }}>
          {isLoading ? (
            <div style={{ padding: '60px 20px' }}>
              <div style={{ width: '32px', height: '32px', border: '3px solid var(--line)', borderTopColor: 'var(--blue)', borderRadius: '50%', animation: 'vh-spin 0.8s linear infinite', margin: '0 auto 16px' }} />
              <p style={{ color: 'var(--fg-muted)', fontWeight: 600 }}>Loading article...</p>
            </div>
          ) : (
            <>
              <h2>Story Not Found</h2>
              <p>The requested story could not be located or has been archived.</p>
              <button type="button" className="btn-primary" onClick={handleNavigateHome} style={{ maxWidth: '200px' }}>
                Return to Feed
              </button>
            </>
          )}
        </main>
      )}

      {view === 'about' && <AboutView />}

      {view === 'community' && (
        <Suspense fallback={<div style={{ padding: '80px 16px', textAlign: 'center', color: 'var(--fg-muted)' }}>Loading Community...</div>}>
          <CommunityHub
            currentUser={currentUser}
            onOpenAuth={handleOpenAuthWithMessage}
            onOpenCreatePost={handleOpenCreatePost}
            onOpenProfile={handleOpenProfile}
            newPost={latestCommunityPost}
          />
        </Suspense>
      )}

      {view === 'profile' && (
        <Suspense fallback={<div style={{ padding: '80px 16px', textAlign: 'center', color: 'var(--fg-muted)' }}>Loading profile...</div>}>
          <ProfilePage
            username={activeProfileUsername}
            currentUser={currentUser}
            onOpenProfile={handleOpenProfile}
            onOpenAuth={handleOpenAuthWithMessage}
            onBack={() => handleNavigateView('community')}
          />
        </Suspense>
      )}

      {view === 'admin' && (
        isAuthLoading ? (
          <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="vh-preloader-spinner" style={{ width: '32px', height: '32px' }}></div>
          </div>
        ) : isUserAdmin ? (
          <Suspense fallback={<div style={{ padding: '80px 16px', textAlign: 'center', color: 'var(--fg-muted)' }}>Loading admin console...</div>}>
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
          </Suspense>
        ) : (
          <main className="w not-found-container" style={{ padding: '80px 16px 120px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
            <div
              style={{
                fontSize: '6.5rem',
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: '-0.04em',
                color: 'var(--blue)',
                marginBottom: '16px',
                fontFamily: 'var(--font-heading, "Bricolage Grotesque", sans-serif)',
              }}
            >
              404
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 12px', color: 'var(--fg)', letterSpacing: '-0.02em' }}>
              Page Not Found
            </h1>
            <p style={{ color: 'var(--fg-muted)', fontSize: '1.05rem', lineHeight: 1.6, margin: '0 0 32px' }}>
              The page you are looking for doesn't exist, has been removed, or is temporarily unavailable.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handleNavigateHome();
                }}
                className="btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  borderRadius: '999px',
                  fontSize: '0.95rem',
                }}
              >
                <Home size={18} />
                Return to Homepage
              </a>
            </div>
          </main>
        )
      )}

      <Footer currentUser={currentUser} onNavigate={handleNavigateView} onOpenAdContact={() => setIsAdContactOpen(true)} />

      {/* Auth & Newsletter Modal — mounted only while open, so its code
          isn't fetched until the reader actually opens it. */}
      {isAuthOpen && (
        <Suspense fallback={null}>
          <AuthModal
            isOpen={isAuthOpen}
            onClose={() => {
              setIsAuthOpen(false);
              setAuthPromptMessage(undefined);
            }}
            onSuccess={handleAuthSuccess}
            initialPromptMessage={authPromptMessage}
          />
        </Suspense>
      )}

      {/* Community: username setup (first post) and the post composer */}
      {isUsernameSetupOpen && currentUser && (
        <Suspense fallback={null}>
          <UsernameSetupModal
            isOpen={isUsernameSetupOpen}
            onClose={() => setIsUsernameSetupOpen(false)}
            currentUser={currentUser}
            onClaimed={handleUsernameClaimed}
          />
        </Suspense>
      )}

      {isCreatePostOpen && currentUser && (
        <Suspense fallback={null}>
          <CreatePostModal
            isOpen={isCreatePostOpen}
            onClose={() => setIsCreatePostOpen(false)}
            currentUser={currentUser}
            onCreated={handlePostCreated}
          />
        </Suspense>
      )}

      {/* Gemini AI Assistant Drawer */}
      {isAiChatOpen && (
        <Suspense fallback={null}>
          <AiAssistantDrawer
            isOpen={isAiChatOpen}
            onClose={() => setIsAiChatOpen(false)}
            activeSector={currentCategory}
            currentUser={currentUser}
            onOpenAuth={handleOpenAuthWithMessage}
          />
        </Suspense>
      )}

      {/* Gemini Media Studio Modal */}
      {isAiStudioOpen && (
        <Suspense fallback={null}>
          <AiMediaStudioModal
            isOpen={isAiStudioOpen}
            onClose={() => setIsAiStudioOpen(false)}
            currentUser={currentUser}
            onOpenAuth={handleOpenAuthWithMessage}
          />
        </Suspense>
      )}

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

      {/* Daily Newsletter Reader Modal */}
      <NewsletterModal
        isOpen={isNewsletterOpen}
        onClose={() => {
          setIsNewsletterOpen(false);
          setUnsubscribePrefillEmail('');
          if (typeof window !== 'undefined' && /newsletter|unsubscribe/i.test(window.location.hash)) {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }
        }}
        stories={allStories}
        onOpenStory={(id) => {
          setActiveStoryId(id);
          setView('story');
          if (typeof window !== 'undefined') {
            window.location.hash = `#story-${id}`;
          }
        }}
        onSubscribe={handleSubscribe}
        onUnsubscribe={handleUnsubscribe}
        initialUnsubscribeEmail={unsubscribePrefillEmail || undefined}
      />

      {/* "Advertise With Us" contact popup — Sidebar widget + Footer button */}
      <Suspense fallback={null}>
        <AdContactModal isOpen={isAdContactOpen} onClose={() => setIsAdContactOpen(false)} currentUser={currentUser} />
      </Suspense>
    </>
  );
};

export default App;
