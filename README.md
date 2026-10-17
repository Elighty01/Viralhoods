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
  - `components/`: Header, Footer, NewsCard, FeedView, AboutView, AdminView
  - `types.ts`: NewsItem and Category definitions
  - `App.tsx`: Main routing and application state
  - `index.css`: Design system and typography
- `data/news.json` & `public/data/news.json`: Active news feed data
