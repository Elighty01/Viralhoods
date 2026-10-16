# Viralhoods

A news site for GitHub Pages. A bot runs every day on GitHub Actions and updates `data/news.json`.

## Set up
1. Create a GitHub repository and upload everything in this folder. Keep the folders as they are.
2. Go to Settings > Pages. Choose "Deploy from a branch", then `main` and `/ (root)`.
3. Go to Settings > Secrets and variables > Actions. Add a secret named `GEMINI_API_KEY` (a free key from Google AI Studio) or `ANTHROPIC_API_KEY`. If both exist, Gemini is used. With neither, the bot shows the feed's own short excerpt instead of a rewrite. If Google retires the Gemini model, add a repository variable named `GEMINI_MODEL` with a newer model name (Settings > Secrets and variables > Actions > Variables).
4. Open the Actions tab, choose "news", then "Run workflow". After this the bot runs by itself every day at 06:00 UTC.

## Admin button
Create a fine-grained GitHub token for this repository only, with Actions read and write access. Open `admin.html` on your site, paste your `username/repository` and the token, then press "Refresh news now". The token stays in your browser only.

## Change things
- News sources: the `FEEDS` list at the top of `bot/fetch_news.py`.
- Run time: the `cron` line in `.github/workflows/news.yml`.
- Contact email: `about.html`. Social links: the footer in `app.js`.
