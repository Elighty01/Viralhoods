import fs from 'fs';
import path from 'path';

interface AnalyticsStore {
  updated: string;
  totalPageviews: number;
  uniqueVisitors: number;
  pages: Record<string, { views: number; uniqueVisitors: number; path: string; category?: string; type: string }>;
  countries: Record<string, { count: number; countryCode: string }>;
  cities: Record<string, { city: string; country: string; count: number }>;
  devices: Record<string, number>;
  browsers: Record<string, number>;
  os: Record<string, number>;
  channels: Record<string, number>;
  recentVisits: any[];
}

const analyticsPath = path.join(process.cwd(), 'data', 'analytics.json');

const initialAnalytics: AnalyticsStore = {
  updated: new Date().toISOString(),
  totalPageviews: 24680,
  uniqueVisitors: 8940,
  pages: {
    'Home Feed (All 10 Sectors)': { views: 6840, uniqueVisitors: 4520, path: '#all', category: 'All', type: 'home' },
    'AI Sector': { views: 3120, uniqueVisitors: 2150, path: '#ai', category: 'AI', type: 'sector' },
    'Tech Sector': { views: 2840, uniqueVisitors: 1910, path: '#tech', category: 'Tech', type: 'sector' },
    'World Sector': { views: 2450, uniqueVisitors: 1680, path: '#world', category: 'World', type: 'sector' },
    'Entertainment Hub (news)': { views: 2190, uniqueVisitors: 1470, path: '#entertainment/news', category: 'Entertainment', type: 'entertainment' },
    'Entertainment Hub (movies)': { views: 1820, uniqueVisitors: 1210, path: '#entertainment/movies', category: 'Entertainment', type: 'entertainment' },
    'Entertainment Hub (anime)': { views: 1540, uniqueVisitors: 1040, path: '#entertainment/anime', category: 'Entertainment', type: 'entertainment' },
    'Finance Sector': { views: 1860, uniqueVisitors: 1290, path: '#finance', category: 'Finance', type: 'sector' },
    'Science Sector': { views: 1680, uniqueVisitors: 1140, path: '#science', category: 'Science', type: 'sector' },
    'Sports Sector': { views: 1420, uniqueVisitors: 980, path: '#sports', category: 'Sports', type: 'sector' },
    'Politics Sector': { views: 1250, uniqueVisitors: 870, path: '#politics', category: 'Politics', type: 'sector' },
    'Health Sector': { views: 1080, uniqueVisitors: 760, path: '#health', category: 'Health', type: 'sector' },
    'Research Sector': { views: 960, uniqueVisitors: 690, path: '#research', category: 'Research', type: 'sector' },
    'Story: UN Plastics Treaty Binding Cap Finalized': { views: 740, uniqueVisitors: 620, path: '#story-world-01', category: 'World', type: 'story' },
    'Story: Formula 1 2026 Hybrid Power Units Regulation': { views: 680, uniqueVisitors: 560, path: '#story-sports-01', category: 'Sports', type: 'story' },
    'Story: James Webb Telescope Detects Organic Biosignatures on Exoplanet K2-18b': { views: 630, uniqueVisitors: 520, path: '#story-science-01', category: 'Science', type: 'story' },
    'Story: DeepSeek V3 and Frontier Open-Weights Reasoning Architecture': { views: 590, uniqueVisitors: 490, path: '#story-ai-01', category: 'AI', type: 'story' },
    'Brand & Logo Kit': { views: 620, uniqueVisitors: 410, path: '#brand', type: 'system' },
    'Admin Editorial Console': { views: 320, uniqueVisitors: 65, path: '#admin', type: 'system' }
  },
  countries: {
    'United States': { count: 10860, countryCode: 'US' },
    'United Kingdom': { count: 4210, countryCode: 'GB' },
    'Canada': { count: 2450, countryCode: 'CA' },
    'Germany': { count: 1890, countryCode: 'DE' },
    'France': { count: 1420, countryCode: 'FR' },
    'Japan': { count: 1280, countryCode: 'JP' },
    'Nigeria': { count: 1060, countryCode: 'NG' },
    'Australia': { count: 890, countryCode: 'AU' },
    'India': { count: 720, countryCode: 'IN' },
    'Brazil': { count: 540, countryCode: 'BR' },
    'Singapore': { count: 430, countryCode: 'SG' },
    'South Africa': { count: 320, countryCode: 'ZA' }
  },
  cities: {
    'New York, United States': { city: 'New York', country: 'United States', count: 3580 },
    'London, United Kingdom': { city: 'London', country: 'United Kingdom', count: 2840 },
    'San Francisco, United States': { city: 'San Francisco', country: 'United States', count: 2490 },
    'Toronto, Canada': { city: 'Toronto', country: 'Canada', count: 1480 },
    'Berlin, Germany': { city: 'Berlin', country: 'Germany', count: 1190 },
    'Tokyo, Japan': { city: 'Tokyo', country: 'Japan', count: 1120 },
    'Lagos, Nigeria': { city: 'Lagos', country: 'Nigeria', count: 980 },
    'Paris, France': { city: 'Paris', country: 'France', count: 910 },
    'Sydney, Australia': { city: 'Sydney', country: 'Australia', count: 790 },
    'Chicago, United States': { city: 'Chicago', country: 'United States', count: 720 },
    'Singapore, Singapore': { city: 'Singapore', country: 'Singapore', count: 430 },
    'Johannesburg, South Africa': { city: 'Johannesburg', country: 'South Africa', count: 320 }
  },
  devices: {
    'Mobile': 15420,
    'Desktop': 8120,
    'Tablet': 1140
  },
  browsers: {
    'Chrome': 15840,
    'Safari': 5820,
    'Firefox': 1890,
    'Microsoft Edge': 1130
  },
  os: {
    'iOS': 9240,
    'Android': 6180,
    'Windows': 5420,
    'macOS': 3280,
    'Linux': 560
  },
  channels: {
    'Google Search Engine & Grounding': 9820,
    'Direct Navigation & PWA App': 8460,
    'Social Networks (X, Reddit, LinkedIn)': 4280,
    'Daily Morning Newsletter': 2120
  },
  recentVisits: []
};

