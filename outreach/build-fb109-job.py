#!/usr/bin/env python3
"""Build pass-109 Facebook engagement job (2026-09-24, 2-day sprint: 75 likes + up to 20 comments).
Discovery from fb109-candidates.json. Likes: fresh home-feed + local group posts
(like-liberal). Comments: ONLY business-Page-authored trade posts vetted via
facebook-cli post read (owner_name is the Page) and drafted post-specific copy.
Never-re-engage filtering is the guard's job at dispatch; quality/drop patterns
are filtered here. Writes /tmp/fb-job-<ts>-provisional.json for a dry-run guard
filter BEFORE finalization (pass-108 lesson: draft comments only against posts
fresh in the eligible pool)."""
import json, re, os
from datetime import datetime

OUT = os.path.expanduser("~/workspace/outreach")
cands = json.load(open(os.path.join(OUT, "fb109-candidates.json")))

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
# Dariz All Around Cleaning LLC: facebook-cli post read confirmed
# owner_name="Dariz All Around Cleaning LLC" (business Page, owner_id 100087335528718),
# created 2026-09-23 22:20 MDT, cleaning-services promo with a 7-service lineup graphic.
comments = [
    {"type": "comment",
     "url": "https://facebook.com/groups/1034795403236979/permalink/28326576800298804/",
     "page": "Dariz All Around Cleaning LLC (comment)",
     "text": "Post-construction through interior window cleaning is a serious lineup. Carpet care in the mix seals it."},
    # like+comment pair on the same post is the standard engagement pattern
    {"type": "like",
     "url": "https://facebook.com/groups/1034795403236979/permalink/28326576800298804/",
     "page": "Dariz All Around Cleaning LLC (post)"},
]
for cm in comments:
    if cm['type'] == 'comment':
        assert len(cm['text'].split()) < 20, cm['text']
        assert '\u2014' not in cm['text']
        seen_page.add(cm['page'])
# drop the paired like if like cap is full (it is not: likes built to <=74)
while len(likes) > 74:
    likes.pop()

job = {"actions": likes + comments, "minDelaySec": 60, "maxDelaySec": 120}
ts = datetime.now().strftime("%Y%m%d-%H%M%S")
path = f"/tmp/fb-job-{ts}-provisional.json"
json.dump(job, open(path, "w"), indent=1)
n_c = sum(1 for a in job['actions'] if a['type'] == 'comment')
n_l = sum(1 for a in job['actions'] if a['type'] == 'like')
print(f"wrote {path}: {n_l} likes + {n_c} comments")
