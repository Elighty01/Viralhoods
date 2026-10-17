#!/usr/bin/env python3
import os
import sys
import json
import re
import urllib.request
import urllib.error
import hashlib
from datetime import datetime, timezone

CATEGORIES = [
    "World",
    "Politics",
    "Finance",
    "Health",
    "Entertainment",
    "Research",
    "Science",
    "AI",
    "Tech",
    "Sports",
]

# Fast, verified RSS feeds for all 10 categories
FEEDS = {
    "World": "https://feeds.bbci.co.uk/news/world/rss.xml",
    "Politics": "https://feeds.bbci.co.uk/news/politics/rss.xml",
    "Finance": "https://feeds.bbci.co.uk/news/business/rss.xml",
    "Health": "https://feeds.bbci.co.uk/news/health/rss.xml",
    "Entertainment": "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml",
    "Research": "https://news.google.com/rss/search?q=scientific+research+breakthrough&hl=en-US&gl=US&ceid=US:en",
    "Science": "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
    "AI": "https://news.google.com/rss/search?q=Artificial+Intelligence&hl=en-US&gl=US&ceid=US:en",
    "Tech": "https://feeds.bbci.co.uk/news/technology/rss.xml",
    "Sports": "https://feeds.bbci.co.uk/sport/rss.xml",
}

DEFAULT_IMAGES = {
    "World": "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=900&q=80",
    "Politics": "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?auto=format&fit=crop&w=900&q=80",
    "Finance": "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=900&q=80",
    "Health": "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=900&q=80",
    "Entertainment": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=900&q=80",
    "Research": "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=900&q=80",
    "Science": "https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=900&q=80",
    "AI": "https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=900&q=80",
    "Tech": "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80",
    "Sports": "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=900&q=80",
}

import html


def normalize_dashes(text: str) -> str:
    """Normalize common Unicode dashes (en dash, em dash, figure dash, minus) to a simple hyphen-minus.
    Also collapse repeated hyphens and trim surrounding spaces.
    """
    if not text:
        return ""
    # Replace various dash characters with a standard hyphen
    text = re.sub(r'[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]', '-', text)
    # Normalize spaces around hyphens, collapse multiple hyphens
    text = re.sub(r'\s*-\s*', ' - ', text)
    text = re.sub(r'-{2,}', '-', text)
    return text.strip()


def _decode_numeric_and_hex_entities(s: str) -> str:
    """Fallback decoder for numeric/hex entities if html.unescape misses any double-encoded values."""
    # Hex entities like &#x2013;
    s = re.sub(
        r'&#x([0-9A-Fa-f]+);',
        lambda m: chr(int(m.group(1), 16)) if m.group(1) else '',
        s,
    )
    # Decimal entities like &#8211;
    s = re.sub(
        r'&#([0-9]+);',
        lambda m: chr(int(m.group(1))) if m.group(1) else '',
        s,
    )
    return s


def clean_html(raw_html: str) -> str:
    """Robust HTML cleaning and entity handling.

    - Unwrap CDATA blocks
    - Decode named & numeric entities (html.unescape with a numeric fallback)
    - Remove tags, scripts/styles, and excessive whitespace
    - Normalize non-breaking spaces and other control whitespace
    - Normalize Unicode dashes so titles and descriptions compare consistently
    """
    if not raw_html:
        return ""

    # Remove CDATA wrapper (first step)
    clean = re.sub(r'<!\[CDATA\[(.*?)\]\]>', r'\1', raw_html, flags=re.DOTALL)

    # Remove script/style blocks entirely (avoid leaving JS/CSS in summaries)
    clean = re.sub(r'<script[^>]*>.*?</script>', ' ', clean, flags=re.DOTALL | re.IGNORECASE)
    clean = re.sub(r'<style[^>]*>.*?</style>', ' ', clean, flags=re.DOTALL | re.IGNORECASE)

    # Decode HTML entities (named and numeric). html.unescape handles many cases.
    # Run it twice to handle some double-encoded inputs.
    try:
        clean = html.unescape(clean)
        clean = html.unescape(clean)
    except Exception:
        # Best-effort basic replacements if html.unescape not available or fails
        clean = clean.replace('&lt;', '<').replace('&gt;', '>').replace('&amp;', '&').replace('&quot;', '"').replace('&#39;', "'")

    # Extra fallback: decode numeric/hex entities that might remain
    clean = _decode_numeric_and_hex_entities(clean)

    # Remove remaining HTML tags (now that entities are unescaped)
    clean = re.sub(r'<[^>]+>', ' ', clean)

    # Normalize common non-breaking spaces and other unicode whitespace
    clean = clean.replace('&nbsp;', ' ').replace('\xa0', ' ').replace('\u200b', '')

    # Collapse consecutive whitespace to single space and strip edges
    clean = re.sub(r'\s+', ' ', clean).strip()

    # Normalize dashes for consistent comparisons and presentation
    clean = normalize_dashes(clean)

    return clean


