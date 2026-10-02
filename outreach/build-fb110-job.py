#!/usr/bin/env python3
"""Build pass-110 Facebook engagement job (2026-09-24, 2-day sprint: 75 likes + up to 20 comments).
Discovery from fb110-candidates.json. Likes: fresh home-feed + local group posts
(like-liberal). Comments: ONLY business-Page-authored trade posts vetted via
facebook-cli post read (owner_name is the Page) and drafted post-specific copy.
Never-re-engage filtering is the guard's job at dispatch; quality/drop patterns
are filtered here. Writes /tmp/fb-job-<ts>-provisional.json for a dry-run guard
filter BEFORE finalization (pass-108 lesson: draft comments only against posts
fresh in the eligible pool)."""
import json, re, os
from datetime import datetime

OUT = os.path.expanduser("~/workspace/outreach")
cands = json.load(open(os.path.join(OUT, "fb110-candidates.json")))

# Pre-filter against the guard's engaged history (pass-110 lesson: the builder
# must not fill its 75-like cap with posts the guard will strip). Reuse the
# guard's own parse_facebook so the filter matches enforcement exactly.
import importlib.util
_spec = importlib.util.spec_from_file_location("eg", os.path.join(OUT, "engagement-guard.py"))
_eg = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(_eg)
_engaged = _eg.parse_facebook(open(os.path.join(OUT, "facebook-engagement.md")).read())
_engaged_posts = set(_engaged["post_ids"])
def _pid(u):
    m = re.search(r"permalink/(\d+)", u) or re.search(r"/posts/pfbid([A-Za-z0-9]+)", u)
    return ("post:" + m.group(1)) if m else None
before = len(cands)
cands = [c for c in cands if (_pid(c["url"]) or "") not in _engaged_posts]
print(f"pre-filter: {before} -> {len(cands)} candidates (guard history removed)")

DROP_RE = re.compile(
    r"(yard sale|moving sale|for sale|\u20b1|carabao|frog grass|bagwani|lalamove|davao|"
    r"stop scrolling|moment of truth|troublemaker|weirdest thing|let.s welcome|welcome.*new members|"
    r"say no to data centers|open house|3146 1/2 w mandarin|ISO contractor|ISO\b.{0,20}contractor|"
    r"recommendations on who i could get|looking for recommendations)",
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
    return True

def page_name(c):
    src = c['source']
    if src.startswith('feed'):
        base = (c.get('author') or 'home feed').strip() or 'home feed'
    else:
        base = (c.get('group') or 'group').strip()
    snippet = re.sub(r'\s+', ' ', (c.get('text') or ''))[:42].strip()
    name = f"{base}: {snippet}" if snippet else base
    return name[:90]

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
for c in cands:
    if len(likes) >= 75:
        break
    if c['source'].startswith('feed') and ok_like(c):
        try_add(c)
# 2) trade-keyword hits (local trade content)
for c in cands:
    if len(likes) >= 75:
        break
    if c.get('trade_hit') and not c['source'].startswith('feed') and ok_like(c):
        try_add(c)
# 3) fill with fresh local group posts (created >= 2026-09-21), newest first
rest = [c for c in cands if not c['source'].startswith('feed') and not c.get('trade_hit') and ok_like(c)]
rest.sort(key=lambda c: c.get('created') or '', reverse=True)
for c in rest:
    if len(likes) >= 75:
        break
    if (c.get('created') or '') >= '2026-09-21':
        try_add(c)
# 4) if still short, take older group posts
if len(likes) < 75:
    for c in rest:
        if len(likes) >= 75:
            break
        try_add(c)

# COMMENTS: vetted business-Page-authored trade posts only.
# Hunter Property Services: facebook-cli post read confirmed
# owner_name="Hunter Property Services" (business Page, owner_id 61586541792299),
# created 2026-09-23 19:09 MDT, renovation-cleanup/junk post.
# Dumpster Rental: facebook-cli post read confirmed
# owner_name="Dumpster Rental" (business Page, owner_id 100063475721375),
# created 2026-09-23 13:38 MDT, fall-cleanup dumpster post.
comments = [
    {"type": "comment",
     "url": "https://facebook.com/groups/1034795403236979/permalink/28324879553801862/",
     "page": "Hunter Property Services (comment)",
     "text": "The invisible half of every renovation is the cleanup. Off-cuts and plasterboard multiply fast."},
    {"type": "like",
     "url": "https://facebook.com/groups/1034795403236979/permalink/28324879553801862/",
     "page": "Hunter Property Services (post)"},
    {"type": "comment",
     "url": "https://facebook.com/groups/1034795403236979/permalink/28322170787406072/",
     "page": "Dumpster Rental (comment)",
     "text": "One place to put it all is the whole pitch. Fall clutter does not stand a chance."},
    {"type": "like",
     "url": "https://facebook.com/groups/1034795403236979/permalink/28322170787406072/",
     "page": "Dumpster Rental (post)"},
]
for cm in comments:
    if cm['type'] == 'comment':
        assert len(cm['text'].split()) < 20, cm['text']
        assert '\u2014' not in cm['text']
    assert cm['page'] not in seen_page, cm['page']
    seen_page.add(cm['page'])
# drop trailing likes if like cap is full (leave room for the paired likes)
while len(likes) > 73:
    likes.pop()

job = {"actions": likes + comments, "minDelaySec": 60, "maxDelaySec": 120}
ts = datetime.now().strftime("%Y%m%d-%H%M%S")
path = f"/tmp/fb-job-{ts}-provisional.json"
json.dump(job, open(path, "w"), indent=1)
n_c = sum(1 for a in job['actions'] if a['type'] == 'comment')
n_l = sum(1 for a in job['actions'] if a['type'] == 'like')
print(f"wrote {path}: {n_l} likes + {n_c} comments")
