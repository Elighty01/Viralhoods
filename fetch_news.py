"""Viralhoods news bot.
Reads public RSS feeds, writes a short summary in its own words (Gemini or Claude, if a key is set),
and always keeps the source name and a link to the original story."""
import os, re, json, time, html, hashlib, datetime as dt, urllib.request, urllib.error
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
GKEY = os.environ.get("GEMINI_API_KEY")  # Gemini is used first if this is set
GMODEL = os.environ.get("GEMINI_MODEL") or "gemini-3.8-flash"
KEY = os.environ.get("ANTHROPIC_API_KEY")  # Claude is used if there is no Gemini key
AI_OK = True
feedparser.USER_AGENT = "ViralhoodsBot/1.0"

def clean(t):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", t or ""))).strip()

def ask(prompt):
    """Send one prompt to Gemini or Claude. Returns the answer text, or '' if it fails."""
    global AI_OK
    if GKEY:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{GMODEL}:generateContent"
        body, head = {"contents": [{"parts": [{"text": prompt}]}]}, {"x-goog-api-key": GKEY}
        pick = lambda r: "".join(p.get("text", "") for p in r["candidates"][0]["content"]["parts"])
    else:
        url = "https://api.anthropic.com/v1/messages"
        body = {"model": "claude-haiku-5-5", "max_tokens": 250,
                "messages": [{"role": "user", "content": prompt}]}
        head = {"x-api-key": KEY, "anthropic-version": "2023-06-01"}
        pick = lambda r: r["content"][0]["text"]
    head["content-type"] = "application/json"
    for attempt in (1, 2):
        try:
            req = urllib.request.Request(url, json.dumps(body).encode(), head)
            data = json.load(urllib.request.urlopen(req, timeout=60))
        except urllib.error.HTTPError as e:
            print("AI error", e.code, e.read()[:200])
            if e.code == 429 and attempt == 1:
                time.sleep(30)  # per-minute limit: wait, then try once more
                continue
            break
        except Exception as e:
            print("AI error", e)
            break
        if GKEY:
            time.sleep(6)  # stay under the free-tier per-minute limit
        try:
            return pick(data).strip()
        except Exception:
            print("AI gave no text for one story")  # for example, blocked by a safety filter
            return ""
    AI_OK = False  # give up for this run; the rest use short excerpts
    return ""

def rewrite(title, text):
    """Return (headline, summary). Uses an AI model when a key exists, else a short excerpt."""
    if AI_OK and (GKEY or KEY):
        prompt = ("Rewrite this news item in your own words, in plain English. "
                  "Line 1: a new headline of at most 12 words. Line 2: a summary of 2 sentences. "
                  "Use only the facts given. Do not copy phrases.\n\n"
                  f"Title: {title}\nText: {text}")
        out = ask(prompt).split("\n", 1)
        if len(out) == 2 and out[1].strip():
            return out[0].strip(' #*"'), out[1].strip()
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
