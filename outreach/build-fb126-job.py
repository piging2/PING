#!/usr/bin/env python3
"""Build pass-126 Facebook engagement job (2026-09-26, no-scale-back ramp, caps 75+20).
Discovery: fb126-candidates.json (536 candidates, 29 trade hits).
Eligibility per standing body: local business promo/showcase posts in local
groups + local business Page posts + friend posts. Comments appended after
Page-author vetting (separate step).
Writes /tmp/fb-job-<ts>-provisional.json (likes) and prints top comment
candidates for vetting."""
import json, re, os, glob, sys
from datetime import datetime

TARGET_LIKES = int(sys.argv[1]) if len(sys.argv) > 1 else 75

OUT = os.path.expanduser("~/workspace/outreach")
cands = json.load(open(os.path.join(OUT, "fb126-candidates.json")))

import importlib.util
_spec = importlib.util.spec_from_file_location("eg", os.path.join(OUT, "engagement-guard.py"))
_eg = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(_eg)

_engaged = _eg.parse_facebook(open(os.path.join(OUT, "facebook-engagement.md")).read())
_engaged_posts = set(_engaged["post_ids"])
_engaged_names = set(_engaged["names"])
_blocked_names = set(_engaged["blocked_names"])

_manifest_ids = set()
for mp in glob.glob(os.path.join(OUT, "..", "goals", "ping-social-outreach-campaign",
                                 "hidden_files", "engagement-passes",
                                 "facebook-pass-20260926-*.json")):
    try:
        m = json.load(open(mp))
    except Exception:
        continue
    for key in ("eligible", "executed", "actions"):
        val = m.get(key)
        if isinstance(val, list):
            for a in val:
                u = a.get("url") if isinstance(a, dict) else None
                if u:
                    _manifest_ids |= set(_eg._platform_post_ids("facebook", u))
        # int/count shape (run_pass.sh dispatch manifest): URLs covered by
        # the terminal-aware ledger exclusion below; skip safely.

# pass-126 fix: terminal-aware full-ledger exclusion via the guard helper.
# The old date-scoped scan ('"2026-09-25') missed every prior day's intents,
# and recent pass-log sections record no per-action URLs, so 12 already-
# engaged posts slipped into the pass-126 provisional job. The guard now
# merges ledger post IDs itself, but the builder pre-filter uses the same
# helper so the job is built clean at the right size.
_ledger_engaged = _eg._fb_ledger_engaged_post_ids()
print(f"ledger exclusion: {len(_ledger_engaged)} engaged post ids", file=sys.stderr)

# pass-112 lesson: explicit never-reengage business, belt & suspenders over guard
WCO_CHIMNEY_IDS = {"28581069001533009", "1525848409560056"}

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
    if pids & WCO_CHIMNEY_IDS:
        return "blocked-business-wco-chimney"
    if "western colorado chimney" in _eg.norm_fb_name(page_name(c)):
        return "blocked-business-wco-chimney-name"
    if pids & _engaged_posts:
        return "engaged-post-id"
    if pids & _manifest_ids:
        return "today-manifest"
    if pids & _ledger_engaged:
        return "ledger-engaged"
    pn = page_name(c)
    norm = _eg.norm_fb_name(pn)
    if norm in _engaged_names:
        return "engaged-name"
    if norm in _blocked_names:
        return "blocked-name"
    return None

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

FEED_DROP_AUTHOR = re.compile(
    r"(bitcoin|shipbob|bulls on wall street|wall street bets|memes?|"
    r"ladbible|unilad|9gag|buzzfeed|cnn|fox news|msnbc|nfl|nba|mlb|"
    r"cubs|packers|celtics|lakers|broncos|chiefs|espn|barstool|"
    r"american heart association|red cross|unicef)",
    re.IGNORECASE)

# out-of-area city signals (CO BizNet/Durango/Glenwood/CO Desi are statewide)
GEO_DROP_RE = re.compile(
    r"\b(colorado springs|pueblo|centennial|littleton|arvada|denver|boulder|"
    r"fort collins|aurora|greeley|longmont|loveland|castle rock|parker|"
    r"thornton|westminster|brighton|erie|lakewood)\b",
    re.IGNORECASE)

