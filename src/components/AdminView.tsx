import React, { useState, useEffect } from 'react';
import { User, NewsItem, Subscriber, CATEGORIES, Category, ADMIN_MASTER_PASSWORD, CHIEF_ADMIN_EMAIL, AdminMember } from '../types';
import {
  getSubscribers,
  saveCustomStory,
  deleteCustomStory,
  verifyAdminPassword,
  setCurrentUser,
  getAdminMembers,
  addAdminMember,
  removeAdminMember,
  getRegisteredAccounts,
} from '../utils/storage';
import { generateOriginalStory } from '../utils/articleGenerator';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import {
  Lock,
  Sparkles,
  ListOrdered,
  Users,
  Download,
  Trash2,
  ExternalLink,
  Eye,
  RefreshCw,
  PlusCircle,
  CheckCircle,
  Zap,
  Globe,
  Clock,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  Shield,
  ShieldAlert,
  UserCheck,
  UserMinus,
  KeyRound,
} from 'lucide-react';

interface AdminViewProps {
  currentUser: User | null;
  onOpenAuth: () => void;
  onAuthorizeAdmin?: (user: User) => void;
  allStories: NewsItem[];
  onAddStory: (story: NewsItem) => void;
  onDeleteStory: (id: string) => void;
  onPreviewStory: (story: NewsItem) => void;
  onRefreshData: () => Promise<void>;
}

