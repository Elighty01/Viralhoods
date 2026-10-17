import React, { useState, useEffect } from 'react';
import { User, OWNER_EMAIL, NewsItem, Subscriber, CATEGORIES, Category } from '../types';
import { isOwnerEmail, getSubscribers, saveCustomStory, deleteCustomStory } from '../utils/storage';
import { generateOriginalStory } from '../utils/articleGenerator';
import {
  ShieldAlert,
  ShieldCheck,
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
} from 'lucide-react';

interface AdminViewProps {
  currentUser: User | null;
  onOpenAuth: () => void;
  allStories: NewsItem[];
  onAddStory: (story: NewsItem) => void;
  onDeleteStory: (id: string) => void;
  onPreviewStory: (story: NewsItem) => void;
  onRefreshData: () => Promise<void>;
}

export const AdminView: React.FC<AdminViewProps> = ({
  currentUser,
  onOpenAuth,
  allStories,
  onAddStory,
  onDeleteStory,
  onPreviewStory,
  onRefreshData,
}) => {
  const isAuthorized = isOwnerEmail(currentUser?.email);

  const [activeTab, setActiveTab] = useState<'generator' | 'stories' | 'subscribers' | 'bot'>(
    'generator'
  );

  // Story Generator Form State
  const [topic, setTopic] = useState('');
  const [selectedCat, setSelectedCat] = useState<Category>('World');
  const [rawNotes, setRawNotes] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [generatorSuccess, setGeneratorSuccess] = useState<string | null>(null);

  // Stories Management State
  const [storySearch, setStorySearch] = useState('');

  // Subscribers State
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [subscriberSearch, setSubscriberSearch] = useState('');

  // GitHub Actions Workflow Dispatcher State
  const [repoInput, setRepoInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [botMessage, setBotMessage] = useState('');
  const [isBotSubmitting, setIsBotSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthorized) {
      setSubscribers(getSubscribers());
      try {
        setRepoInput(localStorage.getItem('r') || 'Elighty01/Viralhoods');
        setTokenInput(localStorage.getItem('k') || '');
      } catch {
        // ignore
      }
    }
  }, [isAuthorized]);

  // If not authorized as owner
  if (!isAuthorized) {
    return (
      <main className="w admin-container">
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--line-strong)',
            borderRadius: 'var(--radius-lg)',
            padding: '48px 32px',
            textAlign: 'center',
            maxWidth: '580px',
            margin: '40px auto',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <ShieldAlert size={34} />
          </div>

          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 12px' }}>
            Restricted Editorial Access
          </h1>

          <p style={{ color: 'var(--fg-muted)', fontSize: '1rem', lineHeight: 1.6, margin: '0 0 24px' }}>
            The Viralhoods Management Console is strictly restricted to administrator{' '}
            <strong style={{ color: 'var(--fg)' }}>{OWNER_EMAIL}</strong>. Unauthorized access is blocked.
          </p>

          <button
            type="button"
            className="btn-primary"
            style={{ maxWidth: '300px', margin: '0 auto' }}
            onClick={onOpenAuth}
          >
            Sign in as {OWNER_EMAIL}
          </button>
        </div>
      </main>
    );
  }

  // Handle Generating a Brand New Original Story
  const handleGenerateStory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    const newStory = generateOriginalStory({
      topic,
      category: selectedCat,
      rawNotes,
      imageUrl,
    });

    saveCustomStory(newStory);
    onAddStory(newStory);

    setGeneratorSuccess(`Published original story: "${newStory.title}"`);
    setTopic('');
    setRawNotes('');
    setImageUrl('');

    setTimeout(() => {
      setGeneratorSuccess(null);
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

  // Handle GitHub Actions dispatch
  const handleRunBot = async () => {
    const cleanRepo = repoInput.trim();
    const token = tokenInput.replace(/[^\x21-\x7e]/g, '');

    if (!cleanRepo || !token) {
      setBotMessage('Please provide repository name and personal access token.');
      return;
    }

    try {
      localStorage.setItem('r', cleanRepo);
      localStorage.setItem('k', token);
    } catch {
      // ignore
    }

    setBotMessage('Starting workflow dispatch...');
    setIsBotSubmitting(true);

    try {
      const headers: HeadersInit = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      };
      const api = `https://api.github.com/repos/${cleanRepo}`;
      const info = await fetch(api, { headers });
      if (!info.ok) {
        setBotMessage(`GitHub rejected: ${info.statusText} (${info.status})`);
        setIsBotSubmitting(false);
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
        setBotMessage('Workflow dispatched successfully! Stories will update in 1-3 minutes.');
      } else {
        setBotMessage(`GitHub status: ${res.status}`);
      }
    } catch (e: any) {
      setBotMessage(`Dispatch error: ${e?.message || 'Network failed'}`);
    } finally {
      setIsBotSubmitting(false);
    }
  };

  const filteredSubscribers = subscribers.filter((s) =>
    s.email.toLowerCase().includes(subscriberSearch.toLowerCase())
  );

  const filteredStories = allStories.filter((s) =>
    (s.title + ' ' + s.category).toLowerCase().includes(storySearch.toLowerCase())
  );

  return (
    <main className="w admin-container">
      <div className="admin-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="admin-pill">ADMINISTRATOR</span>
            <span style={{ fontSize: '0.88rem', color: 'var(--fg-muted)' }}>
              Logged in as {currentUser?.email}
            </span>
          </div>
          <h1 style={{ fontSize: '2.1rem', fontWeight: 800, margin: 0 }}>Editorial Command Center</h1>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="icon-btn"
            onClick={onRefreshData}
            title="Reload live news feed data"
          >
            <RefreshCw size={15} /> Refresh Live Feed
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'generator' ? 'active' : ''}`}
          onClick={() => setActiveTab('generator')}
        >
          <Sparkles size={16} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />
          Story Paraphraser & Generator
        </button>

        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'stories' ? 'active' : ''}`}
          onClick={() => setActiveTab('stories')}
        >
          <ListOrdered size={16} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />
          Manage Stories ({allStories.length})
        </button>

        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'subscribers' ? 'active' : ''}`}
          onClick={() => setActiveTab('subscribers')}
        >
          <Users size={16} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />
          Newsletter Subscribers ({subscribers.length})
        </button>

        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'bot' ? 'active' : ''}`}
          onClick={() => setActiveTab('bot')}
        >
          GitHub Actions Bot
        </button>
      </div>

      {/* TAB 1: STORY GENERATOR */}
      {activeTab === 'generator' && (
        <div className="admin-panel-card">
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 6px' }}>
              Create Original Paraphrased Story
            </h2>
            <p style={{ color: 'var(--fg-muted)', margin: 0, fontSize: '0.94rem' }}>
              Enter a topic or paste incoming text. Viralhoods generates full original paragraphs, takeaways, and context with zero external links.
            </p>
          </div>

          {generatorSuccess && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                background: '#dcfce7',
                color: '#15803d',
                fontWeight: 700,
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle size={18} /> {generatorSuccess}
            </div>
          )}

          <form onSubmit={handleGenerateStory}>
            <div className="form-group">
              <label htmlFor="gen-topic">Story Headline / Core Topic *</label>
              <input
                id="gen-topic"
                type="text"
                className="form-input"
                placeholder="e.g. European Central Bank Unveils Digital Euro Security Architecture"
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label htmlFor="gen-cat">Sector / Category *</label>
                <select
                  id="gen-cat"
                  className="form-select"
                  value={selectedCat}
                  onChange={(e) => setSelectedCat(e.target.value as Category)}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="gen-img">Image URL (Optional)</label>
                <input
                  id="gen-img"
                  type="url"
                  className="form-input"
                  placeholder="https://images.unsplash.com/..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="gen-notes">Raw Event Notes or Press Points to Paraphrase</label>
              <textarea
                id="gen-notes"
                className="form-textarea"
                rows={4}
                placeholder="Paste rough notes, facts, or bullet points. Viralhoods will transform them into rich, independent reporting with executive takeaways."
                value={rawNotes}
                onChange={(e) => setRawNotes(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <PlusCircle size={18} /> Paraphrase & Publish to Live Feed
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: MANAGE STORIES */}
      {activeTab === 'stories' && (
        <div className="admin-panel-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
              Stories Catalog ({filteredStories.length})
            </h2>

            <input
              type="search"
              placeholder="Filter stories..."
              className="form-input"
              style={{ maxWidth: '280px' }}
              value={storySearch}
              onChange={(e) => setStorySearch(e.target.value)}
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
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-subtle)',
                  gap: '16px',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--blue)', fontWeight: 800, textTransform: 'uppercase' }}>
                    {story.category}
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--fg)', fontSize: '0.98rem' }}>
                    {story.title}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => onPreviewStory(story)}
                    title="Read in internal viewer"
                  >
                    <Eye size={15} /> Read
                  </button>

                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => {
                      if (confirm(`Remove story "${story.title}"?`)) {
                        deleteCustomStory(story.id);
                        onDeleteStory(story.id);
                      }
                    }}
                    style={{ color: '#ef4444' }}
                    title="Delete story"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: NEWSLETTER SUBSCRIBERS */}
      {activeTab === 'subscribers' && (
        <div className="admin-panel-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 4px' }}>
                Newsletter Subscribers
              </h2>
              <p style={{ color: 'var(--fg-muted)', margin: 0, fontSize: '0.92rem' }}>
                Emails collected automatically upon user login and inline newsletter sign-ups.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="search"
                placeholder="Search email..."
                className="form-input"
                style={{ maxWidth: '240px' }}
                value={subscriberSearch}
                onChange={(e) => setSubscriberSearch(e.target.value)}
              />

              <button type="button" className="icon-btn" onClick={handleExportCSV}>
                <Download size={16} /> Export CSV
              </button>
            </div>
          </div>

          {filteredSubscribers.length === 0 ? (
            <p style={{ color: 'var(--fg-muted)', textAlign: 'center', padding: '30px 0' }}>
              No subscribers match this search.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="subscribers-table">
                <thead>
                  <tr>
                    <th>Email Address</th>
                    <th>Subscribed On</th>
                    <th>Source</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubscribers.map((sub, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600, color: 'var(--fg)' }}>{sub.email}</td>
                      <td style={{ color: 'var(--fg-muted)' }}>
                        {new Date(sub.subscribedAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '999px',
                            background: sub.source === 'login' ? 'var(--blue-tint)' : 'var(--bg-subtle)',
                            color: sub.source === 'login' ? 'var(--blue)' : 'var(--fg-muted)',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                          }}
                        >
                          {sub.source.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.85rem' }}>
                          ● Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: GITHUB ACTIONS BOT */}
      {activeTab === 'bot' && (
        <div className="admin-panel-card">
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 8px' }}>
            Trigger News Bot (GitHub Actions)
          </h2>
          <p style={{ color: 'var(--fg-muted)', margin: '0 0 20px', fontSize: '0.94rem' }}>
            Dispatches your repository's workflow to harvest public feeds and commit updates.
          </p>

          <div className="form-group">
            <label htmlFor="repo-input">Repository (username/repo)</label>
            <input
              id="repo-input"
              className="form-input"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              placeholder="e.g. Elighty01/Viralhoods"
            />
          </div>

          <div className="form-group">
            <label htmlFor="tok-input">GitHub Fine-grained Token</label>
            <input
              id="tok-input"
              type="password"
              className="form-input"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="ghp_..."
            />
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={handleRunBot}
            disabled={isBotSubmitting}
            style={{ maxWidth: '240px' }}
          >
            {isBotSubmitting ? 'Dispatching...' : 'Dispatch Workflow Now'}
          </button>

          {botMessage && (
            <p className="msg" style={{ marginTop: '14px', color: 'var(--blue)' }}>
              {botMessage}
            </p>
          )}
        </div>
      )}
    </main>
  );
};
