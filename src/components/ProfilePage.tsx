import React, { useEffect, useState } from 'react';
import { Loader2, AtSign, Calendar, Edit3, Check } from 'lucide-react';
import { CommunityPost, User, UserProfile } from '../types';
import { fetchProfileByUsername, fetchPostsByUsername, togglePostLike, deletePost, updateProfileBio } from '../utils/community';
import { PostCard } from './PostCard';

interface ProfilePageProps {
  username: string;
  currentUser: User | null;
  onOpenProfile: (username: string) => void;
  onBack: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ username, currentUser, onOpenProfile, onBack }) => {
  const [profile, setProfile] = useState<UserProfile | null | undefined>(undefined);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState('');

  const isOwnProfile = Boolean(currentUser?.username && currentUser.username.toLowerCase() === username.toLowerCase());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      const [p, userPosts] = await Promise.all([fetchProfileByUsername(username), fetchPostsByUsername(username)]);
      if (cancelled) return;
      setProfile(p);
      setBioDraft(p?.bio || '');
      setPosts(userPosts);
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [username]);

  const handleToggleLike = async (post: CommunityPost) => {
    if (!currentUser?.uid) return;
    const liked = post.likedBy?.includes(currentUser.uid);
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, likeCount: p.likeCount + (liked ? -1 : 1), likedBy: liked ? p.likedBy?.filter((u) => u !== currentUser.uid) : [...(p.likedBy || []), currentUser.uid!] }
          : p
      )
    );
    await togglePostLike(post.id, currentUser.uid, Boolean(liked)).catch(() => {});
  };

  const handleDelete = async (post: CommunityPost) => {
    if (!confirm(`Delete "${post.title}"? This can't be undone.`)) return;
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
    await deletePost(post.id).catch(() => {});
  };

  const handleSaveBio = async () => {
    if (!currentUser?.uid) return;
    const ok = await updateProfileBio(currentUser.uid, bioDraft);
    if (ok) {
      setProfile((p) => (p ? { ...p, bio: bioDraft } : p));
      setIsEditingBio(false);
    }
  };

  if (isLoading) {
    return (
      <main className="w" style={{ padding: '80px 16px', textAlign: 'center', color: 'var(--fg-muted)' }}>
        <Loader2 size={24} className="spin-icon" />
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="w" style={{ padding: '80px 16px', textAlign: 'center' }}>
        <h2 style={{ fontWeight: 800 }}>No one here with that username</h2>
        <button onClick={onBack} className="btn-primary" style={{ marginTop: '16px', padding: '10px 20px' }}>
          Back to Community
        </button>
      </main>
    );
  }

  return (
    <main className="w" style={{ padding: '32px 16px 60px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '20px',
          background: 'var(--bg-card)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: '26px',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--blue-tint)',
            color: 'var(--blue)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1.6rem',
            flexShrink: 0,
          }}
        >
          {profile.displayName.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 2px' }}>{profile.displayName}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--fg-muted)', fontSize: '0.84rem', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <AtSign size={13} /> {profile.username}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={13} /> Joined {new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
            </span>
            <span>{posts.length} {posts.length === 1 ? 'post' : 'posts'}</span>
          </div>

          {isEditingBio ? (
            <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
              <input
                className="form-input"
                value={bioDraft}
                onChange={(e) => setBioDraft(e.target.value.slice(0, 280))}
                placeholder="Say something about yourself..."
                style={{ flex: 1 }}
                autoFocus
              />
              <button onClick={handleSaveBio} className="btn-primary" style={{ padding: '0 14px', display: 'flex', alignItems: 'center' }}>
                <Check size={16} />
              </button>
            </div>
          ) : (
            <p style={{ margin: '8px 0 0', fontSize: '0.88rem', color: profile.bio ? 'var(--fg)' : 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {profile.bio || (isOwnProfile ? 'Add a short bio' : '')}
              {isOwnProfile && (
                <button
                  onClick={() => setIsEditingBio(true)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--blue)', display: 'inline-flex' }}
                  title="Edit bio"
                >
                  <Edit3 size={13} />
                </button>
              )}
            </p>
          )}
        </div>
      </div>

      {posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--fg-muted)', border: '1px dashed var(--line)', borderRadius: 'var(--radius-lg)' }}>
          {isOwnProfile ? "You haven't posted anything yet." : `@${profile.username} hasn't posted anything yet.`}
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
              onReport={() => {}}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </main>
  );
};