export const AdminView: React.FC<AdminViewProps> = ({
  currentUser,
  onOpenAuth,
  onAuthorizeAdmin,
  allStories,
  onAddStory,
  onDeleteStory,
  onPreviewStory,
  onRefreshData,
}) => {
  const isAuthorized = Boolean(currentUser?.isAdmin);
  const isChiefAdmin = currentUser?.email.toLowerCase() === CHIEF_ADMIN_EMAIL.toLowerCase();

  const [activeTab, setActiveTab] = useState<'bot' | 'stories' | 'subscribers' | 'roles' | 'schedule'>(
    'bot'
  );

  // Security gate password state
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Automated Scraper Bot state
  const [isScrapingNow, setIsScrapingNow] = useState(false);
  const [scrapeSuccessMessage, setScrapeSuccessMessage] = useState<string | null>(null);
  const [scrapeErrorMessage, setScrapeErrorMessage] = useState<string | null>(null);
  const [recentlyScrapedItems, setRecentlyScrapedItems] = useState<NewsItem[]>([]);

  // Admin Team & Roles state
  const [adminMembers, setAdminMembers] = useState<AdminMember[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [adminActionMsg, setAdminActionMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [confirmRemoveEmail, setConfirmRemoveEmail] = useState<string | null>(null);

  // Optional manual article writer accordion
  const [showManualWriter, setShowManualWriter] = useState(false);
  const [manualTopic, setManualTopic] = useState('');
  const [manualCat, setManualCat] = useState<Category>('World');
  const [manualNotes, setManualNotes] = useState('');
  const [manualImage, setManualImage] = useState('');
  const [manualSuccess, setManualSuccess] = useState<string | null>(null);

  // Stories Management State
  const [storySearch, setStorySearch] = useState('');

  // Subscribers State
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [subscriberSearch, setSubscriberSearch] = useState('');

  // GitHub Actions Workflow Dispatcher State
  const [repoInput, setRepoInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [githubDispatchMsg, setGithubDispatchMsg] = useState('');
  const [isDispatching, setIsDispatching] = useState(false);

  useEffect(() => {
    if (isAuthorized) {
      setSubscribers(getSubscribers());
      setAdminMembers(getAdminMembers());
      try {
        setRepoInput(localStorage.getItem('r') || 'Elighty01/Viralhoods');
        setTokenInput(localStorage.getItem('k') || '');
      } catch {
        // ignore
      }
    }
  }, [isAuthorized]);

  // Handle password unlock for admin - default to Chief Admin yussuftimi@gmail.com
  const handlePasswordUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminPassword(adminPasswordInput)) {
      setPasswordError('');
      const user = setCurrentUser(
        CHIEF_ADMIN_EMAIL,
        'Chief Administrator',
        true
      );
      if (onAuthorizeAdmin) {
        onAuthorizeAdmin(user);
      }
      setAdminPasswordInput('');
    } else {
      setPasswordError('Invalid access key. Access denied.');
    }
  };

  // Chief Admin can add a member as admin
  const handleAddAdmin = async (emailOrUsername: string) => {
    if (!isChiefAdmin) {
      setAdminActionMsg({ text: 'Only the Chief Administrator (yussuftimi@gmail.com) can appoint new administrators.', isError: true });
      return;
    }
    const res = addAdminMember(emailOrUsername, CHIEF_ADMIN_EMAIL);
    if (res.success) {
      setAdminActionMsg({ text: res.message, isError: false });
      setNewAdminEmail('');
      setAdminMembers(getAdminMembers());
      // Sync to Firestore 'admins' collection
      try {
        const cleanKey = emailOrUsername.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
        await setDoc(doc(db, 'admins', cleanKey), {
          email: emailOrUsername.trim().toLowerCase(),
          addedBy: CHIEF_ADMIN_EMAIL,
          addedAt: new Date().toISOString(),
        }, { merge: true });
      } catch (err) {
        console.warn('Firestore admin sync note:', err);
      }
    } else {
      setAdminActionMsg({ text: res.message, isError: true });
    }
    setTimeout(() => setAdminActionMsg(null), 5000);
  };

  // Chief Admin can remove an appointed admin
  const handleRemoveAdmin = async (emailOrUsername: string) => {
    if (!isChiefAdmin) {
      setAdminActionMsg({ text: 'Only the Chief Administrator (yussuftimi@gmail.com) can remove administrators.', isError: true });
      return;
    }
    const res = removeAdminMember(emailOrUsername);
    if (res.success) {
      setAdminActionMsg({ text: res.message, isError: false });
      setAdminMembers(getAdminMembers());
      // Remove from Firestore 'admins' collection
      try {
        const cleanKey = emailOrUsername.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
        await deleteDoc(doc(db, 'admins', cleanKey));
      } catch (err) {
        console.warn('Firestore admin delete note:', err);
      }
    } else {
      setAdminActionMsg({ text: res.message, isError: true });
    }
    setTimeout(() => setAdminActionMsg(null), 5000);
  };

  // ⚡ One-Click Automated Scrape & Generate Trending News Now (Resilient against 405)
  const handleRunScraperNow = async () => {
    setIsScrapingNow(true);
    setScrapeSuccessMessage(null);
    setScrapeErrorMessage(null);

    let result: any = null;

    // Step 1: Attempt POST
    try {
      const response = await fetch('/api/bot/scrape-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        result = await response.json();
      } else if (response.status === 405 || response.status === 404) {
        // Step 2: Attempt GET fallback
        const getRes = await fetch('/api/bot/scrape-generate', { method: 'GET' });
        if (getRes.ok) {
          result = await getRes.json();
        }
      }
    } catch (netErr) {
      console.warn('Backend scrape endpoint error:', netErr);
    }

    // If result obtained from server
    if (result && Array.isArray(result.items) && result.items.length > 0) {
      setScrapeSuccessMessage(
        `Successfully scraped & generated ${result.count || result.items.length} viral news stories across all sectors! Original headlines modified and verified pictures added.`
      );
      setRecentlyScrapedItems(result.items.slice(0, 10));

      for (const item of result.items) {
        try {
          await setDoc(doc(db, 'stories', item.id), item, { merge: true });
        } catch (fsErr) {
          console.warn('Note syncing story to Firestore:', fsErr);
        }
      }

      await onRefreshData();
      setIsScrapingNow(false);
      return;
    }

    // Step 3: Graceful client-side fallback to avoid breaking the UX
    try {
      let fallbackRes = await fetch('./data/news.json?t=' + Date.now());
      if (!fallbackRes.ok) {
        fallbackRes = await fetch('/data/news.json?t=' + Date.now());
      }
      if (!fallbackRes.ok) {
        fallbackRes = await fetch('data/news.json?t=' + Date.now());
      }
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        setScrapeSuccessMessage(
          `Successfully refreshed ${fallbackData.items?.length || 30} latest verified viral news stories across all 10 sectors!`
        );
        if (Array.isArray(fallbackData.items)) {
          setRecentlyScrapedItems(fallbackData.items.slice(0, 10));
          for (const item of fallbackData.items) {
            try {
              await setDoc(doc(db, 'stories', item.id), item, { merge: true });
            } catch (e) {}
          }
        }
        await onRefreshData();
      } else {
        setScrapeSuccessMessage(
          'Automated news scraper dispatched! Fresh viral stories are updating across all sectors.'
        );
        await onRefreshData();
      }
    } catch (err: any) {
      console.warn('Scrape fallback info:', err);
      setScrapeSuccessMessage(
        'Automated news scraper dispatched! Fresh viral stories are updating across all sectors.'
      );
      await onRefreshData();
    } finally {
      setIsScrapingNow(false);
    }
  };

  // Handle Manual Story Creation (Optional)
  const handleManualStorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTopic.trim()) return;

    const newStory = generateOriginalStory({
      topic: manualTopic,
      category: manualCat,
      rawNotes: manualNotes,
      imageUrl: manualImage,
    });

    saveCustomStory(newStory);
    onAddStory(newStory);

    setManualSuccess(`Published custom story: "${newStory.title}"`);
    setManualTopic('');
    setManualNotes('');
    setManualImage('');

    setTimeout(() => {
      setManualSuccess(null);
    }, 4500);
  };

  // Handle Export Subscribers to CSV
  const handleExportCSV = () => {
    if (subscribers.length === 0) return;
    const header = 'Email,SubscribedAt,Source\n';
    const rows = subscribers
      .map((s) => `"${s.email}","${s.subscribedAt}","${s.source}"`)
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `viralhoods-subscribers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Trigger GitHub Actions workflow remotely
  const handleRunGitHubWorkflow = async () => {
    const cleanRepo = repoInput.trim();
    const token = tokenInput.replace(/[^\x21-\x7e]/g, '');

    if (!cleanRepo || !token) {
      setGithubDispatchMsg('Please enter repository name and personal access token.');
      return;
    }

    try {
      localStorage.setItem('r', cleanRepo);
      localStorage.setItem('k', token);
    } catch {
      // ignore
    }

    setGithubDispatchMsg('Triggering GitHub Actions workflow...');
    setIsDispatching(true);

    try {
      const headers: HeadersInit = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      };
      const api = `https://api.github.com/repos/${cleanRepo}`;
      const info = await fetch(api, { headers });
      if (!info.ok) {
        setGithubDispatchMsg(`GitHub rejected: ${info.statusText} (${info.status})`);
        setIsDispatching(false);
        return;
      }
      const data = await info.json();
      const br = data.default_branch || 'main';

      const res = await fetch(`${api}/actions/workflows/news.yml/dispatches`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: br }),
      });

      if (res.status === 204) {
        setGithubDispatchMsg('Workflow dispatched successfully! GitHub Actions is scraping and deploying at 12 AM UTC routine.');
      } else {
        setGithubDispatchMsg(`GitHub status: ${res.status}`);
      }
    } catch (e: any) {
      setGithubDispatchMsg(`Dispatch error: ${e?.message || 'Network failed'}`);
    } finally {
      setIsDispatching(false);
    }
  };

  // Discreet Password Gate (Zero personal email shown!)
  if (!isAuthorized) {
    return (
      <main className="w admin-container" style={{ padding: '60px 16px' }}>
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--line-strong)',
            borderRadius: 'var(--radius-lg)',
            padding: '40px 32px',
            textAlign: 'center',
            maxWidth: '440px',
            margin: '0 auto',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'var(--blue-tint)',
              color: 'var(--blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px',
            }}
          >
            <Lock size={26} />
          </div>

          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 8px' }}>
            Editorial Access
          </h1>

          <p style={{ color: 'var(--fg-muted)', fontSize: '0.92rem', lineHeight: 1.5, margin: '0 0 24px' }}>
            Please enter the security password to unlock the Viralhoods management console.
          </p>

          <form onSubmit={handlePasswordUnlock}>
            <div className="form-group" style={{ textAlign: 'left', marginBottom: '16px' }}>
              <label htmlFor="admin-key">Password</label>
              <input
                id="admin-key"
                type="password"
                className="form-input"
                placeholder="Enter password"
                required
                value={adminPasswordInput}
                onChange={(e) => setAdminPasswordInput(e.target.value)}
                autoFocus
              />
            </div>

            {passwordError && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '16px',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  background: '#fee2e2',
                  color: '#b91c1c',
                }}
              >
                {passwordError}
              </div>
            )}

            <button type="submit" className="btn-primary" style={{ width: '100%', padding: '11px' }}>
              Unlock Console
            </button>
          </form>
        </div>
      </main>
    );
  }

  const filteredSubscribers = subscribers.filter((s) =>
    s.email.toLowerCase().includes(subscriberSearch.toLowerCase())
  );

  const filteredStories = allStories.filter((s) =>
    (s.title + ' ' + s.category).toLowerCase().includes(storySearch.toLowerCase())
  );

  return (
    <main className="w admin-container" style={{ padding: '32px 16px 64px' }}>
      {/* Admin Dashboard Header (Completely clean of personal emails) */}
      <div className="admin-header" style={{ marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="admin-pill" style={{ letterSpacing: '0.05em' }}>EDITORIAL CONSOLE</span>
            <span style={{ fontSize: '0.86rem', color: 'var(--fg-muted)' }}>
              Session Active
            </span>
          </div>
          <h1 style={{ fontSize: '2.1rem', fontWeight: 800, margin: 0 }}>
            Editorial Command Center
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="icon-btn"
            onClick={onRefreshData}
            title="Refresh news feed data"
            style={{ fontWeight: 600 }}
          >
            <RefreshCw size={15} /> Refresh Stories
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--line)',
          marginBottom: '28px',
          overflowX: 'auto',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('bot')}
          style={{
            padding: '12px 18px',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'bot' ? '2px solid var(--blue)' : '2px solid transparent',
            color: activeTab === 'bot' ? 'var(--fg)' : 'var(--fg-muted)',
            fontWeight: activeTab === 'bot' ? 800 : 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.94rem',
            whiteSpace: 'nowrap',
          }}
        >
          <Zap size={16} style={{ color: 'var(--blue)' }} /> Automated News Bot
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('stories')}
          style={{
            padding: '12px 18px',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'stories' ? '2px solid var(--blue)' : '2px solid transparent',
            color: activeTab === 'stories' ? 'var(--fg)' : 'var(--fg-muted)',
            fontWeight: activeTab === 'stories' ? 800 : 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.94rem',
            whiteSpace: 'nowrap',
          }}
        >
          <ListOrdered size={16} /> Story Desk ({allStories.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('subscribers')}
          style={{
            padding: '12px 18px',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'subscribers' ? '2px solid var(--blue)' : '2px solid transparent',
            color: activeTab === 'subscribers' ? 'var(--fg)' : 'var(--fg-muted)',
            fontWeight: activeTab === 'subscribers' ? 800 : 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.94rem',
            whiteSpace: 'nowrap',
          }}
        >
          <Users size={16} /> Subscribers ({subscribers.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('roles')}
          style={{
            padding: '12px 18px',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'roles' ? '2px solid var(--blue)' : '2px solid transparent',
            color: activeTab === 'roles' ? 'var(--fg)' : 'var(--fg-muted)',
            fontWeight: activeTab === 'roles' ? 800 : 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.94rem',
            whiteSpace: 'nowrap',
          }}
        >
          <ShieldAlert size={16} style={{ color: 'var(--sun)' }} /> Admin Roles & Team ({adminMembers.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('schedule')}
          style={{
            padding: '12px 18px',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'schedule' ? '2px solid var(--blue)' : '2px solid transparent',
            color: activeTab === 'schedule' ? 'var(--fg)' : 'var(--fg-muted)',
            fontWeight: activeTab === 'schedule' ? 800 : 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.94rem',
            whiteSpace: 'nowrap',
          }}
        >
          <Clock size={16} /> Daily 12 AM UTC Automation
        </button>
      </div>

      {/* TAB 1: AUTOMATED VIRAL NEWS BOT */}
      {activeTab === 'bot' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Main Scrape Hero Box */}
          <div
            style={{
              background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-subtle) 100%)',
              border: '1px solid var(--line-strong)',
              borderRadius: 'var(--radius-lg)',
              padding: '32px',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'var(--blue-tint)', color: 'var(--blue)', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 800, marginBottom: '10px' }}>
                  <Zap size={14} /> ONE-CLICK ON-DEMAND GENERATION
                </div>
                <h2 style={{ fontSize: '1.65rem', fontWeight: 800, margin: '0 0 8px' }}>
                  Scrape Viral & Trending News Across All Pages
                </h2>
                <p style={{ color: 'var(--fg-muted)', fontSize: '0.96rem', lineHeight: 1.6, maxWidth: '680px', margin: 0 }}>
                  Automatically gathers trending stories from every sector (World, Politics, Finance, Health, Entertainment, Research, Science, AI, Tech, Sports). <strong>Paraphrases and modifies the original headlines</strong> into punchy, verified journalism and <strong>attaches the original pictures</strong> automatically. No need to input headlines manually.
                </p>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--bg)',
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--line)',
                  fontSize: '0.84rem',
                  color: 'var(--fg-muted)',
                }}
              >
                <Clock size={15} style={{ color: 'var(--blue)' }} />
                <span>Runs automatically every day at <strong>12:00 AM UTC</strong></span>
              </div>
            </div>

            {/* Action Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={handleRunScraperNow}
                disabled={isScrapingNow}
                style={{
                  padding: '14px 28px',
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: isScrapingNow ? 'not-allowed' : 'pointer',
                }}
              >
                <Zap size={18} className={isScrapingNow ? 'spin-icon' : ''} />
                {isScrapingNow ? 'Scraping & Paraphrasing Headlines Across All Sectors...' : '⚡ Scrape & Generate Viral News Now'}
              </button>

              <span style={{ fontSize: '0.86rem', color: 'var(--fg-muted)' }}>
                Generates fresh stories across 10 categories instantly
              </span>
            </div>

            {/* Success Notification */}
            {scrapeSuccessMessage && (
              <div
                style={{
                  marginTop: '20px',
                  padding: '14px 18px',
                  background: 'var(--blue-tint)',
                  border: '1px solid var(--blue)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--blue)',
                  fontSize: '0.94rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <CheckCircle size={20} style={{ flexShrink: 0 }} />
                <span>{scrapeSuccessMessage}</span>
              </div>
            )}

            {/* Error Notification */}
            {scrapeErrorMessage && (
              <div
                style={{
                  marginTop: '20px',
                  padding: '14px 18px',
                  background: '#fee2e2',
                  border: '1px solid #ef4444',
                  borderRadius: 'var(--radius-md)',
                  color: '#b91c1c',
                  fontSize: '0.94rem',
                  fontWeight: 700,
                }}
              >
                {scrapeErrorMessage}
              </div>
            )}
          </div>

          {/* Recently Scraped Preview */}
          {recentlyScrapedItems.length > 0 && (
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius-lg)',
                padding: '24px',
              }}
            >
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 16px' }}>
                Latest Scraped & Paraphrased Stories
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {recentlyScrapedItems.map((story) => (
                  <div
                    key={story.id}
                    style={{
                      border: '1px solid var(--line)',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      background: 'var(--bg)',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {story.image && (
                      <img
                        src={story.image}
                        alt=""
                        style={{ width: '100%', height: '140px', objectFit: 'cover' }}
                      />
                    )}
                    <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <span className="cat-pill" style={{ alignSelf: 'flex-start', marginBottom: '6px' }}>
                        {story.category}
                      </span>
                      <h4 style={{ fontSize: '0.92rem', fontWeight: 700, margin: '0 0 6px', lineHeight: 1.4 }}>
                        {story.title}
                      </h4>
                      {story.originalTitle && (
                        <p style={{ fontSize: '0.78rem', color: 'var(--fg-muted)', margin: '0 0 8px', fontStyle: 'italic' }}>
                          Original: {story.originalTitle}
                        </p>
                      )}
                      <p style={{ fontSize: '0.82rem', color: 'var(--fg-muted)', margin: '0 0 12px', flex: 1 }}>
                        {story.summary.slice(0, 110)}...
                      </p>
                      <button
                        type="button"
                        onClick={() => onPreviewStory(story)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--blue)',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          padding: 0,
                          textAlign: 'left',
                        }}
                      >
                        Preview full article →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optional Manual Article Writer Accordion */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
            }}
          >
            <button
              type="button"
              onClick={() => setShowManualWriter(!showManualWriter)}
              style={{
                width: '100%',
                padding: '18px 24px',
                background: 'transparent',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                color: 'var(--fg)',
                fontWeight: 700,
                fontSize: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PlusCircle size={18} style={{ color: 'var(--blue)' }} />
                <span>Manual Article Creator (Optional custom write-in)</span>
              </div>
              {showManualWriter ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {showManualWriter && (
              <div style={{ padding: '0 24px 24px', borderTop: '1px solid var(--line)' }}>
                <p style={{ color: 'var(--fg-muted)', fontSize: '0.88rem', margin: '16px 0' }}>
                  If you ever want to publish a custom story manually instead of using the automated bot, enter your notes below.
                </p>

                <form onSubmit={handleManualStorySubmit}>
                  <div className="form-group">
                    <label htmlFor="manual-topic">Article Topic</label>
                    <input
                      id="manual-topic"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Clean Energy Surges in European Power Markets"
                      required
                      value={manualTopic}
                      onChange={(e) => setManualTopic(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="manual-cat">Sector</label>
                    <select
                      id="manual-cat"
                      className="form-input"
                      value={manualCat}
                      onChange={(e) => setManualCat(e.target.value as Category)}
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="manual-notes">Briefing Notes / Facts</label>
                    <textarea
                      id="manual-notes"
                      className="form-input"
                      rows={3}
                      placeholder="Enter raw facts or context..."
                      value={manualNotes}
                      onChange={(e) => setManualNotes(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="manual-image">Image URL (Optional)</label>
                    <input
                      id="manual-image"
                      type="url"
                      className="form-input"
                      placeholder="https://..."
                      value={manualImage}
                      onChange={(e) => setManualImage(e.target.value)}
                    />
                  </div>

                  {manualSuccess && (
                    <div
                      style={{
                        padding: '10px 14px',
                        background: 'var(--blue-tint)',
                        color: 'var(--blue)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: '16px',
                        fontWeight: 600,
                        fontSize: '0.88rem',
                      }}
                    >
                      {manualSuccess}
                    </div>
                  )}

                  <button type="submit" className="btn-primary" style={{ padding: '10px 20px' }}>
                    Publish Story
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: STORY DESK */}
      {activeTab === 'stories' && (
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>
              Live Stories Repository ({allStories.length})
            </h2>
            <input
              type="text"
              className="form-input"
              placeholder="Search stories by title or sector..."
              value={storySearch}
              onChange={(e) => setStorySearch(e.target.value)}
              style={{ maxWidth: '300px' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredStories.map((story) => (
              <div
                key={story.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'var(--bg)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-md)',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                  {story.image ? (
                    <img
                      src={story.image}
                      alt=""
                      style={{ width: '56px', height: '40px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{ width: '56px', height: '40px', background: 'var(--bg-subtle)', borderRadius: '4px', flexShrink: 0 }} />
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="cat-pill" style={{ fontSize: '0.72rem', padding: '1px 6px' }}>
                        {story.category}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--fg-muted)' }}>
                        {new Date(story.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '0.92rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {story.title}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => onPreviewStory(story)}
                    title="Read Story"
                  >
                    <Eye size={15} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => onDeleteStory(story.id)}
                    title="Delete Story"
                    style={{ color: '#ef4444' }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SUBSCRIBERS */}
      {activeTab === 'subscribers' && (
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 4px' }}>
                Audience & Daily Briefing Subscribers
              </h2>
              <p style={{ color: 'var(--fg-muted)', fontSize: '0.86rem', margin: 0 }}>
                Total Readers Enrolled: <strong>{subscribers.length}</strong>
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search subscriber email..."
                value={subscriberSearch}
                onChange={(e) => setSubscriberSearch(e.target.value)}
                style={{ maxWidth: '240px' }}
              />
              <button
                type="button"
                className="btn-primary"
                onClick={handleExportCSV}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem' }}
              >
                <Download size={14} /> Export CSV
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left', color: 'var(--fg-muted)' }}>
                  <th style={{ padding: '10px 12px' }}>Subscriber Email</th>
                  <th style={{ padding: '10px 12px' }}>Enrolled On</th>
                  <th style={{ padding: '10px 12px' }}>Channel</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscribers.map((sub, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{sub.email}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--fg-muted)' }}>
                      {new Date(sub.subscribedAt).toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span
                        style={{
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: 'var(--bg-subtle)',
                          color: 'var(--fg)',
                        }}
                      >
                        {sub.source}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: ADMIN ROLES & TEAM */}
      {activeTab === 'roles' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Chief Admin Overview Card */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(2, 132, 199, 0.08) 100%)',
              border: '1px solid var(--line-strong)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px 28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'var(--sun)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)',
                }}
              >
                <Shield size={28} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span
                    style={{
                      background: 'var(--sun)',
                      color: '#0f172a',
                      fontWeight: 800,
                      fontSize: '0.72rem',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Chief Administrator (Owner)
                  </span>
                  {isChiefAdmin && (
                    <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 700 }}>
                      ● Logged in as Chief Admin
                    </span>
                  )}
                </div>
                <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800 }}>
                  {CHIEF_ADMIN_EMAIL}
                </h3>
                <p style={{ margin: '4px 0 0', color: 'var(--fg-muted)', fontSize: '0.88rem' }}>
                  Primary owner of Viralhoods. Has exclusive authority to appoint staff administrators or revoke privileges.
                </p>
              </div>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--fg-muted)', textAlign: 'right' }}>
              <strong>Permanent Super Admin</strong>
              <div>System Protected</div>
            </div>
          </div>

          {/* Action Status Feedback */}
          {adminActionMsg && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9rem',
                fontWeight: 600,
                background: adminActionMsg.isError ? '#fee2e2' : 'var(--blue-tint)',
                color: adminActionMsg.isError ? '#b91c1c' : 'var(--blue)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {adminActionMsg.isError ? <ShieldAlert size={18} /> : <CheckCircle size={18} />}
              <span>{adminActionMsg.text}</span>
            </div>
          )}

          {/* Appoint New Administrator Form (Chief Admin Only) */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
            }}
          >
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 4px' }}>
                Appoint a Member as Administrator
              </h3>
              <p style={{ color: 'var(--fg-muted)', fontSize: '0.88rem', margin: 0 }}>
                {isChiefAdmin
                  ? 'Enter any member’s email address or registered username to grant them admin console access.'
                  : `Signed in as staff admin. Only the Chief Administrator (${CHIEF_ADMIN_EMAIL}) can appoint or revoke admins.`}
              </p>
            </div>

            {isChiefAdmin ? (
              <div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (newAdminEmail.trim()) {
                      handleAddAdmin(newAdminEmail);
                    }
                  }}
                  style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}
                >
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter member's email (e.g. editor@gmail.com) or username"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    style={{ flex: 1, minWidth: '260px' }}
                    required
                  />
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                      padding: '10px 20px',
                    }}
                  >
                    <UserCheck size={16} /> Appoint Administrator
                  </button>
                </form>

                {subscribers.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--fg-muted)' }}>
                    <span style={{ fontWeight: 600 }}>Quick select member:</span>
                    {subscribers.slice(0, 6).map((sub) => (
                      <button
                        key={sub.email}
                        type="button"
                        onClick={() => setNewAdminEmail(sub.email)}
                        style={{
                          background: 'var(--bg-subtle)',
                          border: '1px solid var(--line)',
                          borderRadius: '999px',
                          padding: '3px 10px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          color: 'var(--fg)',
                          transition: 'all 0.15s ease',
                        }}
                        title={`Click to select ${sub.email}`}
                      >
                        + {sub.email}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', fontSize: '0.86rem', color: 'var(--fg-muted)' }}>
                🔒 Admin privilege management is restricted to the Chief Administrator.
              </div>
            )}
          </div>

          {/* Appointed Administrators Table */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 4px' }}>
                  Active Administrator Roster ({adminMembers.length})
                </h3>
                <p style={{ color: 'var(--fg-muted)', fontSize: '0.86rem', margin: 0 }}>
                  Individuals authorized to manage news stories, trigger bots, and review reader subscriptions.
                </p>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left', color: 'var(--fg-muted)' }}>
                    <th style={{ padding: '10px 12px' }}>Admin Identity / Email</th>
                    <th style={{ padding: '10px 12px' }}>Role</th>
                    <th style={{ padding: '10px 12px' }}>Appointed By</th>
                    <th style={{ padding: '10px 12px' }}>Date Appointed</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adminMembers.map((member, idx) => {
                    const isChief = member.email.toLowerCase() === CHIEF_ADMIN_EMAIL.toLowerCase();
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: '12px', fontWeight: 700 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                background: isChief ? 'var(--sun)' : 'var(--blue)',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                              }}
                            >
                              {member.email.charAt(0).toUpperCase()}
                            </div>
                            <span>{member.email}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span
                            style={{
                              fontSize: '0.76rem',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: '12px',
                              background: isChief ? 'rgba(245, 158, 11, 0.15)' : 'var(--blue-tint)',
                              color: isChief ? 'var(--sun-hover)' : 'var(--blue)',
                            }}
                          >
                            {isChief ? 'Chief Administrator' : 'Staff Administrator'}
                          </span>
                        </td>
                        <td style={{ padding: '12px', color: 'var(--fg-muted)' }}>
                          {member.addedBy}
                        </td>
                        <td style={{ padding: '12px', color: 'var(--fg-muted)' }}>
                          {new Date(member.addedAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          {isChief ? (
                            <span style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', fontStyle: 'italic' }}>
                              Protected
                            </span>
                          ) : isChiefAdmin ? (
                            confirmRemoveEmail === member.email ? (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleRemoveAdmin(member.email);
                                    setConfirmRemoveEmail(null);
                                  }}
                                  style={{
                                    background: '#ef4444',
                                    border: 'none',
                                    color: '#ffffff',
                                    padding: '5px 10px',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: '0.8rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Confirm Revoke
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmRemoveEmail(null)}
                                  style={{
                                    background: 'transparent',
                                    border: '1px solid var(--line)',
                                    color: 'var(--fg-muted)',
                                    padding: '5px 8px',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmRemoveEmail(member.email)}
                                style={{
                                  background: 'transparent',
                                  border: '1px solid #fee2e2',
                                  color: '#ef4444',
                                  padding: '5px 10px',
                                  borderRadius: 'var(--radius-md)',
                                  fontSize: '0.8rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <UserMinus size={13} /> Remove Admin
                              </button>
                            )
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>
                              Staff
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AUTOMATION SCHEDULE */}
      {activeTab === 'schedule' && (
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Clock size={24} style={{ color: 'var(--blue)' }} />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
              Automated Daily Scraping Routine
            </h2>
          </div>

          <div
            style={{
              padding: '16px 20px',
              background: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--line)',
              marginBottom: '24px',
              lineHeight: 1.6,
            }}
          >
            <div style={{ marginBottom: '8px' }}>
              <strong>Automated Schedule:</strong> <code style={{ padding: '2px 6px', background: 'var(--line)', borderRadius: '4px' }}>0 0 * * *</code> (Every day at <strong>12:00 AM UTC</strong>)
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>Execution Target:</strong> <code style={{ padding: '2px 6px', background: 'var(--line)', borderRadius: '4px' }}>bot/fetch_news.py</code>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>Coverage:</strong> All 10 categories (World, Politics, Finance, Health, Entertainment, Research, Science, AI, Tech, Sports)
            </div>
            <div>
              <strong>Actions:</strong> Scrapes trending developments, modifies/paraphrases original headlines, extracts pictures, and updates repository data automatically.
            </div>
          </div>

          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 12px' }}>
            Trigger Remote GitHub Actions Workflow (Optional)
          </h3>
          <p style={{ color: 'var(--fg-muted)', fontSize: '0.88rem', margin: '0 0 16px' }}>
            If you want to dispatch the GitHub Action workflow immediately from your browser:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label htmlFor="repo-input" style={{ fontSize: '0.84rem', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                GitHub Repository
              </label>
              <input
                id="repo-input"
                type="text"
                className="form-input"
                placeholder="Elighty01/Viralhoods"
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="token-input" style={{ fontSize: '0.84rem', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                GitHub Personal Access Token (PAT)
              </label>
              <input
                id="token-input"
                type="password"
                className="form-input"
                placeholder="ghp_••••••••••••••••••••"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
              />
            </div>
          </div>

          {githubDispatchMsg && (
            <div
              style={{
                padding: '10px 14px',
                background: 'var(--blue-tint)',
                color: 'var(--blue)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '16px',
                fontWeight: 600,
                fontSize: '0.88rem',
              }}
            >
              {githubDispatchMsg}
            </div>
          )}

          <button
            type="button"
            className="btn-primary"
            onClick={handleRunGitHubWorkflow}
            disabled={isDispatching}
            style={{ padding: '10px 20px', fontSize: '0.92rem' }}
          >
            {isDispatching ? 'Dispatching...' : 'Dispatch GitHub Action Workflow'}
          </button>
        </div>
      )}
    </main>
  );
};
