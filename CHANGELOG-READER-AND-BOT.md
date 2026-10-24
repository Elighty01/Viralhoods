# Reader Experience & AI Blog Generator — What Changed and What You Need to Do

This pass covers two things you asked for: a better scrolling/reading
experience, and a bot that can write a full blog post from a title and a
style instead of only rewriting scraped RSS items. One backend change needs
a deploy before it's live — see below.

---

## ⚠️ Required steps before this works

1. **Deploy the updated Cloud Functions.**
   ```
   cd functions
   npm install
   firebase deploy --only functions
   ```
   This ships the new `generateBlogPost` function. It reuses the
   `GEMINI_API_KEY` secret already set from the last upgrade — nothing new
   to configure. Until this is deployed, the Generate button in the Bot tab
   falls back to the offline template generator (same safety net the old
   Manual Article Creator had), so it won't be broken, just not AI-written.

2. No Firestore rules changes needed this time — `stories` already allows
   admin writes (see `firestore.rules`), which is what the fix in #4 below
   relies on.

---

## 1. Continuous-scroll reading, instead of one story at a time

Opening a story now works like Apple News, Flipboard, or SmartNews: as you
scroll near the bottom of the article you're reading, the next relevant
story (same sector first, then anything else you haven't seen) loads right
underneath it, with a small "Up Next in [Sector]" divider between them. You
can just keep scrolling instead of clicking back to the feed and picking
another headline every time.

A few details:
- The page's reading-progress bar at the top now reflects your whole
  scroll session, not just one article.
- The URL and tab title update as you read into a new story (so refreshing
  or sharing the link still points at the right one), but this doesn't
  clutter your browser's back button — "Back to Trending Stories" and the
  back button both still take you to one place, not back through every
  story you scrolled past.
- Bookmark, share, and listen-aloud all work per-article in the stack, and
  starting "Listen" on a new one stops any other that was playing.
- When you reach the end of everything available, you get a clear "You're
  all caught up" panel instead of the page just trailing off.
- This is a same-sector-first / seen-story-exclusion rule, not a
  personalization engine — it doesn't learn preferences across sessions.

## 2. Infinite scroll on the main feed

The category grid used to need a "Load More" click every 24 stories. It
now loads the next batch automatically as you scroll near the bottom — the
button is still there if you'd rather click it, and it now actually
renders correctly (see #5). Added a "You're all caught up" line at the
true end of a sector's catalog too.

## 3. The bot can now write full blog posts — your main ask

The Bot tab's old "Manual Article Creator" is now an **AI Blog Post
Generator**. Give it:
- a headline (kept exactly as you type it — the AI doesn't rewrite it),
- a sector,
- a **style** (News Report, Investigative Deep-Dive, Opinion & Editorial,
  Explainer, Listicle, Feature/Narrative, or Casual & Social),
- a **length** (Short/Medium/Long, roughly 300/550/900 words),
- optional notes, angle, or facts to work in, and an optional image URL,

and it drafts the full post — summary, key takeaways, body, "why it
matters," "what's next." This is a **two-step flow now**: Generate shows
you an editable preview first (you can revise any field, or hit
Regenerate), and Publish is a separate, deliberate action. The old
version drafted and published in one click with no review step; this
gives you a chance to catch anything off before it's live.

## 4. Fixed: admin-published stories weren't actually going live

This was a real bug, not just a missing feature. The old Manual Article
Creator only saved to **this browser's localStorage** — it never wrote to
Firestore. That means a story "published" from the admin panel was
invisible to every actual visitor, and even invisible to you on a
different browser or device. Publishing (both the new generator and, by
extension, the underlying save path) now also writes to the Firestore
`stories` collection, the same place the scraper bot writes to and the
one the site reads from on every load — so a published post is live for
real readers, not just the admin session that made it.

## 5. Other small fixes

- `.cat-pill` and `.btn-outline` were used in a few places (Story Desk
  category tags, the feed's "Load More" button, the Entertainment Hub
  request button) but never defined in `index.css`, so they rendered
  unstyled. Defined both now, in the same spirit as the `.spin-icon` fix
  from the last pass.
- The article hero's fallback background (shown when a story has no
  image) is now tinted by category, like the feed cards already were,
  instead of always the same blue-purple gradient — this reads better now
  that several categories can appear stacked in one scroll session.

## 6. Known limitations — deliberately not built

- The "next story" picker is a simple same-category-then-anything-else
  rule, not a recommendation model.
- The offline fallback text (used only if Gemini can't be reached) is
  still generic template language, same as the old Manual Article
  Creator's fallback — it's a safety net, not a second AI writer.
- This pass didn't touch the scraper engine itself (RSS fetch, dedup,
  paraphrasing) — that was just rebuilt in the last upgrade. "The bot" work
  here is additive: a new generation capability alongside it.
- A story already scrolled into the stack won't live-update if the
  underlying data changes later in the same visit (e.g. a background
  re-scrape edits it) — same behavior as Flipboard/Apple News, not a bug,
  just worth knowing.
