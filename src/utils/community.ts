import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit as fsLimit,
  addDoc,
  runTransaction,
  arrayUnion,
  arrayRemove,
  increment,
  deleteDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, storage, ref, uploadBytesResumable, getDownloadURL, functions, httpsCallable } from '../firebase';
import { CommunityPost, PostType, UserProfile, LinkPreview } from '../types';

// ---------------------------------------------------------------------------
// Usernames & profiles
// ---------------------------------------------------------------------------

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export function validateUsername(raw: string): string | null {
  const clean = raw.trim().toLowerCase();
  if (!USERNAME_PATTERN.test(clean)) {
    return 'Usernames are 3-20 characters: lowercase letters, numbers, and underscores only.';
  }
  return null;
}

/** Claims a username for the signed-in user, enforcing uniqueness via a
 * transaction (read the reservation doc; if it's taken, abort). Creates
 * both /usernames/{lower} (the reservation) and /profiles/{uid} (the public
 * profile) atomically so the two can never go out of sync. */
export async function claimUsername(
  uid: string,
  rawUsername: string,
  displayName: string
): Promise<{ success: boolean; message: string; profile?: UserProfile }> {
  const error = validateUsername(rawUsername);
  if (error) return { success: false, message: error };

  const usernameLower = rawUsername.trim().toLowerCase();
  const usernameRef = doc(db, 'usernames', usernameLower);
  const profileRef = doc(db, 'profiles', uid);

  try {
    const profile = await runTransaction(db, async (tx) => {
      const existing = await tx.get(usernameRef);
      if (existing.exists() && existing.data()?.uid !== uid) {
        throw new Error('TAKEN');
      }
      const nowIso = new Date().toISOString();
      const profileData: UserProfile = {
        uid,
        username: rawUsername.trim(),
        usernameLower,
        displayName: displayName || rawUsername.trim(),
        createdAt: nowIso,
      };
      tx.set(usernameRef, { uid, createdAt: nowIso }, { merge: true });
      tx.set(profileRef, profileData, { merge: true });
      return profileData;
    });
    return { success: true, message: `You're @${profile.username}!`, profile };
  } catch (err: any) {
    if (err?.message === 'TAKEN') {
      return { success: false, message: 'That username is already taken — try another.' };
    }
    console.warn('claimUsername error:', err);
    return { success: false, message: 'Could not claim that username. Please try again.' };
  }
}

export async function fetchProfileByUid(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, 'profiles', uid));
    return snap.exists() ? (snap.data() as UserProfile) : null;
  } catch (err) {
    console.warn('fetchProfileByUid error:', err);
    return null;
  }
}

export async function fetchProfileByUsername(username: string): Promise<UserProfile | null> {
  try {
    const usernameLower = username.trim().toLowerCase();
    const reservationSnap = await getDoc(doc(db, 'usernames', usernameLower));
    if (!reservationSnap.exists()) return null;
    const uid = reservationSnap.data()?.uid;
    if (!uid) return null;
    return fetchProfileByUid(uid);
  } catch (err) {
    console.warn('fetchProfileByUsername error:', err);
    return null;
  }
}

