"""Viralhoods news bot.
Reads public RSS feeds, writes a short summary in its own words (needs ANTHROPIC_API_KEY),
and always keeps the source name and a link to the original story."""
import os, re, json, time, html, hashlib, datetime as dt, urllib.request
import feedparser

FEEDS = {  # category: [rss feeds]. Edit this list any time.
    "World": ["https://feeds.bbci.co.uk/news/world/rss.xml"],
    "Politics": ["https://feeds.npr.org/1014/rss.xml"],
    "Finance": ["https://feeds.bbci.co.uk/news/business/rss.xml"],
    "Health": ["https://feeds.bbci.co.uk/news/health/rss.xml"],
    "Entertainment": ["https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml"],
    "Research": ["https://www.eurekalert.org/rss.xml", "https://www.sciencedaily.com/rss/all.xml"],
    "Science": ["https://feeds.bbci.co.uk/news/science_and_environment/rss.xml"],
    "AI": ["https://www.artificialintelligence-news.com/feed/"],
    "Tech": ["https://feeds.bbci.co.uk/news/technology/rss.xml"],
    "Sports": ["https://feeds.bbci.co.uk/sport/rss.xml"],
}
PER_FEED, KEEP, OUT = 4, 240, "data/news.json"
KEY = os.environ.get("ANTHROPIC_API_KEY")
feedparser.USER_AGENT = "ViralhoodsBot/1.0"

def clean(t):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", t or ""))).strip()

def rewrite(title, text):
    """Return (headline, summary). Uses Claude when a key exists, else a short excerpt."""
    if KEY:
        prompt = ("Rewrite this news item in your own words, in plain English. "
                  "Line 1: a new headline of at most 12 words. Line 2: a summary of 2 sentences. "
                  "Use only the facts given. Do not copy phrases.\n\n"
                  f"Title: {title}\nText: {text}")
        body = {"model": "claude-haiku-5-5", "max_tokens": 250,
                "messages": [{"role": "user", "content": prompt}]}
        try:
            req = urllib.request.Request(
                "https://api.anthropic.com/v1/messages", json.dumps(body).encode(),
                {"x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json"})
            out = json.load(urllib.request.urlopen(req, timeout=40))["content"][0]["text"].strip().split("\n", 1)
            if len(out) == 2 and out[1].strip():
                return out[0].strip(' #*"'), out[1].strip()
        except Exception as e:
            print("AI rewrite skipped:", e)
    short = text if len(text) <= 220 else text[:220].rsplit(" ", 1)[0] + "..."
    return title, short

def main():
    old = []
    if os.path.exists(OUT):
        old = json.load(open(OUT, encoding="utf-8")).get("items", [])
    seen = {x["id"] for x in old}
    new = []
    for cat, urls in FEEDS.items():
        for u in urls:
            feed = feedparser.parse(u)
            if not feed.entries:
                print("no entries:", u)
            for e in feed.entries[:PER_FEED]:
                link = e.get("link", "")
                id_ = hashlib.sha1(link.encode()).hexdigest()[:12]
                if not link.startswith("http") or id_ in seen:
                    continue
                seen.add(id_)
                title, summ = rewrite(clean(e.get("title")), clean(e.get("summary")))
                img = (e.get("media_thumbnail") or e.get("media_content") or [{}])[0].get("url", "")
                when = e.get("published_parsed") or time.gmtime()
                new.append({"id": id_, "category": cat, "title": title, "summary": summ,
                            "source": feed.feed.get("title", cat), "url": link,
                            "image": img if img.startswith("http") else "",
                            "date": time.strftime("%Y-%m-%dT%H:%M:%SZ", when)})
    items = sorted(new + old, key=lambda x: x["date"], reverse=True)[:KEEP]
    os.makedirs("data", exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({"updated": dt.datetime.now(dt.timezone.utc).isoformat(), "items": items},
                  f, ensure_ascii=False, indent=1)
    print(f"added {len(new)}, total {len(items)}")

if __name__ == "__main__":
    main()
