#!/usr/bin/env python3
"""Build pass-105 Facebook engagement job (2026-09-23, 2-day sprint: 75 likes + up to 20 comments).
Writes /tmp/fb-job-<ts>.json. Comments are the 2 vetted business-Page targets;
likes are fresh local/home-feed posts, excluding the standing drop-list."""
import json, re, os
from datetime import datetime

OUT = os.path.expanduser("~/workspace/outreach")
cands = json.load(open(os.path.join(OUT, "fb105-candidates.json")))

# pass-104 executed URLs (fresh re-engagement, exclude)
P104 = set()
res = json.load(open('/home/hatch/workspace/pig-fb/recovered/job-20260923-233527.json.result.json'))
for r in res['results']:
    P104.add(r['url'])

DROP_URL = {
    # pass-104 vetting: never-re-engage / already-engaged pages
    "https://facebook.com/groups/2376973139292229/permalink/4604391046550416/",  # AG Property Services (page engaged pass 96)
    "https://facebook.com/groups/2803047646497352/permalink/4081172135351557/",  # Abbotts (never-re-engage pass 39)
    "https://facebook.com/groups/2803047646497352/permalink/4081064778695626/",  # Abbotts (never-re-engage pass 39)
    "https://facebook.com/groups/1178801365519809/permalink/28567132462926663/",  # W. CO Chimney (commented pass 52)
    "https://facebook.com/groups/2803047646497352/permalink/4081067748695329/",  # This Is How We Move It (out of corridor)
    "https://facebook.com/groups/landscapingideas/permalink/28084998197808170/",  # Eden hiring (global group, weak)
    "https://facebook.com/groups/5456977881034408/permalink/28576347135337489/",  # pass-104 like list tail (WesternCO Msg)
    "https://facebook.com/groups/1034795403236979/permalink/28322170787406072/",  # Dumpster Rental (liked pass 104)
    "https://facebook.com/groups/2375845965922391/permalink/3496604593846517/",  # Profinish (liked pass 104)
    "https://facebook.com/groups/2375845965922391/permalink/3496357437204566/",  # Luis painting (liked pass 104)
    "https://facebook.com/groups/1504277980997243/permalink/1808595000565538/",  # Yellow handyman (commented pass 103)
    "https://facebook.com/groups/2803047646497352/permalink/4080890422046395/",  # Beam & Bristle (liked pass 104)
    "https://facebook.com/groups/1178801365519809/permalink/28562010426772200/",  # Empowered Energy (liked pass 104)
    "https://facebook.com/groups/786995948656362/permalink/2009527639736514/",  # Excel Excavating (liked pass 104)
    "https://facebook.com/groups/1178801365519809/permalink/28572328962407013/",  # Nya Wellmann (liked pass 104)
    "https://facebook.com/groups/1677940889636763/permalink/2293715518059294/",  # Phoenix Harris (liked pass 104)
    "https://facebook.com/groups/1677940889636763/permalink/2293500094747503/",  # Zach Branstetter (liked pass 104)
    "https://facebook.com/groups/2803047646497352/permalink/4080889232046514/",  # McDowell Moving (liked pass 104)
    "https://facebook.com/groups/2803047646497352/permalink/4081032762032161/",  # Falling Star HVAC (liked pass 104)
}

DROP_RE = re.compile(
    r"(yard sale|moving sale|for sale|₱|carabao|frog grass|bagwani|lalamove|davao|"
    r"stop scrolling|moment of truth|troublemaker|weirdest thing|let.s welcome|welcome.*new members|"
    r"say no to data centers|open house|3146 1/2 w mandarin|ISO contractor|ISO\b.{0,20}contractor|"
    r"recommendations on who i could get|looking for recommendations)",
    re.IGNORECASE)

def ok_like(c):
    u = c['url']
    if u in P104 or u in DROP_URL:
        return False
    if '/reel/' in u:
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
# 1) home/friends feed first (like-liberal: just like the feed)
for c in cands:
    if c['source'].startswith('feed') and ok_like(c):
        pn = page_name(c)
        if pn not in seen_page:
            seen_page.add(pn)
            likes.append({"type": "like", "url": c['url'], "page": pn})
# 2) trade-keyword hits (local trade content)
for c in cands:
    if len(likes) >= 75:
        break
    if c.get('trade_hit') and not c['source'].startswith('feed') and ok_like(c):
        pn = page_name(c)
        if pn not in seen_page:
            seen_page.add(pn)
            likes.append({"type": "like", "url": c['url'], "page": pn})
# 3) fill with fresh local group posts (created >= 2026-09-21), newest first
rest = [c for c in cands if not c['source'].startswith('feed') and not c.get('trade_hit') and ok_like(c)]
rest.sort(key=lambda c: c.get('created') or '', reverse=True)
for c in rest:
    if len(likes) >= 75:
        break
    if (c.get('created') or '') >= '2026-09-21':
        pn = page_name(c)
        if pn not in seen_page:
            seen_page.add(pn)
            likes.append({"type": "like", "url": c['url'], "page": pn})
# 4) if still short, take older group posts
if len(likes) < 75:
    for c in rest:
        if len(likes) >= 75:
            break
        pn = page_name(c)
        if pn not in seen_page:
            seen_page.add(pn)
            likes.append({"type": "like", "url": c['url'], "page": pn})

comments = [
    {"type": "comment",
     "url": "https://facebook.com/groups/1034795403236979/permalink/28324879553801862/",
     "page": "Hunter Property Services",
     "text": "Reno debris is the part nobody photographs. Owning the cleanup is owning the job."},
    {"type": "comment",
     "url": "https://facebook.com/groups/1034795403236979/permalink/28324303083859509/",
     "page": "Tracy's Flooring & Design",
     "text": "Installers who go the extra mile on commercial work are the whole business."},
]
for cm in comments:
    assert len(cm['text'].split()) < 20, cm['text']
    assert '\u2014' not in cm['text']

job = {"actions": likes[:75] + comments, "minDelaySec": 60, "maxDelaySec": 120}
ts = datetime.now().strftime("%Y%m%d-%H%M%S")
path = f"/tmp/fb-job-{ts}.json"
json.dump(job, open(path, "w"), indent=1)
print(f"wrote {path}: {len(likes[:75])} likes + {len(comments)} comments")
