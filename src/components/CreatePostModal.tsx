import React, { useState } from 'react';
import { X, Type, Image as ImageIcon, Video, Link2, Loader2 } from 'lucide-react';
import { User, PostType, CommunityPost } from '../types';
import { createPost, uploadPostImage, parseVideoEmbedUrl, fetchLinkPreview } from '../utils/community';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onCreated: (post: CommunityPost) => void;
}

const TYPE_TABS: { id: PostType; label: string; icon: React.ReactNode }[] = [
  { id: 'text', label: 'Text', icon: <Type size={15} /> },
  { id: 'image', label: 'Image', icon: <ImageIcon size={15} /> },
  { id: 'video', label: 'Video', icon: <Video size={15} /> },
  { id: 'link', label: 'Link', icon: <Link2 size={15} /> },
];

export const CreatePostModal: React.FC<CreatePostModalProps> = ({ isOpen, onClose, currentUser, onCreated }) => {
  const [type, setType] = useState<PostType>('text');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const reset = () => {
    setType('text');
    setTitle('');
    setBody('');
    setImageFile(null);
    setImagePreview(null);
    setVideoUrl('');
    setLinkUrl('');
    setProgress(0);
    setError(null);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    reset();
    onClose();
  };

  const handleImagePick = (file: File | undefined) => {
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
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
    setError(null);
    setIsSubmitting(true);

    try {
      const base = {
        authorUid: currentUser.uid!,
        authorUsername: currentUser.username,
        authorName: currentUser.name || currentUser.username,
        authorPhotoURL: null,
        title: title.trim(),
      };
      let postId: string;

      if (type === 'text') {
        if (!body.trim()) throw new Error('Please add some text for your post.');
        postId = await createPost({ ...base, type: 'text', body: body.trim() });
      } else if (type === 'image') {
        if (!imageFile) throw new Error('Please choose an image.');
        // Firestore doc id isn't known before creation, so upload under a
        // temporary id derived from the current time, then write the post.
        const tempId = `tmp_${Date.now()}`;
        const url = await uploadPostImage(currentUser.uid!, tempId, imageFile, setProgress);
        postId = await createPost({ ...base, type: 'image', body: body.trim() || undefined, imageUrls: [url] });
      } else if (type === 'video') {
        const parsed = parseVideoEmbedUrl(videoUrl);
        if (!parsed) throw new Error('Please paste a valid YouTube or Vimeo link.');
        postId = await createPost({
          ...base,
          type: 'video',
          body: body.trim() || undefined,
          videoEmbedUrl: parsed.embedUrl,
          videoSourceUrl: videoUrl.trim(),
        });
      } else {
        const clean = linkUrl.trim();
        if (!/^https?:\/\//i.test(clean)) throw new Error('Please paste a full link, starting with https://');
        const preview = await fetchLinkPreview(clean);
        postId = await createPost({ ...base, type: 'link', body: body.trim() || undefined, linkUrl: clean, linkPreview: preview });
      }

      onCreated({
        id: postId,
        ...base,
        type,
        body: body.trim() || undefined,
        imageUrls: imagePreview ? [imagePreview] : undefined,
        videoEmbedUrl: type === 'video' ? parseVideoEmbedUrl(videoUrl)?.embedUrl : undefined,
        videoSourceUrl: type === 'video' ? videoUrl.trim() : undefined,
        linkUrl: type === 'link' ? linkUrl.trim() : undefined,
        createdAt: new Date().toISOString(),
        likeCount: 0,
        likedBy: [],
      });
      reset();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Could not publish your post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Create a Post</h3>
          <button className="close-btn" onClick={handleClose} aria-label="Close dialog">
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '6px', margin: '14px 0 18px', flexWrap: 'wrap' }}>
          {TYPE_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setType(t.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '20px',
                border: '1px solid',
                borderColor: type === t.id ? 'var(--blue)' : 'var(--line)',
                background: type === t.id ? 'var(--blue-tint)' : 'var(--bg-subtle)',
                color: type === t.id ? 'var(--blue)' : 'var(--fg)',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: 'pointer',
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="post-title">Title</label>
            <input
              id="post-title"
              type="text"
              className="form-input"
              placeholder="Give your post a title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={160}
              required
            />
          </div>

          {type === 'text' && (
            <div className="form-group">
              <label htmlFor="post-body">Text</label>
              <textarea
                id="post-body"
                className="form-input"
                placeholder="What's on your mind?"
                rows={6}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
                maxLength={5000}
              />
            </div>
          )}

          {type === 'image' && (
            <>
              <div className="form-group">
                <label htmlFor="post-image">Image (PNG, JPEG, WEBP, or GIF — under 8MB)</label>
                <input
                  id="post-image"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(e) => handleImagePick(e.target.files?.[0])}
                  className="form-input"
                />
              </div>
              {imagePreview && (
                <img src={imagePreview} alt="Preview" style={{ width: '100%', maxHeight: '260px', objectFit: 'cover', borderRadius: 'var(--radius-md)', marginBottom: '14px' }} />
              )}
              <div className="form-group">
                <label htmlFor="post-caption">Caption (optional)</label>
                <textarea
                  id="post-caption"
                  className="form-input"
                  rows={2}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
              {isSubmitting && imageFile && (
                <div style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', marginBottom: '12px' }}>Uploading... {progress}%</div>
              )}
            </>
          )}

          {type === 'video' && (
            <>
              <div className="form-group">
                <label htmlFor="post-video">YouTube or Vimeo link</label>
                <input
                  id="post-video"
                  type="url"
                  className="form-input"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="post-video-caption">Caption (optional)</label>
                <textarea
                  id="post-video-caption"
                  className="form-input"
                  rows={2}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
            </>
          )}

          {type === 'link' && (
            <>
              <div className="form-group">
                <label htmlFor="post-link">Link (any site — an article, a social media post, anything)</label>
                <input
                  id="post-link"
                  type="url"
                  className="form-input"
                  placeholder="https://..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="post-link-comment">Your take (optional)</label>
                <textarea
                  id="post-link-comment"
                  className="form-input"
                  rows={2}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
            </>
          )}

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: '14px', fontSize: '0.86rem', fontWeight: 600, background: '#fee2e2', color: '#b91c1c' }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="spin-icon" /> Publishing...
              </>
            ) : (
              'Publish Post'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