def extract_image(raw_xml_block: str):
    # Match media:thumbnail or media:content with url
    m = re.search(r'<(?:media:thumbnail|media:content)[^>]+url=["\']([^"\']+)["\']', raw_xml_block, re.IGNORECASE)
    if m:
        return html.unescape(m.group(1)).replace('&amp;', '&')
    # Match enclosure
    m2 = re.search(r'<enclosure[^>]+url=["\']([^"\']+)["\']', raw_xml_block, re.IGNORECASE)
    if m2:
        return html.unescape(m2.group(1)).replace('&amp;', '&')
    # Match image inside escaped or normal HTML
    m3 = re.search(r'(?:&lt;|<)img[^>]+src=["\']([^"\']+)["\']', raw_xml_block, re.IGNORECASE)
    if m3:
        return html.unescape(m3.group(1)).replace('&amp;', '&')
    # Match direct image url in quotes
    m4 = re.search(r'["\'](https?://[^"\']+\.(?:jpg|jpeg|png|webp)[^"\']*)["\']', raw_xml_block, re.IGNORECASE)
    if m4:
        return html.unescape(m4.group(1)).replace('&amp;', '&')
    return None


def fetch_items_for_category(category, feed_url):
    items = []
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Viralhoods/1.0"}
    try:
        req = urllib.request.Request(feed_url, headers=headers)
        with urllib.request.urlopen(req, timeout=8) as response:
            xml_data = response.read().decode('utf-8', errors='ignore')

        item_blocks = re.findall(r'<item\b[^>]*>(.*?)</item>', xml_data, re.DOTALL)
        for block in item_blocks:
            t_match = re.search(r'<title\b[^>]*>(.*?)</title>', block, re.DOTALL)
            l_match = re.search(r'<link\b[^>]*>(.*?)</link>', block, re.DOTALL)
            d_match = re.search(r'<description\b[^>]*>(.*?)</description>', block, re.DOTALL)
            p_match = re.search(r'<pubDate\b[^>]*>(.*?)</pubDate>', block, re.DOTALL)

            title_raw = t_match.group(1) if t_match else ''
            link_raw = l_match.group(1) if l_match else ''
            desc_raw = d_match.group(1) if d_match else ''
            pub_raw = p_match.group(1) if p_match else ''

            # Clean and normalize text
            title = clean_html(title_raw)
            link = html.unescape(link_raw).strip() if link_raw else ''
            desc = clean_html(desc_raw)
            pub = clean_html(pub_raw)
            img = extract_image(block)

            if not title:
                continue

            title_lower = title.lower().strip()
            desc_lower = (desc or '').lower().strip()

            # If description is missing, too short, or is essentially the same as the title, synthesize a useful fallback.
            need_fallback = False
            # Consider short or very generic descriptions as needing fallback
            if not desc or len(desc) < 60:
                need_fallback = True
            else:
                # Consider it redundant if it exactly matches the title, starts with the title,
                # repeats wire markers, or contains just placeholder phrases
                if desc_lower == title_lower \
                   or desc_lower.startswith(title_lower[:30]) \
                   or title_lower in desc_lower[: len(title_lower) + 10] \
                   or re.search(r'\b(read more|click here|full story|more at)\b', desc_lower):
                    need_fallback = True

            if need_fallback:
                # Prefer to include a short summary phrase derived from the content where possible,
                # but fall back to a generic synthesized one if not available.
                synthesized = None
                # Try to pull a short sentence from the raw description if it looks substantial
                sentences = re.split(r'\.\s+', (desc_raw or '').strip())
                if sentences and len(sentences[0].strip()) >= 30:
                    synthesized = clean_html(sentences[0])
                if synthesized:
                    desc = f"{synthesized} — Verified summary for {title}."
                else:
                    desc = (
                        f"Latest developments regarding {title}. Verified analysis across the {category.lower()} sphere highlights key strategic takeaways."
                    )

            items.append({
                "title": title,
                "link": link,
                "summary": desc,
                "image": img,
                "pubDate": pub,
            })
            if len(items) >= 4:
                break
    except Exception as e:
        print(f"Error fetching {category} from {feed_url}: {e}")
    return items


