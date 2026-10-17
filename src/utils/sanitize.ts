/**
 * Universal text and HTML sanitizer for news feeds and article previews.
 * Strips raw HTML tags (<...>), entity encodings (&lt;...&gt;), unescapes entities,
 * and removes RSS wire markup (e.g. Google News anchor tags and font color tags).
 */
export function sanitizeHtmlText(input: unknown): string {
  if (typeof input !== 'string') {
    return input ? String(input) : '';
  }

  let text = input.trim();
  if (!text) return '';

  // 1. Unescape CDATA blocks
  text = text.replace(/<!\[CDATA\[(.*?)\]\]>/gis, '$1');

  // 2. Decode double and single entity encodings
  for (let i = 0; i < 2; i++) {
    text = text
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&apos;/gi, "'")
      .replace(/&nbsp;/gi, ' ')
      .replace(/\u00a0/g, ' ');
  }

  // 3. Remove all HTML tags (such as <a href="...">...</a>, <font color="...">...</font>)
  text = text.replace(/<[^>]*>/g, ' ');

  // 4. Clean up any leftover wire tags or repeated spaces
  text = text.replace(/\s+/g, ' ').trim();

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
