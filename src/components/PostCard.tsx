import React, { useState } from 'react';
import {
  Heart,
  ExternalLink,
  Flag,
  Trash2,
  MoreHorizontal,
  MessageCircle,
  Share2,
  UserPlus,
  UserCheck,
  Check,
  Send,
  Loader2,
} from 'lucide-react';
import { CommunityPost, CommunityComment, User } from '../types';
import { formatAgo } from './NewsCard';
import { fetchComments, addComment, getDirectLinkMediaKind } from '../utils/community';

interface PostCardProps {
  post: CommunityPost;
  currentUser: User | null;
  onToggleLike: (post: CommunityPost) => void;
  onOpenAuthor: (username: string) => void;
  onReport: (post: CommunityPost) => void;
  onDelete: (post: CommunityPost) => void;
  onOpenAuth: (message?: string) => void;
  isFollowingAuthor?: boolean;
  onToggleFollow?: (post: CommunityPost) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUser,
  onToggleLike,
  onOpenAuthor,
  onReport,
  onDelete,
  onOpenAuth,
  isFollowingAuthor,
  onToggleFollow,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // Comments — loaded lazily the first time this card's thread is opened,
  // so a feed full of posts doesn't fire a read per card up front.
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [hasLoadedComments, setHasLoadedComments] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [localCommentCount, setLocalCommentCount] = useState(post.commentCount || 0);

  const liked = Boolean(currentUser?.uid && post.likedBy?.includes(currentUser.uid));
  const isOwner = Boolean(currentUser?.uid && currentUser.uid === post.authorUid);
  const canModerate = isOwner || Boolean(currentUser?.isAdmin);

  const directKind = post.linkUrl ? getDirectLinkMediaKind(post.linkUrl) : null;

