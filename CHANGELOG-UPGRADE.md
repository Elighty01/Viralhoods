# Viralhoods Upgrade — What Changed and What You Need to Do

This covers everything that changed in this pass, in priority order, and —
most importantly — **the deployment steps you need to do before any of the
backend changes take effect.** None of this works automatically just by
uploading the code; a few of these fixes live in Firebase and need to be
deployed there.

---

## ⚠️ Required steps before this works

1. **Deploy the new Cloud Functions.**
   ```
   cd functions
   npm install
   firebase functions:secrets:set GEMINI_API_KEY
   firebase deploy --only functions
   ```
   This ships the new admin-claim system, the rebuilt scraper, and the AI
   Assistant/Studio backends. Nothing admin-related or AI-related will work
   until this is deployed.

2. **Deploy the updated Firestore rules.**
   ```
   firebase deploy --only firestore:rules
   ```

3. **Sign in once as the Chief Administrator** (Google sign-in, the
   `tobionlyn@gmail.com` account) after deploying. The first sign-in is what
   actually grants the real admin claim — see "Security" below.

4. **Set GitHub Actions secrets** (Settings → Secrets → Actions) if not
   already set: `GEMINI_API_KEY` and optionally `GEMINI_MODEL`. The scraper
   workflow already passed these through — it just never used them before.

5. Optional, but recommended: in `functions/.env` (copy from
   `functions/.env.example`), confirm `CHIEF_ADMIN_EMAIL` matches your real
   admin email before deploying.

---

## 1. Critical: the admin login was not real security

`src/types.ts` had an admin password hardcoded in plain text
(`ADMIN_MASTER_PASSWORD`), which gets bundled straight into the JavaScript
your site ships to every visitor — anyone could open dev tools and read it.
"Admin" status was a `localStorage` flag with no server-side check at all,
which also meant the Firestore rules (which expected a real Firebase
custom claim) were silently blocking real admin actions for you, too.

**Fixed:** Admin login is now real Firebase Auth (Google sign-in or
email/password), and "admin" is a genuine Firebase custom claim, granted by
a new Cloud Function (`syncChiefAdminClaim`) that only ever grants it to the
email configured in `functions/.env` — never shipped to the browser. The
"appoint another admin" feature in the dashboard now actually works (it
calls `grantAdminClaim`/`revokeAdminClaim`), instead of being a local list
that never connected to anything real.

The GitHub Actions deploy token also moved from `localStorage` to
`sessionStorage` (cleared when you close the tab), and there's a new
**"Run Full Scrape Now"** button in the Bot tab that doesn't need a GitHub
token at all — it calls a Cloud Function directly.

## 2. Critical: the Entertainment Hub linked to piracy sites

The Videos/Music/Movies/Novels sub-pages had ~150 hardcoded "download
mirrors" pointing directly at **1337x, YTS, EZTV, nyaa.si, oceanofpdf.com,
fzmovies.net, netnaija.com, trendybeatz.com, and tooxclusive.com** — all
well-known piracy sites, 59 entries explicitly labeled "Torrent / Magnet."
This is a real legal liability (contributory copyright infringement,
the kind of thing that gets repos DMCA'd and Firebase/Google accounts
suspended), separate from the code-quality issues.

**Fixed:** every link now points to the real platform instead —
official YouTube, Spotify/YouTube Music, JustWatch (for "where to stream"),
and WorldCat/Open Library (for books). A fabricated "VirusTotal — 0/68
vendors flagged" badge (there was never a real scan) is gone, and "Request
a Download Link" is now "Suggest a Topic." The transform script that did
this rewrite is kept at `scripts/fix-entertainment-data.ts` for your own
reference/audit.

## 3. The bot — your main ask

- **Two scraper implementations generated different IDs for the same
  story**, so the same article could show up twice when the site merged
  Firestore + the static JSON. Both `scripts/scrape.ts` (GitHub Actions) and
  `functions/src/index.ts` (Firebase) now use one shared ID scheme
  (category + normalized headline), so this can't happen going forward.
- **The GitHub Actions scraper never called Gemini**, despite being handed
  the API key — it just prefixed the original headline and reused the RSS
  summary almost verbatim. Both pipelines now generate genuinely original
  headlines/summaries via Gemini, with a template fallback if the API key
  is missing or a call fails.
