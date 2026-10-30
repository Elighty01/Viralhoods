# Viralhoods

A fast, responsive trending news aggregator built with React, TypeScript, and Vite. Viralhoods compiles short, clear summaries of what is trending across politics, finance, health, entertainment, research, science, AI, tech, sports, and world news.

## Features

- **Categorized News Feed**: Filter by sectors including World, Politics, Finance, Health, Entertainment, Research, Science, AI, Tech, and Sports.
- **Dynamic Lead & Grid Layout**: Highlights the top trending story with a prominent lead card and displays remaining sector stories in a clean grid.
- **Instant Search**: Real-time story title and summary filtering.
- **Graceful Fallbacks**: Dynamic HSL gradients tailored to each news category when images are unavailable or fail to load.
- **Admin Dashboard**: Trigger repository workflows via GitHub Actions workflow dispatches using a fine-grained token stored locally in the browser.
- **Responsive & Dark Mode**: Bricolage Grotesque typography with automatic light and dark mode support.

## Development

```bash
# Install dependencies
npm install

# Start development server on port 3000
npm run dev

# Build production bundle
```

## Deploying to Cloudflare Pages

Viralhoods includes an automated GitHub Actions deployment workflow (`.github/workflows/deploy.yml`) that builds the site with Vite and publishes `dist/` to Cloudflare Pages via [`cloudflare/wrangler-action`](https://github.com/cloudflare/wrangler-action).

One-time setup:
1. **Create the Pages project.** In the Cloudflare dashboard, go to **Workers & Pages** &rarr; **Create** &rarr; **Pages**, and create a project (any name — "direct upload" is fine, since the GitHub Actions workflow does the building, not Cloudflare's own Git integration). Note the project name.
2. **Create an API token.** In the Cloudflare dashboard, go to **My Profile** &rarr; **API Tokens** &rarr; **Create Token**, using the "Edit Cloudflare Workers" template (or a custom token with **Account &rarr; Cloudflare Pages &rarr; Edit** permission). Copy the token.
3. **Find your Account ID.** Shown on the right-hand side of any zone's Overview page in the Cloudflare dashboard, or in **Workers & Pages** &rarr; **Overview**.
4. **Add three GitHub repository secrets** (**Settings** &rarr; **Secrets and variables** &rarr; **Actions**):
   - `CLOUDFLARE_API_TOKEN` — the token from step 2.
   - `CLOUDFLARE_ACCOUNT_ID` — the ID from step 3.
   - `CLOUDFLARE_PAGES_PROJECT` — the project name from step 1.
5. Push to `main` (or run the "Deploy to Cloudflare Pages" workflow from the **Actions** tab). The site will be live at `https://<project-name>.pages.dev` — attach a custom domain under the Pages project's **Custom domains** tab whenever you're ready.

The site builds with a relative asset base path (see `vite.config.ts`), so it works correctly whether it's served from the Pages subdomain, a custom domain, or a subpath — no build configuration changes needed for Cloudflare specifically.

Firebase (Firestore, Auth, Cloud Functions) is unaffected by this — Cloudflare Pages only hosts the static frontend. Functions still deploy separately with `firebase deploy --only functions` and Firestore rules with `firebase deploy --only firestore:rules`.

## Cloud Functions secrets

A few Cloud Functions need secrets set once via the Firebase CLI before `firebase deploy --only functions` will succeed — these are Secret Manager values, never committed to this repo, which is deliberate: anything that used to be a hardcoded default here was flagged in a security review as trivially discoverable (this is a public repo). Run each of these once, from the `functions/` directory or the project root (either works):

```bash
firebase functions:secrets:set CHIEF_ADMIN_EMAIL   # the one account that gets Chief Administrator powers
firebase functions:secrets:set BREVO_API_KEY       # for welcome/unsubscribe emails and ad-inquiry notifications
firebase functions:secrets:set GITHUB_PAT          # fine-grained PAT, Actions:write on this repo only, used to dispatch deploy.yml/news.yml from the admin console
```

`GITHUB_REPO` isn't sensitive and defaults to `Elighty01/Viralhoods` in source — if you've forked this under a different owner/repo, override it by adding `GITHUB_REPO=yourname/yourrepo` to a `functions/.env` file (not committed; see [the `params` docs](https://firebase.google.com/docs/functions/config-env)).

Optional, for App Check (bot/abuse protection on the publicly-writable `analytics_visits` and `subscribers` collections — see the comment above `initAppCheck` in `src/firebase.ts`):
- Create a reCAPTCHA v3 key in the Firebase console under **App Check**, then set `VITE_RECAPTCHA_SITE_KEY` as a GitHub Actions secret (picked up automatically by the build step in `deploy.yml`).

## Structure

- `src/`
  - `components/`: Header, Footer, NewsCard, FeedView, AboutView, AdminView, Sidebar, CategoryShowcase
  - `types.ts`: NewsItem and Category definitions
  - `App.tsx`: Main routing and application state
  - `index.css`: Design system and typography
- `data/news.json` & `public/data/news.json`: Active news feed data
- `data/ads.json` & `public/data/ads.json`: Sidebar advertisement slots

## Homepage Layout: Sidebar & Ads

The homepage (all-sectors and single-sector feed views) uses a two-column
layout: the main story feed on the left, a sticky rail on the right
(`src/components/Sidebar.tsx`). The rail has four widgets, in order:

1. **Advertisement** — one card per entry in `data/ads.json`.
2. **From the Community** — a live pull of the 4 most recent Community posts.
3. **Trending Now** — the freshest stories across every sector.
4. **Browse by Sector** — live per-category story counts.

The all-sectors home view also shows a **"What We Cover"** sector grid
(`src/components/CategoryShowcase.tsx`) above the feed, with a live story
count per sector.

### Posting / editing adverts

Ad slots are **not** hardcoded in a component — they're read from
`public/data/ads.json` at runtime (the same pattern `news.json` already
uses), so you can add, edit, or remove an ad without touching any code:

```json
{
  "updated": "2026-10-25T00:00:00.000Z",
  "ads": [
    {
      "id": "unique-slug",
      "sponsor": "Advertiser name (optional, shown as a small label)",
      "title": "Headline shown in the card",
      "description": "One or two sentences (optional)",
      "imageUrl": "https://... (optional — leave \"\" to skip the image)",
      "href": "https://... or mailto:...",
      "cta": "Button text (optional, defaults to \"Learn more\")"
    }
  ]
}
```

Keep `data/ads.json` and `public/data/ads.json` in sync (the `data/`
copy is the source of truth; `public/data/` is what actually gets served
and fetched by the browser). An empty `"ads": []` array hides the widget
entirely. There's no admin-console UI for ads yet — adding a dedicated
"Ads" tab next to Stories/Subscribers in the Editorial Console (so they
can be managed without editing JSON by hand) is a natural next step.
