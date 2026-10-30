// One-off cleanup: re-IDs every existing story under the scraper's unified
// ID scheme (category + normalized title) and runs the same dedup/pruning
// pass scripts/scrape.ts now applies on every run, against the catalog you
// already have. Run once with: npx tsx scripts/cleanup-existing-catalog.ts
import fs from 'fs';
import crypto from 'crypto';

function normalizeTitle(rawTitle: string): string {
  return rawTitle
    .replace(/\s*[-|–—:]\s*(BBC News|BBC|CNN|Reuters|AP News|AP|The Guardian|The Times|CNBC|Bloomberg|TechCrunch|The Verge|Forbes|Phys\.org|ScienceDaily).*$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function makeStoryId(categoryKey: string, rawTitle: string): string {
  const norm = normalizeTitle(rawTitle);
  return crypto.createHash('md5').update(`${categoryKey.toLowerCase()}::${norm}`).digest('hex').slice(0, 16);
}

function titleTokens(rawTitle: string): Set<string> {
  const STOPWORDS = new Set(['the', 'a', 'an', 'to', 'of', 'in', 'on', 'for', 'and', 'or', 'is', 'as', 'at', 'by', 'with', 'from', 'after', 'amid']);
  return new Set(normalizeTitle(rawTitle).split(' ').filter((w) => w.length > 2 && !STOPWORDS.has(w)));
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const tok of a) if (b.has(tok)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function isNearDuplicate(candidateTitle: string, existingTitles: string[]): boolean {
  const candTokens = titleTokens(candidateTitle);
  for (const existing of existingTitles) {
    if (jaccardSimilarity(candTokens, titleTokens(existing)) >= 0.6) return true;
  }
  return false;
}

const RETENTION_DAYS = 45;
const MAX_PER_CATEGORY = 150;

const raw = JSON.parse(fs.readFileSync('data/news.json', 'utf-8'));
const originalCount = raw.items.length;

// Re-ID under the unified scheme
const reIded = raw.items.map((item: any) => ({
  ...item,
  id: makeStoryId(item.subSector ? `${item.category}-${item.subSector}` : item.category, item.originalTitle || item.title),
}));

// Exact-id dedup (keep first occurrence — stable ordering by original array)
const seenIds = new Set<string>();
const exactDeduped: any[] = [];
for (const item of reIded) {
  if (seenIds.has(item.id)) continue;
  seenIds.add(item.id);
  exactDeduped.push(item);
}
const exactDupesRemoved = reIded.length - exactDeduped.length;

// Near-duplicate + retention + per-category cap, same logic as the scraper
const byKey = new Map<string, any[]>();
for (const item of exactDeduped) {
  const key = item.subSector ? `${item.category}::${item.subSector}` : String(item.category);
  const list = byKey.get(key) || [];
  list.push(item);
  byKey.set(key, list);
}

const cutoff = Date.now() - RETENTION_DAYS * 86400000;
const kept: any[] = [];
let staleRemoved = 0;
let nearDupRemoved = 0;

for (const list of byKey.values()) {
  const sorted = list.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const keptTitlesForKey: string[] = [];
  for (const item of sorted) {
    if (keptTitlesForKey.length >= MAX_PER_CATEGORY) break;
    if (new Date(item.date).getTime() < cutoff) {
      staleRemoved++;
      continue;
    }
    if (isNearDuplicate(item.originalTitle || item.title, keptTitlesForKey)) {
      nearDupRemoved++;
      continue;
    }
    keptTitlesForKey.push(item.originalTitle || item.title);
    kept.push(item);
  }
}

const output = { updated: new Date().toISOString(), items: kept };
// public/data is the one Vite actually copies into dist/ at build time (see
// vite.config.ts) — docs/ is a stale leftover from an old GitHub Pages
// deploy method that deploy.yml no longer uses, so it was dropped here.
const targets = ['data/news.json', 'public/data/news.json'];
for (const t of targets) {
  fs.writeFileSync(t, JSON.stringify(output, null, 2), 'utf-8');
}

console.log(`Catalog cleanup complete.`);
console.log(`  Started with: ${originalCount} stories`);
console.log(`  Re-ID'd under the unified scheme (category + normalized title)`);
console.log(`  Exact duplicate IDs removed: ${exactDupesRemoved}`);
console.log(`  Near-duplicate stories removed: ${nearDupRemoved}`);
console.log(`  Stale (>${RETENTION_DAYS}d old) removed: ${staleRemoved}`);
console.log(`  Final catalog: ${kept.length} stories`);