  const handleToggleComments = async () => {
    const opening = !commentsOpen;
    setCommentsOpen(opening);
    if (opening && !hasLoadedComments) {
      setIsLoadingComments(true);
      const data = await fetchComments(post.id);
      setComments(data);
      setHasLoadedComments(true);
      setIsLoadingComments(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.uid) {
      onOpenAuth('Sign in to comment.');
      return;
    }
    const body = commentDraft.trim();
    if (!body) return;
    setIsSubmittingComment(true);
    try {
      const comment = await addComment({
        postId: post.id,
        authorUid: currentUser.uid,
        authorUsername: currentUser.username || 'member',
        authorName: currentUser.name || currentUser.username || 'Member',
        body,
      });
      setComments((prev) => [...prev, comment]);
      setLocalCommentCount((prev) => prev + 1);
      setCommentDraft('');
    } catch (err) {
      console.warn('Add comment note:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}${window.location.pathname}#community/${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: post.title, text: `${post.title} — via Viralhoods Community`, url });
        return;
      }
    } catch {
      return; // user cancelled the native share sheet
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    } catch {
      /* ignore */
    }
  };

  const handleToggleFollow = () => {
    if (!currentUser?.uid) {
      onOpenAuth('Sign in to follow people.');
      return;
    }
    onToggleFollow?.(post);
  };

  return (
    <article
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Author row — username only, never the account's real name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px 10px' }}>
        <button
          type="button"
          onClick={() => onOpenAuthor(post.authorUsername)}
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: 'var(--blue-tint)',
            color: 'var(--blue)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '0.9rem',
            flexShrink: 0,
            overflow: 'hidden',
          }}
          title={`View @${post.authorUsername}'s profile`}
        >
          {post.authorPhotoURL ? (
            <img src={post.authorPhotoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            post.authorUsername?.charAt(0).toUpperCase() || '?'
          )}
        </button>
        <div style={{ minWidth: 0, flex: 1 }}>
          <button
            type="button"
            onClick={() => onOpenAuthor(post.authorUsername)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'block' }}
          >
            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--fg)' }}>@{post.authorUsername}</span>
          </button>
          <div style={{ fontSize: '0.76rem', color: 'var(--fg-muted)' }}>{formatAgo(post.createdAt)}</div>
        </div>

        {!isOwner && (
          <button
            type="button"
            onClick={handleToggleFollow}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '5px 10px',
              borderRadius: '20px',
              border: '1px solid',
              borderColor: isFollowingAuthor ? 'var(--line)' : 'var(--blue)',
              background: isFollowingAuthor ? 'var(--bg-subtle)' : 'var(--blue-tint)',
              color: isFollowingAuthor ? 'var(--fg-muted)' : 'var(--blue)',
              fontWeight: 700,
              fontSize: '0.74rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
            title={isFollowingAuthor ? `Unfollow @${post.authorUsername}` : `Follow @${post.authorUsername}`}
          >
            {isFollowingAuthor ? <UserCheck size={12} /> : <UserPlus size={12} />}
            {isFollowingAuthor ? 'Following' : 'Follow'}
          </button>
        )}

        {canModerate && (
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="icon-btn"
              aria-label="Post options"
              style={{ width: '30px', height: '30px' }}
            >
              <MoreHorizontal size={16} />
            </button>
            {menuOpen && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '34px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--line-strong)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--card-shadow)',
                  zIndex: 5,
                  minWidth: '140px',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(post);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '9px 12px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.84rem',
                    color: '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Trash2 size={14} /> Delete post
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <h3 style={{ fontSize: '1.02rem', fontWeight: 800, margin: '0 16px 10px', lineHeight: 1.35 }}>{post.title}</h3>

      {/* Body text — the post itself (text posts) or an optional caption
          alongside a link/media preview. */}
      {post.body && (
        <p style={{ margin: '0 16px 14px', fontSize: '0.88rem', color: 'var(--fg-muted)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
          {post.body}
        </p>
      )}

      {/* Legacy upload-based posts (kept renderable for anything created
          before posts were simplified to links + text). */}
      {post.type === 'image' && post.imageUrls && post.imageUrls.length > 0 && !imgError && (
        <img
          src={post.imageUrls[0]}
          alt={post.title}
          onError={() => setImgError(true)}
          style={{ width: '100%', maxHeight: '420px', objectFit: 'cover', display: 'block' }}
          loading="lazy"
        />
      )}

      {post.type === 'video' && post.videoEmbedUrl && (
        <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#000' }}>
          <iframe
            src={post.videoEmbedUrl}
            title={post.title}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
      )}

      {/* Link posts: show the richest preview we can — an embedded player
          for YouTube/Vimeo links, the image/video itself when the link IS
          directly a picture or a video file, an unfurled title+image card
          for anything else with Open Graph data, or a plain link as a last
          resort. */}
      {post.type === 'link' && post.linkUrl && post.videoEmbedUrl && (
        <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#000' }}>
          <iframe
            src={post.videoEmbedUrl}
            title={post.title}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
      )}

      {post.type === 'link' && post.linkUrl && !post.videoEmbedUrl && directKind === 'video' && !imgError && (
        /* eslint-disable-next-line jsx-a11y/media-has-caption */
        <video
          src={post.linkUrl}
          controls
          onError={() => setImgError(true)}
          style={{ width: '100%', maxHeight: '420px', display: 'block', background: '#000' }}
        />
      )}

      {post.type === 'link' && post.linkUrl && !post.videoEmbedUrl && directKind === 'image' && !imgError && (
        <img
          src={post.linkUrl}
          alt={post.title}
          onError={() => setImgError(true)}
          style={{ width: '100%', maxHeight: '420px', objectFit: 'cover', display: 'block' }}
          loading="lazy"
        />
      )}

      {post.type === 'link' &&
        post.linkUrl &&
        !post.videoEmbedUrl &&
        !directKind &&
        (post.linkPreview?.title || post.linkPreview?.image ? (
          <a
            href={post.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              margin: '0 16px 14px',
              display: 'flex',
              gap: '10px',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            {post.linkPreview?.image && (
              <img src={post.linkPreview.image} alt="" style={{ width: '96px', height: '96px', objectFit: 'cover', flexShrink: 0 }} />
            )}
            <div style={{ padding: '10px 12px 10px 0', minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {post.linkPreview?.title || post.linkUrl}
              </div>
              {post.linkPreview?.description && (
                <div style={{ fontSize: '0.76rem', color: 'var(--fg-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {post.linkPreview.description}
                </div>
              )}
              <div style={{ fontSize: '0.74rem', color: 'var(--blue)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ExternalLink size={11} /> {post.linkPreview?.domain || new URL(post.linkUrl).hostname}
              </div>
            </div>
          </a>
        ) : (
          <a
            href={post.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              margin: '0 16px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 12px',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              color: 'var(--blue)',
              fontSize: '0.84rem',
              fontWeight: 700,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            <ExternalLink size={13} style={{ flexShrink: 0 }} /> {post.linkUrl}
          </a>
        ))}

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderTop: '1px solid var(--line)', marginTop: 'auto', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => (currentUser ? onToggleLike(post) : onOpenAuth('Sign in to like posts.'))}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            background: liked ? 'rgba(239,68,68,0.1)' : 'var(--bg-subtle)',
            border: '1px solid var(--line)',
            borderRadius: '20px',
            padding: '5px 12px',
            cursor: 'pointer',
            color: liked ? '#ef4444' : 'var(--fg-muted)',
            fontWeight: 700,
            fontSize: '0.8rem',
          }}
          title={currentUser ? (liked ? 'Unlike' : 'Like') : 'Sign in to like posts'}
        >
          <Heart size={14} fill={liked ? '#ef4444' : 'none'} /> {post.likeCount || 0}
        </button>

        <button
          type="button"
          onClick={handleToggleComments}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            background: commentsOpen ? 'var(--blue-tint)' : 'var(--bg-subtle)',
            border: '1px solid var(--line)',
            borderRadius: '20px',
            padding: '5px 12px',
            cursor: 'pointer',
            color: commentsOpen ? 'var(--blue)' : 'var(--fg-muted)',
            fontWeight: 700,
            fontSize: '0.8rem',
          }}
          title="Comments"
        >
          <MessageCircle size={14} /> {localCommentCount}
        </button>

        <button
          type="button"
          onClick={handleShare}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            background: 'var(--bg-subtle)',
            border: '1px solid var(--line)',
            borderRadius: '20px',
            padding: '5px 12px',
            cursor: 'pointer',
            color: shareCopied ? '#16a34a' : 'var(--fg-muted)',
            fontWeight: 700,
            fontSize: '0.8rem',
          }}
          title="Share"
        >
          {shareCopied ? <Check size={14} /> : <Share2 size={14} />} {shareCopied ? 'Copied!' : 'Share'}
        </button>

        {currentUser && !isOwner && (
          <button
            type="button"
            onClick={() => onReport(post)}
            className="icon-btn"
            title="Report this post"
            style={{ width: '30px', height: '30px', marginLeft: 'auto' }}
          >
            <Flag size={14} />
          </button>
        )}

        {post.type === 'video' && post.videoSourceUrl && (
          <a
            href={post.videoSourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="icon-btn"
            title="Open original"
            style={{ width: '30px', height: '30px', marginLeft: isOwner || !currentUser ? 'auto' : 0 }}
          >
            <ExternalLink size={14} />
          </a>
        )}
      </div>

      {/* Comments panel */}
      {commentsOpen && (
        <div style={{ padding: '4px 16px 16px', borderTop: '1px solid var(--line)' }}>
          {isLoadingComments ? (
            <div style={{ padding: '14px 0', textAlign: 'center', color: 'var(--fg-muted)' }}>
              <Loader2 size={16} className="spin-icon" />
            </div>
          ) : (
            <>
              {comments.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', margin: '10px 0' }}>No comments yet — be the first.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '10px 0' }}>
                  {comments.map((c) => (
                    <div key={c.id} style={{ fontSize: '0.84rem', lineHeight: 1.5 }}>
                      <button
                        type="button"
                        onClick={() => onOpenAuthor(c.authorUsername)}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 700, color: 'var(--fg)', marginRight: '6px' }}
                      >
                        @{c.authorUsername}
                      </button>
                      <span style={{ color: 'var(--fg-muted)' }}>{c.body}</span>
                      <div style={{ fontSize: '0.72rem', color: 'var(--fg-muted)', marginTop: '2px' }}>{formatAgo(c.createdAt)}</div>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleSubmitComment} style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <input
                  type="text"
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  placeholder={currentUser ? 'Add a comment...' : 'Sign in to comment'}
                  onFocus={() => {
                    if (!currentUser) onOpenAuth('Sign in to comment.');
                  }}
                  maxLength={2000}
                  className="form-input"
                  style={{ flex: 1, padding: '7px 12px', fontSize: '0.84rem' }}
                />
                <button
                  type="submit"
                  disabled={isSubmittingComment || !commentDraft.trim()}
                  className="icon-btn"
                  style={{ width: '34px', height: '34px', flexShrink: 0, opacity: commentDraft.trim() ? 1 : 0.5 }}
                  title="Post comment"
                >
                  {isSubmittingComment ? <Loader2 size={14} className="spin-icon" /> : <Send size={14} />}
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </article>
  );
};
