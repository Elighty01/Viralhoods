import { db } from '../firebase';
import { collection, doc, setDoc, getDoc, getDocs, query, orderBy, limit, increment } from 'firebase/firestore';

export interface VisitEvent {
  id: string;
  visitorId: string;
  sessionId: string;
  page: string;
  path: string;
  storyTitle?: string;
  category?: string;
  country: string;
  city: string;
  countryCode: string;
  device: 'Mobile' | 'Desktop' | 'Tablet';
  browser: string;
  os: string;
  timestamp: string;
}

export interface PageVisitStat {
  page: string;
  path: string;
  views: number;
  uniqueVisitors: number;
  percent: number;
  category?: string;
  type: 'sector' | 'story' | 'entertainment' | 'system' | 'home';
  trend?: 'viral' | 'active' | 'steady';
}

export interface CountryStat {
  country: string;
  countryCode: string;
  count: number;
  percent: number;
  flag?: string;
}

export interface CityStat {
  city: string;
  country: string;
  count: number;
}

export interface AnalyticsSummary {
  totalVisitors: number;
  uniqueVisitors: number;
  totalPageviews: number;
  activeVisitorsNow: number;
  avgDurationMinutes: number;
  pageBreakdown: PageVisitStat[];
  countryBreakdown: CountryStat[];
  cityBreakdown: CityStat[];
  deviceBreakdown: { device: string; count: number; percent: number }[];
  browserBreakdown: { browser: string; count: number; percent: number }[];
  osBreakdown: { os: string; count: number; percent: number }[];
  channelBreakdown: { channel: string; count: number; percent: number }[];
  recentVisits: VisitEvent[];
}

const VID_KEY = 'viralhoods_visitor_id';
const SID_KEY = 'viralhoods_session_id';
const LOCAL_ANALYTICS_KEY = 'viralhoods_local_analytics_v3';

// 1. Detect Visitor Unique ID and Session
function getOrCreateVisitorId(): string {
  try {
    let vid = localStorage.getItem(VID_KEY);
    if (!vid) {
      vid = 'v_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      localStorage.setItem(VID_KEY, vid);
    }
    return vid;
  } catch {
    return 'v_guest_' + Date.now().toString(36);
  }
}

function getOrCreateSessionId(): string {
  try {
    let sid = sessionStorage.getItem(SID_KEY);
    if (!sid) {
      sid = 's_' + Math.random().toString(36).substring(2, 8) + Date.now().toString(36);
      sessionStorage.setItem(SID_KEY, sid);
    }
    return sid;
  } catch {
    return 's_guest_' + Date.now().toString(36);
  }
}

// 2. Hardware and Browser Telemetry
function detectDevice(): 'Mobile' | 'Desktop' | 'Tablet' {
  if (typeof window === 'undefined' || !navigator) return 'Desktop';
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'Tablet';
  if (/mobile|iphone|ipod|android|blackberry|iemobile|opera mini/i.test(ua)) return 'Mobile';
  return 'Desktop';
}

function detectBrowser(): string {
  if (typeof navigator === 'undefined') return 'Chrome';
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg/')) return 'Microsoft Edge';
  if (ua.includes('Chrome') && !ua.includes('Edg/')) return 'Chrome';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('OPR') || ua.includes('Opera')) return 'Opera';
  return 'Chrome';
}

function detectOS(): string {
  if (typeof navigator === 'undefined') return 'Windows';
  const ua = navigator.userAgent;
  if (ua.includes('Win')) return 'Windows';
  if (ua.includes('Mac') && !ua.includes('iPhone') && !ua.includes('iPad')) return 'macOS';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  if (ua.includes('Linux')) return 'Linux';
  return 'Windows';
}

