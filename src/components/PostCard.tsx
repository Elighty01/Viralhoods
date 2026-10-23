import React, { useState } from 'react';
import { Heart, ExternalLink, Flag, Trash2, MoreHorizontal, PlayCircle } from 'lucide-react';
import { CommunityPost, User } from '../types';
import { formatAgo } from './NewsCard';

interface PostCardProps {
  post: CommunityPost;
  currentUser: User | null;
  onToggleLike: (post: CommunityPost) => void;
  onOpenAuthor: (username: string) => void;
  onReport: (post: CommunityPost) => void;
  onDelete: (post: CommunityPost) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, currentUser, onToggleLike, onOpenAuthor, onReport, onDelete }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  const liked = Boolean(currentUser?.uid && post.likedBy?.includes(currentUser.uid));
  const isOwner = Boolean(currentUser?.uid && currentUser.uid === post.authorUid);
  const canModerate = isOwner || Boolean(currentUser?.isAdmin);

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
      {/* Author row */}
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
            post.authorName?.charAt(0).toUpperCase() || '?'
          )}
        </button>
        <div style={{ minWidth: 0, flex: 1 }}>
          <button
            type="button"
            onClick={() => onOpenAuthor(post.authorUsername)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'block' }}
          >
            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--fg)' }}>{post.authorName}</span>
          </button>
          <div style={{ fontSize: '0.76rem', color: 'var(--fg-muted)' }}>
            @{post.authorUsername} · {formatAgo(post.createdAt)}
          </div>
        </div>

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

      {/* Body / media by type */}
      {post.type === 'text' && post.body && (
        <p style={{ margin: '0 16px 14px', fontSize: '0.88rem', color: 'var(--fg-muted)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
          {post.body}
        </p>
      )}

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

      {post.type === 'link' && post.linkUrl && (
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
      )}

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px 14px', borderTop: '1px solid var(--line)', marginTop: 'auto' }}>
        <button
          type="button"
          onClick={() => onToggleLike(post)}
          disabled={!currentUser}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            background: liked ? 'rgba(239,68,68,0.1)' : 'var(--bg-subtle)',
            border: '1px solid var(--line)',
            borderRadius: '20px',
            padding: '5px 12px',
            cursor: currentUser ? 'pointer' : 'default',
            color: liked ? '#ef4444' : 'var(--fg-muted)',
            fontWeight: 700,
            fontSize: '0.8rem',
          }}
          title={currentUser ? (liked ? 'Unlike' : 'Like') : 'Sign in to like posts'}
        >
          <Heart size={14} fill={liked ? '#ef4444' : 'none'} /> {post.likeCount || 0}
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
            <PlayCircle size={14} />
          </a>
        )}
      </div>
    </article>
  );
};