// Populate recent visits
const now = Date.now();
const sampleLocs = [
  { country: 'United States', city: 'New York', countryCode: 'US' },
  { country: 'United Kingdom', city: 'London', countryCode: 'GB' },
  { country: 'United States', city: 'San Francisco', countryCode: 'US' },
  { country: 'Canada', city: 'Toronto', countryCode: 'CA' },
  { country: 'Germany', city: 'Berlin', countryCode: 'DE' },
  { country: 'Japan', city: 'Tokyo', countryCode: 'JP' },
  { country: 'Nigeria', city: 'Lagos', countryCode: 'NG' },
  { country: 'Australia', city: 'Sydney', countryCode: 'AU' },
  { country: 'France', city: 'Paris', countryCode: 'FR' },
  { country: 'India', city: 'Mumbai', countryCode: 'IN' },
];

const samplePages = [
  { page: 'Home Feed (All 10 Sectors)', path: '#all' },
  { page: 'AI Sector', path: '#ai' },
  { page: 'Tech Sector', path: '#tech' },
  { page: 'World Sector', path: '#world' },
  { page: 'Entertainment Hub (movies)', path: '#entertainment/movies' },
  { page: 'Science Sector', path: '#science' },
  { page: 'Story: UN Plastics Treaty Binding Cap Finalized', path: '#story-world-01' },
  { page: 'Finance Sector', path: '#finance' },
  { page: 'Sports Sector', path: '#sports' }
];

const devices = ['Mobile', 'Mobile', 'Mobile', 'Desktop', 'Desktop', 'Tablet'];
const browsers = ['Chrome', 'Safari', 'Chrome', 'Firefox', 'Microsoft Edge'];
const osList = ['iOS', 'Android', 'Windows', 'macOS'];

for (let i = 0; i < 40; i++) {
  const loc = sampleLocs[i % sampleLocs.length];
  const p = samplePages[i % samplePages.length];
  const d = devices[i % devices.length];
  const b = browsers[i % browsers.length];
  const o = osList[i % osList.length];
  const offset = i * 4 * 60 * 1000 + Math.floor(Math.random() * 60000);

  initialAnalytics.recentVisits.push({
    id: `vst_${now - offset}_${i}`,
    visitorId: `usr_${Math.floor(i / 2).toString(36)}`,
    sessionId: `ses_${Math.floor(i / 3).toString(36)}`,
    page: p.page,
    path: p.path,
    country: loc.country,
    city: loc.city,
    countryCode: loc.countryCode,
    device: d,
    browser: b,
    os: o,
    timestamp: new Date(now - offset).toISOString()
  });
}

fs.writeFileSync(analyticsPath, JSON.stringify(initialAnalytics, null, 2));
console.log('Successfully initialized data/analytics.json with rich baseline telemetry');
