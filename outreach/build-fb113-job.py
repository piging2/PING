#!/usr/bin/env python3
"""Build pass-113 Facebook engagement job (2026-09-24, 2-day sprint: 75 likes + up to 20 comments).
Discovery from fb113-candidates.json. Likes: fresh home-feed + local group posts
(like-liberal). Comments: ONLY vetted business-Page-authored trade posts.
Pre-filtering (pass-110/111 lessons): consult the guard's own parse_facebook
engaged history (post IDs, page names, blocked names) PLUS today's open
dispatch manifests in hidden_files/engagement-passes/ BEFORE filling the
75-like cap. The guard's filter at dispatch remains the final gate.
Writes /tmp/fb-job-<ts>-provisional.json for a dry-run guard filter."""
import json, re, os
from datetime import datetime
import sys
TARGET = int(sys.argv[1]) if len(sys.argv) > 1 else 75

OUT = os.path.expanduser("~/workspace/outreach")
cands = json.load(open(os.path.join(OUT, "fb113-candidates.json")))

import importlib.util
_spec = importlib.util.spec_from_file_location("eg", os.path.join(OUT, "engagement-guard.py"))
_eg = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(_eg)

_engaged = _eg.parse_facebook(open(os.path.join(OUT, "facebook-engagement.md")).read())
_engaged_posts = set(_engaged["post_ids"])
_engaged_names = set(_engaged["names"])
_blocked_names = set(_engaged["blocked_names"])
_page_slugs = set(_engaged["page_slugs"])
_today_open = _eg.open_manifests("facebook")  # today's executed: post ids + norm names

def page_name(c):
    src = c['source']
    if src.startswith('feed'):
        base = (c.get('author') or 'home feed').strip() or 'home feed'
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
    if pids & _today_open:
        return "today-open-manifest"
    pn = page_name(c)
    norm = _eg.norm_fb_name(pn)
    if norm in _engaged_names:
        return "engaged-name"
    if norm in _blocked_names:
        return "blocked-name"
    if norm in _today_open:
        return "today-open-name"
    return None

DROP_RE = re.compile(
    r"(yard sale|moving sale|for sale|\u20b1|carabao|frog grass|bagwani|lalamove|davao|"
    r"stop scrolling|moment of truth|troublemaker|weirdest thing|let.s welcome|welcome.*new members|"
    r"say no to data centers|open house|3146 1/2 w mandarin|ISO contractor|ISO\b.{0,20}contractor|"
    r"recommendations on who i could get|looking for recommendations)",
    re.IGNORECASE)

NEVER_REENGAGE_URL_HINTS = re.compile(r"\babbotts\b", re.IGNORECASE)
NEVER_REENGAGE_POST_IDS = {"28581069001533009", "1525848409560056",  # Western Colorado Chimney (guard explicit block list, pass-108)
                            "4082024048599699"}  # Abbotts Cleanup & Restoration water-loss post (page handled pass 39, never-re-engage)

def ok_like(c):
    u = c['url']
    if '/reel/' in u:
        return False
    if '?sale_post_id=' in u:
        return False
    t = (c.get('text') or '')
    if DROP_RE.search(t):
        return False
    if NEVER_REENGAGE_URL_HINTS.search(t):
        return False
    if any(pid in u for pid in NEVER_REENGAGE_POST_IDS):
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

# 1) home/friends feed first (like-liberal: just like the feed)
for c in fresh:
    if len(likes) >= TARGET:
        break
    if c['source'].startswith('feed') and ok_like(c):
        try_add(c)
# 2) trade-keyword hits (local trade content)
for c in fresh:
    if len(likes) >= TARGET:
        break
    if c.get('trade_hit') and not c['source'].startswith('feed') and ok_like(c):
        try_add(c)
# 3) fill with fresh local group posts (created >= 2026-09-22), newest first
rest = [c for c in fresh if not c['source'].startswith('feed') and not c.get('trade_hit') and ok_like(c)]
rest.sort(key=lambda c: c.get('created') or '', reverse=True)
for c in rest:
    if len(likes) >= TARGET:
        break
    if (c.get('created') or '') >= '2026-09-22':
        try_add(c)
# 4) if still short, take older group posts
if len(likes) < 75:
    for c in rest:
        if len(likes) >= TARGET:
            break
        try_add(c)

# COMMENTS: none. Comment vetting this pass (2026-09-24 ~11:40 MDT):
# - Abbotts Cleanup & Restoration (CO BizNet 4082024048599699, water-loss post):
#   owner IS a business Page (100063958151329), BUT page handled in pass 39 ->
#   NEVER-RE-ENGAGE covers ANY action. REJECTED.
# - Legacy Home Services fall post (Roofing B 4990798437800325): owner Andres
#   Perez (100024172899509, personal profile) -> REJECTED (business Pages only).
# - AJK pest management (pesthomes 28790952867209090): owner Kadz Kendato
#   (100000611380717, personal profile) -> REJECTED (business Pages only).
# - Coastal Clean & Concierge (AIRBNB CLEANING 1759567355297314): owner Maria
#   Clark (730384256, personal profile) -> REJECTED (business Pages only).
# - Sanchely Services LLC (CO BizNet 4081931055275665): personal profile
#   (Edgar Eduardo Sanchez Bustos) -> REJECTED (prior passes' vetting).
# - Signature Stone (CO BizNet 4081802685288502): personal profile
#   (Litto Jesus Maestas) -> REJECTED (prior passes' vetting).
# - Western Colorado Chimney posts: page on guard's explicit block list
#   (pass-108) -> REJECTED.
# Comment pool = 0 (only-the-best gate outranks sprint volume), like-only pass.
comments = []

job = {"actions": likes + comments, "minDelaySec": 60, "maxDelaySec": 120}
ts = datetime.now().strftime("%Y%m%d-%H%M%S")
path = f"/tmp/fb-job-{ts}-provisional.json"
json.dump(job, open(path, "w"), indent=1)
n_c = sum(1 for a in job['actions'] if a['type'] == 'comment')
n_l = sum(1 for a in job['actions'] if a['type'] == 'like')
print(f"wrote {path}: {n_l} likes + {n_c} comments")
