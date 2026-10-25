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

## Deploying to GitHub Pages

Viralhoods includes an automated GitHub Actions deployment workflow (`.github/workflows/deploy.yml`).

To enable seamless deployments on `https://elighty01.github.io/Viralhoods/`:
1. In your GitHub repository, navigate to **Settings** &rarr; **Pages**.
2. Under **Build and deployment** &rarr; **Source**, select **GitHub Actions** (instead of "Deploy from a branch").
3. Push changes or run the "Deploy to GitHub Pages" action from the **Actions** tab. GitHub will automatically build and publish the app!

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