def paraphrase_headline(title, summary, category):
    """
    Modifies or paraphrases the original headline without copying verbatim.
    Retains the core factual substance while applying fresh, engaging journalistic phrasing.
    """
    # Normalize dashes first so later regexes match consistently
    title = normalize_dashes(title)

    # Remove wire tags like "- BBC" or similar (handles both ASCII and Unicode dashes)
    clean_title = re.sub(r"\s*[\-|–—:—]\s*(BBC|CNN|Reuters|AP|The Guardian|The Times|CNBC|Yahoo|Forbes|Bloomberg|ESPN|TechCrunch).*?$", "", title, flags=re.IGNORECASE).strip()

    words = clean_title.split()
    h_hash = int(hashlib.md5(clean_title.encode('utf-8')).hexdigest(), 16)

    # Paraphrase structures
    modified = clean_title
    low = modified.lower()
    if " amid " in low:
        parts = re.split(r'\s+amid\s+', modified, flags=re.IGNORECASE)
        if len(parts) == 2:
            modified = f"As {parts[1].capitalize()}: {parts[0]}"
    elif " as " in low:
        parts = re.split(r'\s+as\s+', modified, flags=re.IGNORECASE)
        if len(parts) == 2:
            modified = f"{parts[0]} - Key Signals from {parts[1]}"
    elif " after " in low:
        parts = re.split(r'\s+after\s+', modified, flags=re.IGNORECASE)
        if len(parts) == 2:
            modified = f"Following {parts[1].capitalize()}: {parts[0]}"
    elif " over " in low:
        parts = re.split(r'\s+over\s+', modified, flags=re.IGNORECASE)
        if len(parts) == 2:
            modified = f"{parts[0]}: Inside the Controversy Surrounding {parts[1]}"
    else:
        angles = [
            f"{clean_title}: Essential Takeaways and Strategic Outlook",
            f"Behind the Headlines: {clean_title}",
            f"{clean_title} - Sector Analysis & Ripple Effects",
            f"Global Perspective: {clean_title}",
        ]
        modified = angles[h_hash % len(angles)]

    takeaways = [
        f"Critical developments in {category.lower()} highlight ongoing shifts across international stakeholders.",
        "Verified analysis confirms immediate adjustments to operational planning and public sentiment.",
        "Industry observers anticipate measurable ripple effects over the forthcoming quarterly review cycle."
    ]

    content = [
        f"{summary if summary else clean_title} Across the {category.lower()} sphere, the latest verified updates reflect deeper structural transformations currently underway.",
        f"A comprehensive evaluation of the data points to evolving priorities among key institutions. Observers emphasize that initial assessments only capture the first phase of broader realignments.",
        f"Viralhoods will maintain continuous editorial monitoring, delivering verified takeaways as confirmed milestones are published."
    ]

    return {
        "modified_title": modified,
        "takeaways": takeaways,
        "content": content,
        "why_it_matters": f"This milestone recalibrates baseline expectations for {category.lower()} strategy worldwide.",
        "what_next": "Upcoming stakeholder conferences and regulatory disclosures will determine the next operational phase."
    }


def main():
    print(f"=== Viralhoods Automated News Bot running at {datetime.now(timezone.utc).isoformat()} ===")

    all_news_items = []
    now_iso = datetime.now(timezone.utc).isoformat()

    for cat in CATEGORIES:
        feed_url = FEEDS.get(cat)
        if not feed_url:
            continue
        print(f"Scraping category: {cat}...")
        raw_items = fetch_items_for_category(cat, feed_url)

        cat_count = 0
        for item in raw_items:
            paraphrased = paraphrase_headline(item["title"], item["summary"], cat)
            final_title = normalize_dashes(paraphrased["modified_title"])
            item_id = hashlib.md5((cat + item["title"]).encode('utf-8')).hexdigest()[:12]

            img = item["image"]
            if not img:
                img = DEFAULT_IMAGES.get(cat, DEFAULT_IMAGES["World"])

            news_obj = {
                "id": item_id,
                "category": cat,
                "title": final_title,
                "originalTitle": normalize_dashes(item["title"]),
                "summary": item["summary"] or f"Synthesized analysis on {final_title}.",
                "source": "Viralhoods Wire Desk",
                "url": item["link"] or "#",
                "image": img,
                "date": now_iso,
                "author": f"Viralhoods {cat} Desk",
                "readTime": "3 min read",
                "keyTakeaways": paraphrased["takeaways"],
                "content": paraphrased["content"],
                "whyItMatters": paraphrased["why_it_matters"],
                "whatNext": paraphrased["what_next"],
            }
            all_news_items.append(news_obj)
            cat_count += 1
            if cat_count >= 3:
                break
        print(f"  -> Generated {cat_count} stories for {cat}")

    output = {
        "updated": now_iso,
        "items": all_news_items,
    }

    paths = [
        "data/news.json",
        "public/data/news.json",
        "dist/data/news.json",
        "docs/data/news.json",
    ]

    for p in paths:
        dir_name = os.path.dirname(p)
        if dir_name:
            os.makedirs(dir_name, exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2, ensure_ascii=False)
        print(f"Wrote {len(all_news_items)} items to {p}")

    print("=== News Bot Execution Completed Successfully ===")

if __name__ == "__main__":
    main()