# New: Community (reader-posted blog board)

Signed-in readers can now post their own content and have it live on their
own profile page, linked by username — a "Community" board similar in
spirit to Reddit: pick a post type, fill in the type-specific fields, publish.

## What's there

- **A "Community" tab** in the main nav (next to the news categories) and
  in the footer — the board's main feed, newest first, filterable by type.
- **Four post types**, each with its own composer:
  - **Text** — a title and a body.
  - **Image** — upload a PNG/JPEG/WEBP/GIF (8MB limit) with an optional
    caption. Stored in Firebase Storage under `post-images/{uid}/{postId}/`.
  - **Video** — paste a YouTube or Vimeo link; it's parsed into an embedded
    player automatically. (Direct video file upload isn't supported — see
    "Why no direct video upload" below.)
  - **Link** — paste any URL and a Cloud Function (`unfurlLink`) fetches it
    server-side and pulls a title/description/image, the same way Reddit or
    Twitter show a preview card for a pasted link.
- **A profile page per username** (`#u/yourname`) showing display name, an
  editable bio, join date, and every post that person has made. The first
  time a signed-in reader tries to post, they're prompted to claim a
  username (3-20 characters, lowercase letters/numbers/underscores,
  permanent, enforced unique via a Firestore transaction).
- **Likes** — any signed-in reader can like/unlike a post; the count updates
  immediately and syncs in the background.
- **Reporting + moderation** — any signed-in reader can report a post they
  find on the board; reports land in a new **Community Reports** tab in the
  admin dashboard, where an admin can dismiss the report or remove the post
  (which also dismisses the report).
- Post owners (and admins) can delete a post from its card directly.

## Required deployment steps

This adds a new Cloud Function and new Storage rules, on top of what the
previous upgrade already needed:

```
firebase deploy --only functions,firestore:rules,storage:rules
```

If you haven't deployed Storage rules before, make sure Firebase Storage is
enabled for this project in the Firebase console first (Build → Storage →
Get started) — it already has a bucket configured
(`warm-victor-1vr20.firebasestorage.app`), but the rules still need an
explicit deploy.

## Why no direct video upload

Reddit-style video posts are usually either an embedded platform video or a
direct upload. I went with embeds-only (paste a YouTube/Vimeo link) rather
than direct video file upload, because direct video brings real added
complexity and cost this project isn't set up for yet: much larger files
than images (tens to hundreds of MB vs. a few MB), no transcoding (so
whatever format someone uploads is exactly what every viewer's browser has
to play, with no compatibility fallback), and meaningfully higher Storage
and bandwidth costs per post. Embedding a YouTube/Vimeo link sidesteps all
of that while still covering "share a video," which is the common case. If
you want true direct video upload later, that's a well-scoped follow-up
(Storage rules with a larger size limit + a transcoding step, most likely
via a Cloud Function trigger) rather than a quick addition.

## New data, for reference

- Firestore: `posts` (the posts), `profiles` (public username/bio, separate
  from the private `registered_users` roster), `usernames` (uniqueness
  reservation — one doc per claimed username), `reports` (moderation queue).
- Storage: `post-images/{uid}/{postId}/{filename}`.
- The `unfurlLink` Cloud Function blocks requests to private/internal/cloud
  metadata addresses before fetching a submitted URL (the standard
  precaution for any server-side "fetch a URL someone typed in" feature —
  without it, a malicious link could be used to probe your own internal
  network from the function's environment).