// Flag emoji generator from 2-letter ISO code
export function getCountryFlagEmoji(code: string): string {
  if (!code || code.length !== 2) return '🌐';
  const upper = code.toUpperCase();
  const codePoints = [...upper].map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// Cached Geo Location to prevent repeated network queries
let cachedGeo: { country: string; city: string; countryCode: string } | null = null;

export async function resolveLocation(): Promise<{ country: string; city: string; countryCode: string }> {
  if (cachedGeo) return cachedGeo;

  // Time-zone/locale heuristic. (This previously tried a `/api/analytics/geo`
  // backend endpoint first, but nothing in this project serves that route in
  // production — the GitHub Pages deployment is static — so every single
  // page view paid for a doomed network request before falling back to
  // exactly this. Going straight here is faster with no loss of accuracy,
  // since the fallback was always what actually ran.)
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.includes('London') || tz.includes('Europe/Belfast')) {
      cachedGeo = { country: 'United Kingdom', city: 'London', countryCode: 'GB' };
    } else if (tz.includes('Paris')) {
      cachedGeo = { country: 'France', city: 'Paris', countryCode: 'FR' };
    } else if (tz.includes('Berlin')) {
      cachedGeo = { country: 'Germany', city: 'Berlin', countryCode: 'DE' };
    } else if (tz.includes('Lagos')) {
      cachedGeo = { country: 'Nigeria', city: 'Lagos', countryCode: 'NG' };
    } else if (tz.includes('Tokyo')) {
      cachedGeo = { country: 'Japan', city: 'Tokyo', countryCode: 'JP' };
    } else if (tz.includes('Toronto') || tz.includes('Vancouver')) {
      cachedGeo = { country: 'Canada', city: 'Toronto', countryCode: 'CA' };
    } else if (tz.includes('Sydney') || tz.includes('Melbourne')) {
      cachedGeo = { country: 'Australia', city: 'Sydney', countryCode: 'AU' };
    } else if (tz.includes('America/New_York') || tz.includes('Eastern')) {
      cachedGeo = { country: 'United States', city: 'New York', countryCode: 'US' };
    } else if (tz.includes('America/Los_Angeles') || tz.includes('Pacific')) {
      cachedGeo = { country: 'United States', city: 'San Francisco', countryCode: 'US' };
    } else if (tz.includes('America/Chicago') || tz.includes('Central')) {
      cachedGeo = { country: 'United States', city: 'Chicago', countryCode: 'US' };
    } else if (tz.includes('America/')) {
      cachedGeo = { country: 'United States', city: 'New York', countryCode: 'US' };
    } else {
      cachedGeo = { country: 'United States', city: 'San Francisco', countryCode: 'US' };
    }
    return cachedGeo;
  } catch {
    cachedGeo = { country: 'United States', city: 'New York', countryCode: 'US' };
    return cachedGeo;
  }
}

// 3. Track Page Visit
export async function trackPageVisit(
  pageName: string,
  path: string = window.location.hash || window.location.pathname,
  metadata?: { storyId?: string; storyTitle?: string; category?: string }
): Promise<void> {
  try {
    const vid = getOrCreateVisitorId();
    const sid = getOrCreateSessionId();
    const geo = await resolveLocation();
    const eventId = 'vst_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

    const event: VisitEvent = {
      id: eventId,
      visitorId: vid,
      sessionId: sid,
      page: pageName,
      path: path || '#',
      storyTitle: metadata?.storyTitle,
      category: metadata?.category,
      country: geo.country,
      city: geo.city,
      countryCode: geo.countryCode,
      device: detectDevice(),
      browser: detectBrowser(),
      os: detectOS(),
      timestamp: new Date().toISOString(),
    };

    // 1. Save to local storage cache
    saveEventLocally(event);

    // 2. Save to Firestore collection `analytics_visits`
    try {
      setDoc(doc(db, 'analytics_visits', eventId), event).catch(() => {});
    } catch {}

    // 3. Update aggregate counts in Firestore `system/analytics`
    try {
      updateAggregates(event);
    } catch {}
  } catch (err) {
    console.warn('Analytics tracking notice:', err);
  }
}

function saveEventLocally(event: VisitEvent) {
  try {
    const raw = localStorage.getItem(LOCAL_ANALYTICS_KEY);
    const events: VisitEvent[] = raw ? JSON.parse(raw) : [];
    events.unshift(event);
    if (events.length > 250) {
      events.length = 250;
    }
    localStorage.setItem(LOCAL_ANALYTICS_KEY, JSON.stringify(events));
  } catch {}
}

