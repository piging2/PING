#!/usr/bin/env python3
"""Build pass-114 Facebook engagement job (2026-09-24, 2-day sprint: 75 likes + up to 20 comments).
Discovery from fb114-candidates.json (LOCAL groups only this pass).
Eligibility (standing body rules, like-liberal drift from pass-113 REVERTED):
- Likes: local trade/business promo+showcase posts in local groups, local
  business Page posts, friend posts. NOT personal resale/ISO/gig-seeking,
  NOT non-local/global pages, NOT non-friend personal-profile content.
- Comments: appended separately after per-candidate Page-author vetting
  (this builder writes likes; vetted comments are appended to the job).
Pre-filtering: guard's parse_facebook engaged history (post IDs, names,
blocked names, page slugs) PLUS today's dispatch manifests' eligible AND
executed keys (pass-113 lesson) PLUS today's intent ledger fb pass_ids.
Writes /tmp/fb-job-<ts>-provisional.json."""
import json, re, os, glob
from datetime import datetime
import sys
TARGET = int(sys.argv[1]) if len(sys.argv) > 1 else 75

OUT = os.path.expanduser("~/workspace/outreach")
cands = json.load(open(os.path.join(OUT, "fb114-candidates.json")))

import importlib.util
_spec = importlib.util.spec_from_file_location("eg", os.path.join(OUT, "engagement-guard.py"))
_eg = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(_eg)

_engaged = _eg.parse_facebook(open(os.path.join(OUT, "facebook-engagement.md")).read())
_engaged_posts = set(_engaged["post_ids"])
_engaged_names = set(_engaged["names"])
_blocked_names = set(_engaged["blocked_names"])
_page_slugs = set(_engaged["page_slugs"])

# today's dispatch manifests: eligible AND executed (pass-113 lesson)
_manifest_ids = set()
for mp in glob.glob(os.path.join(OUT, "..", "goals", "ping-social-outreach-campaign",
                                 "hidden_files", "engagement-passes",
                                 "facebook-pass-20260924-*.json")):
    try:
        m = json.load(open(mp))
    except Exception:
        continue
    for key in ("eligible", "executed"):
        for a in (m.get(key) or []):
            u = a.get("url") if isinstance(a, dict) else None
            if u:
                _manifest_ids |= set(_eg._platform_post_ids("facebook", u))

# today's intent ledger fb intents (belt and suspenders)
_ledger_urls = set()
try:
    for line in open(os.path.join(OUT, "action-intent-ledger.jsonl")):
        if '"platform": "facebook"' in line and '"2026-09-24' in line:
            d = json.loads(line)
            if d.get("url"):
                _ledger_urls |= set(_eg._platform_post_ids("facebook", d["url"]))
except Exception:
    pass

def page_name(c):
    src = c['source']
    if src.startswith('feed'):
        base = (c.get('author') or 'home feed').strip() or 'home feed'
    elif src == 'page-timeline':
        base = (c.get('group') or 'page').strip()
    else:
        base = (c.get('group') or 'group').strip()
    snippet = re.sub(r'\s+', ' ', (c.get('text') or ''))[:42].strip()
    name = f"{base}: {snippet}" if snippet else base
    return name[:90]

def candidate_blocked(c):
    u = c['url']
    pids = set(_eg._platform_post_ids("facebook", u))
    if pids & _engaged_posts:
        return "engaged-post-id"
    if pids & _manifest_ids:
        return "today-manifest"
    if pids & _ledger_urls:
        return "today-ledger"
    pn = page_name(c)
    norm = _eg.norm_fb_name(pn)
    if norm in _engaged_names:
        return "engaged-name"
    if norm in _blocked_names:
        return "blocked-name"
    return None

