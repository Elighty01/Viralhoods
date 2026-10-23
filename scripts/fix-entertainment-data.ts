// One-off transform: rewrites src/data/entertainmentDownloads.ts so every
// item points at a real, legitimate destination (official YouTube, Spotify/
// YouTube Music, JustWatch, WorldCat/Open Library) instead of the piracy
// sites (1337x, YTS, EZTV, nyaa.si, oceanofpdf.com, fzmovies, netnaija,
// trendybeatz, tooxclusive) the data previously pointed to. Run once with:
//   npx tsx scripts/fix-entertainment-data.ts
import fs from 'fs';
import { ENTERTAINMENT_DOWNLOADS, EntertainmentDownloadItem, DownloadMirror } from '../src/data/entertainmentDownloads';

function q(title: string): string {
  const cleaned = title.replace(/\s*[\(\[].*?[\)\]]\s*/g, ' ').replace(/\s+/g, ' ').trim();
  return encodeURIComponent(cleaned);
}

function buildLegitimateSources(item: EntertainmentDownloadItem): { downloadUrl: string; hostDomain: string; mirrors: DownloadMirror[] } {
  const query = q(item.title);

  if (item.type === 'video') {
    const yt = item.trailerYoutubeId
      ? `https://www.youtube.com/watch?v=${item.trailerYoutubeId}`
      : `https://www.youtube.com/results?search_query=${query}`;
    return {
      downloadUrl: yt,
      hostDomain: 'youtube.com',
      mirrors: [{ name: 'Watch on YouTube', url: yt, speed: 'Verified', type: 'Streaming Host' }],
    };
  }

  if (item.type === 'music') {
    const spotify = `https://open.spotify.com/search/${query}`;
    const ytMusic = `https://music.youtube.com/search?q=${query}`;
    return {
      downloadUrl: spotify,
      hostDomain: 'open.spotify.com',
      mirrors: [
        { name: 'Listen on Spotify', url: spotify, speed: 'Verified', type: 'Streaming Host' },
        { name: 'Listen on YouTube Music', url: ytMusic, speed: 'Verified', type: 'Streaming Host' },
      ],
    };
  }

  if (item.type === 'movie') {
    const justwatch = `https://www.justwatch.com/us/search?q=${query}`;
    const yt = item.trailerYoutubeId
      ? `https://www.youtube.com/watch?v=${item.trailerYoutubeId}`
      : `https://www.youtube.com/results?search_query=${query}+official+trailer`;
    return {
      downloadUrl: justwatch,
      hostDomain: 'justwatch.com',
      mirrors: [
        { name: 'Where to Stream (JustWatch)', url: justwatch, speed: 'Verified', type: 'Streaming Host' },
        { name: 'Official Trailer', url: yt, speed: 'Verified', type: 'Streaming Host' },
      ],
    };
  }

  // novel (incl. manga)
  const worldcat = `https://www.worldcat.org/search?q=${query}`;
  const openLibrary = `https://openlibrary.org/search?q=${query}`;
  return {
    downloadUrl: worldcat,
    hostDomain: 'worldcat.org',
    mirrors: [
      { name: 'Find at a Library (WorldCat)', url: worldcat, speed: 'Verified', type: 'Public Archive' },
      { name: 'Open Library', url: openLibrary, speed: 'Verified', type: 'Public Archive' },
    ],
  };
}

const rewritten: EntertainmentDownloadItem[] = ENTERTAINMENT_DOWNLOADS.map((item) => {
  const { downloadUrl, hostDomain, mirrors } = buildLegitimateSources(item);
  return { ...item, downloadUrl, hostDomain, mirrors, sampleAudioUrl: undefined };
});

function tsLiteral(value: any, indent = 0): string {
  const pad = '  '.repeat(indent);
  const pad1 = '  '.repeat(indent + 1);
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const items = value.map((v) => `${pad1}${tsLiteral(v, indent + 1)}`).join(',\n');
    return `[\n${items}\n${pad}]`;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${pad1}${k}: ${tsLiteral(v, indent + 1)}`)
      .join(',\n');
    return `{\n${entries}\n${pad}}`;
  }
  return JSON.stringify(value);
}

const header = `export interface DownloadMirror {
  name: string;
  url: string;
  speed: 'Verified' | 'Standard';
  type: 'Streaming Host' | 'Public Archive' | 'Official Source';
}

export interface EntertainmentDownloadItem {
  id: string;
  type: 'video' | 'music' | 'movie' | 'novel';
  subtype?: 'movie' | 'series' | 'anime' | 'trailer' | 'concert' | 'skit' | 'podcast' | 'pop' | 'afrobeats' | 'hiphop' | 'novel' | 'manga';
  title: string;
  creator: string; // Artist, Director, Author, or Channel
  description: string;
  thumbnail: string;
  genre: string;
  releaseYear: string;
  fileSize: string;
  format: string;
  quality: string;
  durationOrPages?: string;
  rating?: string;
  downloadUrl: string;
  mirrors: DownloadMirror[];
  downloadsCount: number;
  isTrending: boolean;
  addedDate: string;
  sampleAudioUrl?: string;
  sampleVideoUrl?: string;
  trailerYoutubeId?: string;
  synopsisOrExcerpt?: string;
  episodesCount?: number;
  hostDomain?: string;
}

// NOTE: every item's \`downloadUrl\`/\`mirrors\`/\`hostDomain\` point to a real,
// legitimate destination (official YouTube, Spotify/YouTube Music, JustWatch,
// WorldCat/Open Library) — this file previously linked directly to piracy
// sites (1337x, YTS, EZTV, nyaa.si, oceanofpdf.com, fzmovies, netnaija,
// trendybeatz, tooxclusive), which was a real legal liability. See
// scripts/fix-entertainment-data.ts for the transform that produced this.
export const ENTERTAINMENT_DOWNLOADS: EntertainmentDownloadItem[] = `;

const body = tsLiteral(rewritten, 0);
fs.writeFileSync('src/data/entertainmentDownloads.ts', header + body + ';\n', 'utf-8');
console.log(`Rewrote ${rewritten.length} entertainment items with legitimate sources.`);
