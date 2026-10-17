/**
 * Universal text and HTML sanitizer for news feeds and article previews.
 * Strips raw HTML tags (<...>), decodes named and numeric entities, normalizes whitespace,
 * and standardizes Unicode dash variants before they are displayed in the app.
 */

export function decodeHtmlEntities(text: string | undefined | null): string {
  if (!text) return '';

  const namedEntities: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
    mdash: '—',
    ndash: '–',
  };

  let decoded = text;

  decoded = decoded.replace(/&([a-zA-Z]+);/g, (match, entityName: string) => {
    return namedEntities[entityName] ?? match;
  });

  decoded = decoded.replace(/&#x([0-9A-Fa-f]+);/g, (_match, hexValue: string) => {
    const parsed = Number.parseInt(hexValue, 16);
    return Number.isNaN(parsed) ? '' : String.fromCodePoint(parsed);
  });

  decoded = decoded.replace(/&#(\d+);/g, (_match, decimalValue: string) => {
    const parsed = Number.parseInt(decimalValue, 10);
    return Number.isNaN(parsed) ? '' : String.fromCodePoint(parsed);
  });

  return decoded;
}

export function normalizeDashes(text: string | undefined | null): string {
  if (!text) return '';

  return text
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, '-')
    .replace(/\s*-\s*/g, ' - ')
    .replace(/-{2,}/g, '-')
    .trim();
}

export function cleanHtml(input?: string | null): string {
  if (!input) return '';

  let text = input.trim();
  if (!text) return '';

  text = text.replace(/<!\[CDATA\[(.*?)\]\]>/gis, '$1');
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ');
  text = text.replace(/<[^>]+>/g, ' ');

  text = decodeHtmlEntities(text);
  text = decodeHtmlEntities(text);
  text = text.replace(/&nbsp;/gi, ' ').replace(/\u00a0/g, ' ').replace(/\u200b/g, '');
  text = text.replace(/\s+/g, ' ').trim();

  return normalizeDashes(text);
}

export function sanitizeHtmlText(input: unknown): string {
  if (typeof input !== 'string') {
    return input ? String(input) : '';
  }

  return cleanHtml(input);
}

export function sanitizeNewsItem<T extends {
  title?: string;
  originalTitle?: string;
  summary?: string;
  content?: string[];
  keyTakeaways?: string[];
  whyItMatters?: string;
  whatNext?: string;
}>(item: T): T {
  return {
    ...item,
    title: item.title ? sanitizeHtmlText(item.title) : item.title,
    originalTitle: item.originalTitle ? sanitizeHtmlText(item.originalTitle) : item.originalTitle,
    summary: item.summary ? sanitizeHtmlText(item.summary) : item.summary,
    content: Array.isArray(item.content)
      ? item.content.map((entry) => sanitizeHtmlText(entry))
      : item.content,
    keyTakeaways: Array.isArray(item.keyTakeaways)
      ? item.keyTakeaways.map((entry) => sanitizeHtmlText(entry))
      : item.keyTakeaways,
    whyItMatters: item.whyItMatters ? sanitizeHtmlText(item.whyItMatters) : item.whyItMatters,
    whatNext: item.whatNext ? sanitizeHtmlText(item.whatNext) : item.whatNext,
  };
}