# content that is never engagement-eligible this pass
DROP_RE = re.compile(
    r"(yard sale|moving sale|for sale|for rent|wanted|free\b.{0,10}(couch|pupp|kitten|dog)|"
    r"ISO\b|in search of|looking for (a|an|some|someone|recommendations)|"
    r"anyone (know|recommend)|recommendations on who|who do you (use|recommend)|"
    r"let.s welcome|welcome.*new members|say no to data centers|open house|"
    r"stop scrolling|moment of truth|troublemaker|weirdest thing|"
    r"price reduced|investment opportunit|featured listing|\$\d{3},\d{3}|"
    r"hiring|now hiring|job (fair|opening)|help wanted|side (job|gig)|"
    r"side work|need (a )?(ride|babysitter)|lost (dog|cat)|found (dog|cat)|"
    r"prayer|church|bible|vote|campaign|ballot|"
    r"carabao|frog grass|bagwani|lalamove|davao|"
    r"3146 1/2 w mandarin|ISO contractor)",
    re.IGNORECASE)

# authors that signal a non-local / non-business source in feeds
FEED_DROP_AUTHOR = re.compile(
    r"(bitcoin|shipbob|bulls on wall street|wall street bets|memes?|"
    r"ladbible|unilad|9gag|buzzfeed|cnn|fox news|msnbc|nfl|nba|mlb|"
    r"cubs|packers|celtics|lakers|broncos|chiefs|espn|barstool|"
    r"american heart association|red cross|unicef)",
    re.IGNORECASE)

def ok_like(c):
    u = c['url']
    if '/reel/' in u:
        return False
    if '?sale_post_id=' in u:
        return False
    t = (c.get('text') or '')
    if DROP_RE.search(t):
        return False
    src = c.get('source') or ''
    if src.startswith('feed'):
        author = (c.get('author') or '')
        if FEED_DROP_AUTHOR.search(author):
            return False
        # feed posts must be business-identified or trade; skip personal noise
        if not c.get('trade_hit'):
            return False
    if src == 'page-timeline':
        # only Evolve Fitness (local business) is comment/like-eligible;
        # KREX is news (like ok); personal storm-chaser timelines excluded
        if 'Laubach' in (c.get('group') or '') or 'Ruch' in (c.get('group') or ''):
            return False
    return True

before = len(cands)
blocked_tally = {}
fresh = []
for c in cands:
    r = candidate_blocked(c)
    if r:
        blocked_tally[r] = blocked_tally.get(r, 0) + 1
        continue
    fresh.append(c)
print(f"pre-filter: {before} -> {len(fresh)} candidates (blocked: {blocked_tally})")

likes = []
seen_page = set()

def try_add(c):
    pn = page_name(c)
    if pn in seen_page:
        return False
    seen_page.add(pn)
    likes.append({"type": "like", "url": c['url'], "page": pn})
    return True

# 1) trade-keyword hits from local groups (core pool: business promo/showcase)
trade_cands = [c for c in fresh if c.get('trade_hit') and c['source'].startswith('group') and ok_like(c)]
trade_cands.sort(key=lambda c: c.get('created') or '', reverse=True)
for c in trade_cands:
    if len(likes) >= TARGET:
        break
    try_add(c)

# 2) home/friends feed business-identified posts (trade hit required by ok_like)
for c in fresh:
    if len(likes) >= TARGET:
        break
    if c['source'].startswith('feed') and ok_like(c):
        try_add(c)

# 3) local page-timeline business posts
for c in fresh:
    if len(likes) >= TARGET:
        break
    if c['source'] == 'page-timeline' and ok_like(c):
        try_add(c)

job = {"actions": likes, "minDelaySec": 60, "maxDelaySec": 120}
ts = datetime.now().strftime("%Y%m%d-%H%M%S")
path = f"/tmp/fb-job-{ts}-provisional.json"
json.dump(job, open(path, "w"), indent=1)
n_l = len(likes)
print(f"wrote {path}: {n_l} likes (comments appended after vetting)")
# also dump the vetted-like candidate list for the comment-vetting step
json.dump(trade_cands[:40], open(os.path.join(OUT, "fb114-comment-vet.json")), indent=1)
print(f"wrote {OUT}/fb114-comment-vet.json ({min(40, len(trade_cands))} trade candidates for comment vetting)")
