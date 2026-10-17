/**
 * Universal text and HTML sanitizer for news feeds and article previews.
 * Strips raw HTML tags (<...>), decodes named and numeric entities, normalizes whitespace
 * and Unicode dash variants, and removes RSS wire markup.
 */

function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  // Common named entities map (expand as needed)
  const named: { [k: string]: string } = {
    'amp': '&',
    'lt': '<',
    'gt': '>',
    'quot': '"',
    'apos': "'",
    'nbsp': ' ',
    'mdash': '—',
    'ndash': '–',
  };

  // Replace named & numeric entities
  text = text.replace(/&([a-zA-Z]+);/g, (m, name) => {
    return (named[name] !== undefined) ? named[name] : m;
  });

  // Hex numeric entities &#x2013;
  text = text.replace(/&#x([0-9A-Fa-f]+);/g, (_m, hex) => {
    try {
      return String.fromCharCode(parseInt(hex, 16));
    } catch {
      return '';
    }
  });

  // Decimal numeric entities &#8211;
  text = text.replace(/&#([0-9]+);/g, (_m, num) => {
    try {
      return String.fromCharCode(parseInt(num, 10));
    } catch {
      return '';
    }
  });

  return text;
}

function normalizeDashes(text: string): string {
  if (!text) return '';
  // Map a set of dash characters to hyphen-minus or keep as single hyphen with space-normalization
  text = text.replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, '-');
  // Normalize spaces around hyphens
  text = text.replace(/\s*-\s*/g, ' - ');
  // Collapse multiple hyphens
  text = text.replace(/-{2,}/g, '-');
  return text.trim();
}

export function sanitizeHtmlText(input: unknown): string {
  if (typeof input !== 'string') {
    return input ? String(input) : '';
  }

  let text = input.trim();
  if (!text) return '';

  // 1. Unescape CDATA blocks
  text = text.replace(/<!\[CDATA\[(.*?)\]\]>/gis, '$1');

  // 2. Decode entities (repeat a couple of times to handle double-encoding)
  for (let i = 0; i < 2; i++) {
    text = decodeHtmlEntities(text);
  }

  // Normalize non-breaking spaces
  text = text.replace(/&nbsp;/gi, ' ').replace(/\u00a0/g, ' ').replace(/\u200b/g, '');

  // 3. Remove all HTML tags (such as <a href="...">...</a>, <font color="...">...</font>)
  text = text.replace(/<[^>]*>/g, ' ');

  // 4. Collapse whitespace
  text = text.replace(/\s+/g, ' ').trim();

  // 5. Normalize dashes
  text = normalizeDashes(text);

  return text;
}

/**
 * Sanitizes an entire NewsItem to guarantee no raw HTML leaks into UI cards or article view.
 */
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
    title: sanitizeHtmlText(item.title),
    originalTitle: item.originalTitle ? sanitizeHtmlText(item.originalTitle) : item.originalTitle,
    summary: sanitizeHtmlText(item.summary),
    content: Array.isArray(item.content)
      ? item.content.map(sanitizeHtmlText)
      : item.content,
    keyTakeaways: Array.isArray(item.keyTakeaways)
      ? item.keyTakeaways.map(sanitizeHtmlText)
      : item.keyTakeaways,
    whyItMatters: item.whyItMatters ? sanitizeHtmlText(item.whyItMatters) : item.whyItMatters,
    whatNext: item.whatNext ? sanitizeHtmlText(item.whatNext) : item.whatNext,
  };
}