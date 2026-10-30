import React, { useState } from 'react';
import { X, Type, Link2, Loader2 } from 'lucide-react';
import { User, PostType, CommunityPost } from '../types';
import { createPost, parseVideoEmbedUrl, fetchLinkPreview, getDirectLinkMediaKind } from '../utils/community';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onCreated: (post: CommunityPost) => void;
}

// Posts are links and text only — no separate image/video upload flow. A
// pasted link that IS directly a picture or video (or a YouTube/Vimeo page)
// gets its preview resolved automatically on submit; see PostCard for how
// each case renders.
const TYPE_TABS: { id: Extract<PostType, 'text' | 'link'>; label: string; icon: React.ReactNode }[] = [
  { id: 'text', label: 'Text', icon: <Type size={15} /> },
  { id: 'link', label: 'Link', icon: <Link2 size={15} /> },
];

export const CreatePostModal: React.FC<CreatePostModalProps> = ({ isOpen, onClose, currentUser, onCreated }) => {
  const [type, setType] = useState<Extract<PostType, 'text' | 'link'>>('text');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const reset = () => {
    setType('text');
    setTitle('');
    setBody('');
    setLinkUrl('');
    setError(null);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please add a title.');
      return;
    }
    if (!currentUser.username) {
      setError('Set a username before posting.');
      return;
    }
    if (!currentUser.uid) {
      setError('Please sign in again before posting.');
      return;
    }

    const base = {
      authorUid: currentUser.uid,
      authorUsername: currentUser.username,
      authorName: currentUser.name || currentUser.username,
      title: title.trim(),
    };
    const createdAt = new Date().toISOString();

    setError(null);
    setIsSubmitting(true);

    try {
      let created: CommunityPost;

      if (type === 'text') {
        const id = await createPost({ ...base, type: 'text', body: body.trim() });
        created = { id, ...base, type: 'text', body: body.trim(), createdAt, likeCount: 0, likedBy: [], commentCount: 0 };
      } else {
        const clean = linkUrl.trim();
        if (!clean) {
          setError('Paste a link to share.');
          setIsSubmitting(false);
          return;
        }
        try {
          // eslint-disable-next-line no-new
          new URL(clean);
        } catch {
          setError('That doesn\u2019t look like a valid URL.');
          setIsSubmitting(false);
          return;
        }

        const videoEmbed = parseVideoEmbedUrl(clean);
        const directKind = videoEmbed ? null : getDirectLinkMediaKind(clean);
        // A direct image/video file link doesn't have Open Graph metadata
        // to unfurl, so skip that call and let PostCard render it as the
        // media itself; anything else gets a title/image preview fetched.
        const preview = videoEmbed || directKind ? null : await fetchLinkPreview(clean).catch(() => null);
        const linkFields = {
          linkUrl: clean,
          linkPreview: preview,
          ...(videoEmbed ? { videoEmbedUrl: videoEmbed.embedUrl, videoSourceUrl: clean } : {}),
        };

        const id = await createPost({ ...base, type: 'link', body: body.trim() || undefined, ...linkFields });
        created = { id, ...base, type: 'link', body: body.trim() || undefined, ...linkFields, createdAt, likeCount: 0, likedBy: [], commentCount: 0 };
      }

      onCreated(created);
      reset();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Could not create your post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-card" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 12px' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>New post</h2>
          <button type="button" onClick={handleClose} className="icon-btn" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', padding: '0 20px 14px' }}>
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setType(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '20px',
                border: '1px solid',
                borderColor: type === tab.id ? 'var(--blue)' : 'var(--line)',
                background: type === tab.id ? 'var(--blue-tint)' : 'var(--bg-subtle)',
                color: type === tab.id ? 'var(--blue)' : 'var(--fg-muted)',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            maxLength={180}
            className="form-input"
            autoFocus
          />

          {type === 'link' && (
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
              className="form-input"
            />
          )}

          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={type === 'link' ? 'Add a comment (optional)' : "What's on your mind?"}
            maxLength={3000}
            rows={type === 'link' ? 3 : 6}
            className="form-input"
            style={{ resize: 'vertical' }}
          />

          {error && <p style={{ color: '#dc2626', fontSize: '0.82rem', margin: 0 }}>{error}</p>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
            <button type="button" onClick={handleClose} className="btn-outline" disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 size={15} className="spin-icon" /> : 'Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