export async function updateProfileBio(uid: string, bio: string): Promise<boolean> {
  try {
    await setDoc(doc(db, 'profiles', uid), { bio: bio.slice(0, 280) }, { merge: true });
    return true;
  } catch (err) {
    console.warn('updateProfileBio error:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Video URL parsing (YouTube / Vimeo) — "copy from Reddit" means a video
// post embeds the platform's own player from a pasted link, not a raw file
// upload, the same way Reddit's link/video posts work.
// ---------------------------------------------------------------------------

export function parseVideoEmbedUrl(rawUrl: string): { embedUrl: string; platform: string } | null {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, '').toLowerCase();

  if (host === 'youtube.com' || host === 'm.youtube.com') {
    const id = url.searchParams.get('v') || url.pathname.match(/\/(shorts|embed)\/([a-zA-Z0-9_-]{6,})/)?.[2];
    if (id) return { embedUrl: `https://www.youtube.com/embed/${id}`, platform: 'YouTube' };
  }
  if (host === 'youtu.be') {
    const id = url.pathname.replace(/^\//, '');
    if (id) return { embedUrl: `https://www.youtube.com/embed/${id}`, platform: 'YouTube' };
  }
  if (host === 'vimeo.com') {
    const id = url.pathname.match(/\/(\d+)/)?.[1];
    if (id) return { embedUrl: `https://player.vimeo.com/video/${id}`, platform: 'Vimeo' };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Link previews
// ---------------------------------------------------------------------------

export async function fetchLinkPreview(url: string): Promise<LinkPreview | null> {
  try {
    const unfurl = httpsCallable(functions, 'unfurlLink');
    const res: any = await unfurl({ url });
    return res.data || null;
  } catch (err) {
    console.warn('fetchLinkPreview error:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Image uploads
// ---------------------------------------------------------------------------

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

export async function uploadPostImage(
  uid: string,
  postId: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<string> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Please choose a PNG, JPEG, WEBP, or GIF image.');
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('Images must be under 8MB.');
  }
  const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const storageRef = ref(storage, `post-images/${uid}/${postId}/${safeName}`);
  const task = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    task.on(
      'state_changed',
      (snap) => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      (err) => reject(err),
      async () => {
        try {
          resolve(await getDownloadURL(task.snapshot.ref));
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

export interface CreatePostInput {
  authorUid: string;
  authorUsername: string;
  authorName: string;
  authorPhotoURL?: string | null;
  type: PostType;
  title: string;
  body?: string;
  imageUrls?: string[];
  videoEmbedUrl?: string;
  videoSourceUrl?: string;
  linkUrl?: string;
  linkPreview?: LinkPreview | null;
}

export async function createPost(input: CreatePostInput): Promise<string> {
  const docRef = await addDoc(collection(db, 'posts'), {
    ...input,
    createdAt: new Date().toISOString(),
    likeCount: 0,
    likedBy: [],
    serverCreatedAt: serverTimestamp(),
  });
  return docRef.id;
}

function toPost(id: string, data: any): CommunityPost {
  return {
    id,
    authorUid: data.authorUid,
    authorUsername: data.authorUsername,
    authorName: data.authorName,
    authorPhotoURL: data.authorPhotoURL || null,
    type: data.type,
    title: data.title,
    body: data.body,
    imageUrls: data.imageUrls || [],
    videoEmbedUrl: data.videoEmbedUrl,
    videoSourceUrl: data.videoSourceUrl,
    linkUrl: data.linkUrl,
    linkPreview: data.linkPreview || null,
    createdAt:
      data.createdAt || (data.serverCreatedAt instanceof Timestamp ? data.serverCreatedAt.toDate().toISOString() : new Date().toISOString()),
    likeCount: data.likeCount || 0,
    likedBy: data.likedBy || [],
  };
}

export async function fetchAllPosts(max = 60): Promise<CommunityPost[]> {
  try {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), fsLimit(max));
    const snap = await getDocs(q);
    return snap.docs.map((d) => toPost(d.id, d.data()));
  } catch (err) {
    console.warn('fetchAllPosts error:', err);
    return [];
  }
}

export async function fetchPostsByUsername(username: string, max = 60): Promise<CommunityPost[]> {
  try {
    const q = query(
      collection(db, 'posts'),
      where('authorUsername', '==', username),
      orderBy('createdAt', 'desc'),
      fsLimit(max)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => toPost(d.id, d.data()));
  } catch (err) {
    console.warn('fetchPostsByUsername error:', err);
    return [];
  }
}

export async function togglePostLike(postId: string, uid: string, currentlyLiked: boolean): Promise<void> {
  await updateDoc(doc(db, 'posts', postId), {
    likeCount: increment(currentlyLiked ? -1 : 1),
    likedBy: currentlyLiked ? arrayRemove(uid) : arrayUnion(uid),
  });
}

export async function deletePost(postId: string): Promise<void> {
  await deleteDoc(doc(db, 'posts', postId));
}

export async function reportPost(postId: string, reportedBy: string, reason: string): Promise<void> {
  await addDoc(collection(db, 'reports'), {
    postId,
    reportedBy,
    reason: reason.slice(0, 500),
    createdAt: new Date().toISOString(),
    status: 'open',
  });
}