# local business promo / showcase signals (likes may go to group promo posts
# even when posted from a personal profile; comments need a business Page)
PROMO_RE = re.compile(
    r"(now open|grand opening|open (today|friday|saturday|now)|now booking|"
    r"now (taking|accepting)|book (now|today|your)|availability|"
    r"visit us|stop (in|by)|come (see|check|on out)|check out|"
    r"sale\b|% off|pre.?order|order (now|today)|delivery|menu|"
    r"food truck|farm stand|fresh produce|orchard|handmade|custom |"
    r"we (offer|specialize in|provide|do)|free (estimate|quote|consult)|"
    r"call (us|today)|dm (us|me|for)|message (us|me)|schedule|"
    r"\b(tint|detailing|salon|boutique|brewery|distillery|restaurant|"
    r"coffee|bakery|florist|barber|spa|gym|fitness|auto repair|car wash|"
    r"landscap|plumb|hvac|electric|roof|concrete|paint|drywall|gutter|"
    r"fence|garage door|pest|window clean|maid|cleaning|junk|handyman|"
    r"remodel|tile|flooring|carpet|septic|solar|insulat|siding|deck|"
    r"mason|chimney|tree service|arborist|appliance|locksmith|moving|"
    r"excavat|sprinkler|irrigation|pressure wash|power wash)\w*)",
    re.IGNORECASE)

CORRIDOR = {"Fruita", "Palisade", "Palisade Msg", "GJ Message Board",
            "GJ community", "Orchard Mesa", "Redlands", "Living In GJ",
            "WesternCO Msg", "Delta", "Montrose", "Ridgway", "GJ Events",
            "GJ trees", "Roofing A", "Roofing B"}

def ok_like(c):
    u = c['url']
    if '/reel/' in u:
        return False
    if '?sale_post_id=' in u:
        return False
    t = (c.get('text') or '')
    if not t.strip():
        return False  # empty text: cannot vet as business promo
    if DROP_RE.search(t):
        return False
    if GEO_DROP_RE.search(t):
        return False
    src = c.get('source') or ''
    if src.startswith('feed'):
        author = (c.get('author') or '')
        if FEED_DROP_AUTHOR.search(author):
            return False
        if not c.get('trade_hit'):
            return False
    return True

def is_promo(c):
    t = (c.get('text') or '')
    return bool(PROMO_RE.search(t)) or bool(c.get('trade_hit'))

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

# 1) trade-keyword hits from local groups (core pool)
trade_cands = [c for c in fresh if c.get('trade_hit') and (c['source'] or '').startswith('group') and ok_like(c)]
trade_cands.sort(key=lambda c: c.get('created') or '', reverse=True)
for c in trade_cands:
    if len(likes) >= TARGET_LIKES:
        break
    try_add(c)

# 2) corridor-group business promo/showcase posts
promo_corridor = [c for c in fresh
                  if (c['source'] or '').startswith('group')
                  and c.get('group') in CORRIDOR
                  and is_promo(c) and ok_like(c)]
promo_corridor.sort(key=lambda c: c.get('created') or '', reverse=True)
for c in promo_corridor:
    if len(likes) >= TARGET_LIKES:
        break
    try_add(c)

# 3) other-group promo posts (CO BizNet etc., locality signals already filtered)
promo_other = [c for c in fresh
               if (c['source'] or '').startswith('group')
               and c.get('group') not in CORRIDOR
               and is_promo(c) and ok_like(c)]
promo_other.sort(key=lambda c: c.get('created') or '', reverse=True)
for c in promo_other:
    if len(likes) >= TARGET_LIKES:
        break
    try_add(c)

# 4) feed posts (trade hit required by ok_like)
for c in fresh:
    if len(likes) >= TARGET_LIKES:
        break
    if (c['source'] or '').startswith('feed') and ok_like(c):
        try_add(c)

job = {"actions": likes, "minDelaySec": 60, "maxDelaySec": 120}
ts = datetime.now().strftime("%Y%m%d-%H%M%S")
path = f"/tmp/fb-job-{ts}-provisional.json"
json.dump(job, open(path, "w"), indent=1)
print(f"wrote {path}: {len(likes)} likes")

# comment candidates: strongest trade/promo picks for Page-author vetting
comment_pool = (trade_cands + promo_corridor)[:25]
vet = [{"url": c["url"], "group": c.get("group"), "text": (c.get("text") or "")[:200]} for c in comment_pool]
json.dump(vet, open(os.path.join(OUT, "fb126-comment-vet.json"), "w"), indent=1)
print(f"wrote {OUT}/fb126-comment-vet.json ({len(vet)} candidates for comment vetting)")