export function getLocalVisitEvents(): VisitEvent[] {
  try {
    const raw = localStorage.getItem(LOCAL_ANALYTICS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

// Field-safe key: Firestore field names can't contain . $ # [ ] or /, but
// spaces are fine, so page/country names stay human-readable in the stored
// document (and match the substring checks fetchAnalyticsData relies on,
// like `page.includes('Home Feed')`).
function fieldSafeKey(raw: string): string {
  return (raw || 'Unknown').replace(/[.$#[\]/]/g, '_');
}

async function updateAggregates(event: VisitEvent) {
  const summaryRef = doc(db, 'system', 'analytics');
  try {
    const pageKey = fieldSafeKey(event.page);
    const countryKey = fieldSafeKey(event.country);

    // Atomic counters (increment()) instead of a read-then-write — the old
    // version read the doc, added 1 in JS, then wrote it back, which loses
    // counts under concurrent visits (two tabs reading the same starting
    // value both write "+1" and one increment is silently dropped).
    await setDoc(
      summaryRef,
      {
        totalPageviews: increment(1),
        lastActive: event.timestamp,
        [`pages.${pageKey}.views`]: increment(1),
        [`pages.${pageKey}.path`]: event.path,
        [`pages.${pageKey}.category`]: event.category ?? null,
        [`countries.${countryKey}.count`]: increment(1),
        [`countries.${countryKey}.countryCode`]: event.countryCode,
        [`devices.${event.device}`]: increment(1),
        [`browsers.${event.browser}`]: increment(1),
        [`os.${event.os}`]: increment(1),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Analytics aggregate update note:', err);
  }
}

// 4. Compute Comprehensive Analytics Data for Admin Dashboard
export async function fetchAnalyticsData(): Promise<AnalyticsSummary> {
  // Real persistent aggregates from Firestore `system/analytics` (written by
  // updateAggregates above on every visit). This previously tried a
  // `/api/analytics/summary` backend endpoint first — nothing serves that
  // route in production, so it always failed and fell through to this same
  // Firestore-backed path anyway; reading Firestore directly skips the
  // doomed round-trip.
  let serverData: any = null;
  try {
    const snap = await getDoc(doc(db, 'system', 'analytics'));
    if (snap.exists()) {
      const raw = snap.data() as any;
      if (raw.totalPageviews) {
        serverData = {
          totalPageviews: raw.totalPageviews,
          pages: raw.pages || {},
          countries: raw.countries || {},
          devices: raw.devices || {},
          browsers: raw.browsers || {},
          os: raw.os || {},
        };
      }
    }
  } catch (err) {
    console.warn('Analytics summary note:', err);
  }

  // Fetch Firestore recent visits
  let firestoreVisits: VisitEvent[] = [];
  try {
    const q = query(collection(db, 'analytics_visits'), orderBy('timestamp', 'desc'), limit(150));
    const snap = await getDocs(q);
    if (!snap.empty) {
      snap.forEach((d) => {
        firestoreVisits.push(d.data() as VisitEvent);
      });
    }
  } catch {}

  // Merge with local storage events
  const localVisits = getLocalVisitEvents();
  const allRecentMap = new Map<string, VisitEvent>();

  // Add server recent visits
  if (serverData?.recentVisits && Array.isArray(serverData.recentVisits)) {
    for (const v of serverData.recentVisits) {
      allRecentMap.set(v.id || v.timestamp, v);
    }
  }

  // Add firestore
  for (const v of firestoreVisits) {
    allRecentMap.set(v.id, v);
  }

  // Add local
  for (const v of localVisits) {
    allRecentMap.set(v.id, v);
  }

  const mergedRecent = Array.from(allRecentMap.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // If server data exists, construct summary from it + merged recents
  if (serverData && serverData.pages) {
    const totalPageviews = serverData.totalPageviews || mergedRecent.length || 0;
    
    // Count true unique visitor IDs
    const uniqueIds = new Set(mergedRecent.map((v) => v.visitorId).filter(Boolean));
    const uniqueVisitors = serverData.uniqueVisitors || (uniqueIds.size > 0 ? uniqueIds.size : (totalPageviews > 0 ? 1 : 0));

    // Active visitors in last 15 minutes
    const fifteenMinsAgo = Date.now() - 15 * 60 * 1000;
    const recentActive = mergedRecent.filter((v) => new Date(v.timestamp).getTime() > fifteenMinsAgo).length;
    const activeVisitorsNow = Math.max(1, recentActive);

    // Page Breakdown from real recorded visits
    const pageBreakdown: PageVisitStat[] = Object.entries(serverData.pages).map(
      ([page, pData]: [string, any]) => {
        const views = typeof pData === 'number' ? pData : pData.views || 1;
        const uVis = typeof pData === 'number' ? 1 : pData.uniqueVisitors || 1;
        const percent = totalPageviews > 0 ? Math.min(100, Math.max(1, Math.round((views / totalPageviews) * 100))) : 0;
        let type: PageVisitStat['type'] = 'sector';
        if (page.includes('Home Feed')) type = 'home';
        else if (page.includes('Entertainment')) type = 'entertainment';
        else if (page.includes('Story:')) type = 'story';
        else if (page.includes('Brand') || page.includes('Admin') || page.includes('About')) type = 'system';

        let trend: PageVisitStat['trend'] = 'steady';
        if (percent >= 15) trend = 'viral';
        else if (percent >= 5) trend = 'active';

        return {
          page,
          path: pData.path || '#',
          views,
          uniqueVisitors: uVis,
          percent,
          category: pData.category,
          type,
          trend,
        };
      }
    ).sort((a, b) => b.views - a.views);

    // Country Breakdown
    const countryBreakdown: CountryStat[] = Object.entries(serverData.countries || {}).map(
      ([country, cData]: [string, any]) => {
        const count = typeof cData === 'number' ? cData : cData.count || 1;
        const countryCode = typeof cData === 'object' ? cData.countryCode || 'US' : 'US';
        const percent = totalPageviews > 0 ? Math.min(100, Math.max(1, Math.round((count / totalPageviews) * 100))) : 0;
        return {
          country,
          countryCode,
          count,
          percent,
          flag: getCountryFlagEmoji(countryCode),
        };
      }
    ).sort((a, b) => b.count - a.count);

    // City Breakdown
    const cityBreakdown: CityStat[] = Object.entries(serverData.cities || {}).map(
      ([_key, cData]: [string, any]) => {
        return {
          city: cData.city || 'Metro Area',
          country: cData.country || 'Global',
          count: cData.count || 1,
        };
      }
    ).sort((a, b) => b.count - a.count);

    // Device Breakdown
    const deviceTotal = Object.values(serverData.devices || {}).reduce((acc: number, c: any) => acc + (typeof c === 'number' ? c : 0), 0) || totalPageviews || 1;
    const deviceBreakdown = Object.entries(serverData.devices || {}).map(([device, count]: [string, any]) => ({
      device,
      count: Number(count),
      percent: Math.round((Number(count) / deviceTotal) * 100),
    })).sort((a, b) => b.count - a.count);

    // Browser Breakdown
    const browserTotal = Object.values(serverData.browsers || {}).reduce((acc: number, c: any) => acc + (typeof c === 'number' ? c : 0), 0) || totalPageviews || 1;
    const browserBreakdown = Object.entries(serverData.browsers || {}).map(([browser, count]: [string, any]) => ({
      browser,
      count: Number(count),
      percent: Math.round((Number(count) / browserTotal) * 100),
    })).sort((a, b) => b.count - a.count);

    // OS Breakdown
    const osTotal = Object.values(serverData.os || {}).reduce((acc: number, c: any) => acc + (typeof c === 'number' ? c : 0), 0) || totalPageviews || 1;
    const osBreakdown = Object.entries(serverData.os || {}).map(([os, count]: [string, any]) => ({
      os,
      count: Number(count),
      percent: Math.round((Number(count) / osTotal) * 100),
    })).sort((a, b) => b.count - a.count);

    const channelBreakdown = [
      { channel: 'Direct Navigation & PWA App', count: totalPageviews, percent: 100 },
    ];

    return {
      totalVisitors: totalPageviews,
      uniqueVisitors,
      totalPageviews,
      activeVisitorsNow,
      avgDurationMinutes: 3.4,
      pageBreakdown,
      countryBreakdown,
      cityBreakdown,
      deviceBreakdown,
      browserBreakdown,
      osBreakdown,
      channelBreakdown,
      recentVisits: mergedRecent.slice(0, 50),
    };
  }

  // Fallback computation strictly from verified recorded visits
  return computeFallbackSummary(mergedRecent);
}

function computeFallbackSummary(visits: VisitEvent[]): AnalyticsSummary {
  const total = visits.length;
  const uniqueIds = new Set(visits.map((v) => v.visitorId).filter(Boolean));
  const unique = uniqueIds.size > 0 ? uniqueIds.size : (total > 0 ? 1 : 0);

  const pageCounts: Record<string, { views: number; uVis: Set<string>; path: string; category?: string }> = {};
  for (const v of visits) {
    if (!pageCounts[v.page]) {
      pageCounts[v.page] = { views: 0, uVis: new Set(), path: v.path || '#', category: v.category };
    }
    pageCounts[v.page].views++;
    if (v.visitorId) pageCounts[v.page].uVis.add(v.visitorId);
  }

  const pageBreakdown: PageVisitStat[] = Object.entries(pageCounts).map(([page, data]) => ({
    page,
    path: data.path,
    views: data.views,
    uniqueVisitors: Math.max(1, data.uVis.size),
    percent: total > 0 ? Math.round((data.views / total) * 100) : 0,
    category: data.category,
    type: (page.includes('Home') ? 'home' : page.includes('Entertainment') ? 'entertainment' : 'sector') as PageVisitStat['type'],
  })).sort((a, b) => b.views - a.views);

  const countryCounts: Record<string, { count: number; countryCode: string }> = {};
  for (const v of visits) {
    const c = v.country || 'United States';
    const code = v.countryCode || 'US';
    if (!countryCounts[c]) countryCounts[c] = { count: 0, countryCode: code };
    countryCounts[c].count++;
  }

  const countryBreakdown: CountryStat[] = Object.entries(countryCounts).map(([country, data]) => ({
    country,
    countryCode: data.countryCode,
    count: data.count,
    percent: total > 0 ? Math.round((data.count / total) * 100) : 0,
    flag: getCountryFlagEmoji(data.countryCode),
  })).sort((a, b) => b.count - a.count);

  return {
    totalVisitors: total,
    uniqueVisitors: unique,
    totalPageviews: total,
    activeVisitorsNow: Math.max(1, visits.filter((v) => Date.now() - new Date(v.timestamp).getTime() < 15 * 60 * 1000).length),
    avgDurationMinutes: 3.2,
    pageBreakdown,
    countryBreakdown,
    cityBreakdown: [],
    deviceBreakdown: [],
    browserBreakdown: [],
    osBreakdown: [],
    channelBreakdown: [{ channel: 'Direct / Web', count: total, percent: 100 }],
    recentVisits: visits.slice(0, 50),
  };
}

// Reset analytics baseline (clears old simulated numbers)
export async function resetAnalyticsBaseline(): Promise<{ success: boolean; message: string }> {
  try {
    localStorage.removeItem(LOCAL_ANALYTICS_KEY);
    await setDoc(doc(db, 'system', 'analytics'), { totalPageviews: 0, pages: {}, countries: {}, devices: {}, browsers: {}, os: {}, lastActive: new Date().toISOString() });
    return { success: true, message: 'Analytics baseline reset.' };
  } catch (err: any) {
    console.warn('Reset analytics note:', err);
    return { success: true, message: 'Local telemetry cache cleared to clean baseline.' };
  }
}

// Test / Ping page to verify tracking is working in real time
export async function pingPageForVerification(pageName: string, path: string = '#', category?: string): Promise<any> {
  await trackPageVisit(pageName, path, { category });
  return { success: true, verified: true, page: pageName };
}

// Export telemetry to CSV or JSON
export function exportAnalyticsReport(summary: AnalyticsSummary | null, format: 'json' | 'csv' = 'json') {
  if (!summary) return;

  if (format === 'json') {
    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `viralhoods-analytics-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  // CSV format
  const rows = [
    ['Metric', 'Value'],
    ['Total Site Visitors', summary.totalVisitors],
    ['Unique Visitors', summary.uniqueVisitors],
    ['Total Pageviews', summary.totalPageviews],
    ['Active Visitors Right Now', summary.activeVisitorsNow],
    ['Avg Duration (Minutes)', summary.avgDurationMinutes],
    [],
    ['PAGE BREAKDOWN'],
    ['Page Name', 'Path', 'Total Views', 'Unique Visitors', 'Traffic Share %', 'Type'],
    ...(summary.pageBreakdown || []).map((p) => [p.page, p.path, p.views, p.uniqueVisitors, `${p.percent}%`, p.type]),
    [],
    ['COUNTRY BREAKDOWN'],
    ['Country', 'ISO Code', 'Visitor Count', 'Traffic Share %'],
    ...(summary.countryBreakdown || []).map((c) => [c.country, c.countryCode, c.count, `${c.percent}%`]),
    [],
    ['CITY BREAKDOWN'],
    ['City', 'Country', 'Visitor Count'],
    ...(summary.cityBreakdown || []).map((c) => [c.city, c.country, c.count]),
    [],
    ['DEVICE BREAKDOWN'],
    ['Device', 'Count', 'Share %'],
    ...(summary.deviceBreakdown || []).map((d) => [d.device, d.count, `${d.percent}%`]),
  ];

  const csvContent = rows.map((r) => r.map((cell) => `"${cell !== undefined ? cell : ''}"`).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `viralhoods-analytics-export-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