- **Dedup only caught byte-identical titles**, and nothing was ever
  removed, so the catalog grew forever. There's now near-duplicate
  detection (catches the same story reported differently across outlets)
  plus automatic pruning — anything older than 45 days, or beyond 150
  stories per sector, is dropped.
- **The Entertainment Hub's sub-pages never got bot content** — they were
  100% hand-authored and static. The bot now also covers Videos/Music/
  Movies/Novels via dedicated RSS feeds, shown as a "Latest Coverage"
  section on each sub-page.
- I ran the new cleanup logic against your **actual existing**
  `data/news.json` (158 stories): it found and removed **1 genuine
  near-duplicate**, and re-ID'd everything under the new unified scheme so
  future scrapes correctly recognize what's already there.
- The admin "create custom story" tool now drafts with real Gemini
  (`generateArticleDraft`) instead of the old boilerplate template, with the
  template kept only as an offline fallback.

## 4. Performance

- The initial JS bundle included the entire admin console (3,800 lines),
  the entire Entertainment Hub, and both AI features — all loaded on every
  single page view, even for a reader who never touches any of them.
  These are now lazy-loaded (`React.lazy`/`Suspense`), fetched only the
  first time they're actually opened. Measured result: **~264 KB (15%)
  smaller initial download**, plus ~260 KB across those four features that
  now loads only on demand instead of always.
- The main feed rendered every matching story at once with no limit —
  harmless with a few dozen items, but the catalog now grows continuously.
  Added pagination (24 at a time, "Load More").
- A Firestore "connection test" ran on every page load for no functional
  benefit — removed in production (now dev-only).
- Several `fetch('/api/...')` calls fired on common actions (every page
  view, every search) against endpoints that don't exist anywhere in this
  project — they always 404'd before silently falling back. Removed:
  analytics now goes straight to its real fallback paths (and a genuine
  Firestore-backed aggregate summary replaces the dead `/api/analytics/
  summary` call, using atomic counters instead of the old read-then-write
  pattern, which could lose counts under concurrent visits). Search goes
  straight to local + direct Google links.

## 5. Other bugs fixed

- 3 broken logo references (`ArticleView.tsx` ×2, `NewsCard.tsx`) used an
  absolute `/logo.svg` path that 404s once deployed under `/Viralhoods/` —
  now use the same relative-path pattern `BrandLogo.tsx` already had right.
- Firestore writes for your own member/subscriber record didn't match your
  security rules (wrong document ID, missing a required field), so they
  silently failed on every sign-in. Fixed, and the rules now also let a
  signed-in user update their own record on a return visit (previously
  only admins could, which would have broken this again on a second
  sign-in).
- The AI Assistant chat, AI Studio's image generator, and the "maps"
  feature called backend routes that don't exist anywhere in this project
  — they're now wired to real Cloud Functions. Video and music generation
  are **not** implemented (see below) — they now say so clearly instead of
  failing silently.
- `functions/lib` (the compiled output `firebase deploy` actually ships)
  could get out of sync with `functions/src` since nothing rebuilt it
  automatically — added a `predeploy` hook in `firebase.json` so
  `firebase deploy` always rebuilds first.

## 6. Known limitations — deliberately not built

- **Video and music generation** (the AI Studio's Veo/Lyria tabs) are not
  connected to a real backend. These need dedicated API access and, for
  video, a job-polling UI this Studio doesn't have (generation can take
  minutes). Rather than fake it or risk a broken implementation I couldn't
  test, the buttons now say plainly that this isn't connected yet.
- **Maps grounding** answers with Gemini's general knowledge rather than
  live Google Maps data — true Maps grounding is a documented extension
  point in `geminiMapsQuery` once you confirm the exact tool schema for
  your API tier.
- I could not test any of the Gemini-calling Cloud Functions against a
  real API key (no network access to Google's APIs from where I built
  this) — they follow the exact call pattern already proven elsewhere in
  your repo, but test them after deploying and let me know if anything
  needs adjusting.
- The entertainment data's numeric stats (view counts, "downloads") were
  always illustrative placeholder numbers, not real data — I left most of
  them as-is (removed the ones displayed as hard security/download facts)
  rather than scope-creep into a full content accuracy pass.
- `server.ts` (the Express/JWT backend) is complete and secure but isn't
  used by the deployed site — Firebase Auth replaced it. It's left in place
  as an optional component if you ever self-host a server separately; see
  the comment at the top of the file.
