import React, { useEffect, useState } from 'react';
import { PlusCircle, Users, Loader2 } from 'lucide-react';
import { CommunityPost, User } from '../types';
import { fetchAllPosts, togglePostLike, deletePost, reportPost, fetchFollowingSet, followUser, unfollowUser } from '../utils/community';
import { PostCard } from './PostCard';

interface CommunityHubProps {
  currentUser: User | null;
  onOpenAuth: (message?: string) => void;
  onOpenCreatePost: () => void;
  onOpenProfile: (username: string) => void;
  newPost?: CommunityPost | null;
}

export const CommunityHub: React.FC<CommunityHubProps> = ({ currentUser, onOpenAuth, onOpenCreatePost, onOpenProfile, newPost }) => {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reportTarget, setReportTarget] = useState<CommunityPost | null>(null);
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());

  const load = async () => {
    setIsLoading(true);
    const data = await fetchAllPosts();
    setPosts(data);
    setIsLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // One query for every author's follow state, instead of a read per card.
  useEffect(() => {
    if (!currentUser?.uid) {
      setFollowingSet(new Set());
      return;
    }
    fetchFollowingSet(currentUser.uid).then(setFollowingSet);
  }, [currentUser?.uid]);

  // A freshly created post is prepended immediately for a snappy feel,
  // instead of waiting on a full refetch.
  useEffect(() => {
    if (newPost) {
      setPosts((prev) => [newPost, ...prev.filter((p) => p.id !== newPost.id)]);
    }
  }, [newPost]);

  const handleToggleLike = async (post: CommunityPost) => {
    if (!currentUser?.uid) {
      onOpenAuth('Sign in to like posts.');
      return;
    }
    const liked = post.likedBy?.includes(currentUser.uid);
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, likeCount: p.likeCount + (liked ? -1 : 1), likedBy: liked ? p.likedBy?.filter((u) => u !== currentUser.uid) : [...(p.likedBy || []), currentUser.uid!] }
          : p
      )
    );
    try {
      await togglePostLike(post.id, currentUser.uid, Boolean(liked));
    } catch {
      load();
    }
  };

  const handleToggleFollow = async (post: CommunityPost) => {
    if (!currentUser?.uid) {
      onOpenAuth('Sign in to follow people.');
      return;
    }
    const alreadyFollowing = followingSet.has(post.authorUid);
    setFollowingSet((prev) => {
      const next = new Set(prev);
      if (alreadyFollowing) next.delete(post.authorUid);
      else next.add(post.authorUid);
      return next;
    });
    try {
      if (alreadyFollowing) await unfollowUser(currentUser.uid, post.authorUid);
      else await followUser(currentUser.uid, post.authorUid);
    } catch {
      // Revert the optimistic toggle on failure.
      setFollowingSet((prev) => {
        const next = new Set(prev);
        if (alreadyFollowing) next.add(post.authorUid);
        else next.delete(post.authorUid);
        return next;
      });
    }
  };

  const handleDelete = async (post: CommunityPost) => {
    if (!confirm(`Delete "${post.title}"? This can't be undone.`)) return;
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
    try {
      await deletePost(post.id);
    } catch {
      load();
    }
  };

  return (
    <main className="w" style={{ padding: '32px 16px 60px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap', marginBottom: '22px' }}>
        <div>
          <h1 style={{ fontSize: '1.7rem', fontWeight: 800, margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={24} color="var(--blue)" /> Community
          </h1>
          <p style={{ margin: 0, color: 'var(--fg-muted)', fontSize: '0.92rem' }}>
            Posts from Viralhoods readers — share a thought or a link worth sharing.
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => (currentUser ? onOpenCreatePost() : onOpenAuth('Sign in to create a post.'))}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 20px', whiteSpace: 'nowrap' }}
        >
          <PlusCircle size={17} /> Create Post
        </button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--fg-muted)' }}>
          <Loader2 size={24} className="spin-icon" />
          <p style={{ marginTop: '10px' }}>Loading posts...</p>
        </div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--fg-muted)', border: '1px dashed var(--line)', borderRadius: 'var(--radius-lg)' }}>
          <p style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 6px', color: 'var(--fg)' }}>No posts yet</p>
          <p style={{ margin: 0, fontSize: '0.88rem' }}>Be the first to share something with the community.</p>
        </div>
      ) : (
        <div className="grid">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUser={currentUser}
              onToggleLike={handleToggleLike}
              onOpenAuthor={onOpenProfile}
              onReport={setReportTarget}
              onDelete={handleDelete}
              onOpenAuth={onOpenAuth}
              isFollowingAuthor={followingSet.has(post.authorUid)}
              onToggleFollow={handleToggleFollow}
            />
          ))}
        </div>
      )}

      {reportTarget && (
        <ReportModal
          post={reportTarget}
          currentUser={currentUser}
          onClose={() => setReportTarget(null)}
        />
      )}
    </main>
  );
};

const ReportModal: React.FC<{ post: CommunityPost; currentUser: User | null; onClose: () => void }> = ({ post, currentUser, onClose }) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.uid) return;
    setIsSubmitting(true);
    try {
      await reportPost(post.id, currentUser.uid, reason || 'No reason given');
      setDone(true);
      setTimeout(onClose, 1200);
    } catch {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '380px' }}>
        <div className="modal-header">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Report Post</h3>
        </div>
        {done ? (
          <p style={{ color: 'var(--blue)', fontWeight: 600 }}>Thanks — our team will take a look.</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <p style={{ fontSize: '0.86rem', color: 'var(--fg-muted)', margin: '0 0 12px' }}>
              Reporting "{post.title}" by @{post.authorUsername}.
            </p>
            <textarea
              className="form-input"
              rows={3}
              placeholder="What's wrong with this post? (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{ resize: 'vertical', fontFamily: 'inherit', marginBottom: '14px' }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--line)', background: 'var(--bg-subtle)', fontWeight: 700, cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ flex: 1, padding: '10px' }}>
                {isSubmitting ? 'Sending...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
