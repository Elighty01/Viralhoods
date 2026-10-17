// ... (top-of-file imports and constants remain unchanged)

function decodeHtmlEntities(text?: string): string {
  if (!text) return '';
  // Named entities common set
  const named: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
    mdash: '—',
    ndash: '–',
  };

  let s = text;

  s = s.replace(/&([a-zA-Z]+);/g, (_m, name) => {
    return named[name] ?? _m;
  });

  s = s.replace(/&#x([0-9A-Fa-f]+);/g, (_m, hex) => {
    try {
      return String.fromCharCode(parseInt(hex, 16));
    } catch {
      return '';
    }
  });

  s = s.replace(/&#([0-9]+);/g, (_m, num) => {
    try {
      return String.fromCharCode(parseInt(num, 10));
    } catch {
      return '';
    }
  });

  return s;
}

function normalizeDashes(text?: string): string {
  if (!text) return '';
  let s = text;
  s = s.replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, '-');
  s = s.replace(/\s*-\s*/g, ' - ');
  s = s.replace(/-{2,}/g, '-');
  return s.trim();
}

function cleanHtml(text?: string): string {
  if (!text) return '';
  // Unwrap CDATA
  let s = text.replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1');

  // Remove script/style blocks first
  s = s.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ');
  s = s.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ');

  // Strip tags
  s = s.replace(/<[^>]+>/g, ' ');

  // Decode entities (run twice to handle double-encoding)
  s = decodeHtmlEntities(s);
  s = decodeHtmlEntities(s);

  // Normalize spaces and NBSPs
  s = s.replace(/&nbsp;/gi, ' ').replace(/\u00a0/g, ' ').replace(/\u200b/g, '');

  // Collapse whitespace
  s = s.replace(/\s+/g, ' ').trim();

  // Normalize dashes
  s = normalizeDashes(s);

  return s;
}

// ... rest of file unchanged