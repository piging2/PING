#!/usr/bin/env python3
"""Canonical Facebook engagement job builder (consolidated 2026-09-28).

Replaces the per-pass build-fbNNN-job.py scripts (now thin shims). One
implementation, one set of tier/qualifier regexes.

Usage: build-fb-job.py <pass-number> [target-likes]
  Reads  fb<pass>-candidates.json (written by fb<pass>-discover.py).
  Writes /tmp/fb-job-<ts>-provisional.json (likes) and
         fb<pass>-comment-vet.json (comment candidates for Page vetting).

Discovery: candidates file. Eligibility per standing body: local business
promo/showcase posts in local groups + local business Page posts + friend
posts. Comments appended after Page-author vetting (separate step).

Tier order for likes:
  1) trade-keyword hits from local groups (core pool)
  2) corridor-group business promo/showcase posts
  3) other-group promo posts (locality pre-filtered)
  4) feed posts (trade hit required)

Drop qualifiers (applied in ok_like):
  DROP_RE            -- non-promo content classes (marketplace/ISO, jobs,
                      lost/found pets, civic/religious/political, etc.)
  FEED_DROP_AUTHOR   -- national/viral feed authors, never local business
  GEO_DROP_RE        -- out-of-corridor city signals
  CURATED_DROP_RE    -- patterns mined from passes 129-139 manual curation:
                      provisional picks the curator dropped (2026-09-28).
                      These are the known-bad classes the regex tiers kept
                      admitting; the qualifier kills them without the
                      per-pass manual patch ritual.
"""
import json, re, os, glob, sys
from datetime import datetime

if len(sys.argv) < 2 or not sys.argv[1].isdigit():
    print("usage: build-fb-job.py <pass-number> [target-likes]", file=sys.stderr)
    sys.exit(2)
PASS = sys.argv[1]
TARGET_LIKES = int(sys.argv[2]) if len(sys.argv) > 2 else 75

OUT = os.path.expanduser("~/workspace/outreach")
CANDIDATES = os.path.join(OUT, f"fb{PASS}-candidates.json")
if not os.path.exists(CANDIDATES):
    print(f"build-fb-job: candidates file missing: {CANDIDATES}", file=sys.stderr)
    sys.exit(2)
cands = json.load(open(CANDIDATES))

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

# pass-129 fix (standing): terminal-aware full-ledger exclusion via the guard helper.
# The old date-scoped scan ('"2026-09-25') missed every prior day's intents,
# and recent pass-log sections record no per-action URLs, so 12 already-
# engaged posts slipped into the pass-129 provisional job. The guard now
# merges ledger post IDs itself, but the builder pre-filter uses the same
# helper so the job is built clean at the right size.
_ledger_engaged = _eg._fb_ledger_engaged_post_ids()
print(f"ledger exclusion: {len(_ledger_engaged)} engaged post ids", file=sys.stderr)

# pass-112 lesson: explicit never-reengage business, belt & suspenders over guard.
# pass-140 (2026-09-28): Western Colorado Chimney is now also posting from
# Page ID 61565264274777 ("Western Colorado Chimney" owner name on pellet-stove
# ad posts, Ridgway + Redlands). NOTE: the builder's post-ID check only sees
# group/post IDs from URLs, not owner IDs, and page_name doesn't carry the
# owner name, so this business can still slip through on text-only matching.
# Pellet-stove/chimney-sweep posts MUST have their owner name verified
# (facebook-cli post read --url) before inclusion in any curated job.
#
# 2026-10-01 P0: the blocked-business list and the corridor table now live in
# ~/workspace/outreach/eligibility-data/ (the engagement eligibility
# authority's single source of truth). The builder reads the same data
# instead of maintaining its own copies. The guard remains the decision
# authority; this pre-filter just keeps the provisional job clean at the
# right size.
try:
    _elig = _eg.load_eligibility_data()
except RuntimeError as e:
    print(f"build-fb-job: eligibility data unreadable: {e}", file=sys.stderr)
    sys.exit(3)

_BLOCKED_POST_IDS = set()
_BLOCKED_PAGE_IDS = set()
_BLOCKED_NAMES = []  # (norm_name, reason, canonical)
for _b in _elig["blocked-businesses.json"]["businesses"]:
    _BLOCKED_POST_IDS |= set(_b.get("post_ids", []))
    _BLOCKED_PAGE_IDS |= set(_b.get("page_ids", []))
    for _n in [_b["canonical"]] + _b.get("variants", []):
        _BLOCKED_NAMES.append((_eg._norm_text(_n), "blocked-business-" +
                               re.sub(r"[^a-z0-9]+", "-", _b["canonical"]).strip("-"),
                               _b["canonical"]))

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
    bare = {p.split(":", 1)[1] if ":" in p else p for p in pids}
    if bare & _BLOCKED_POST_IDS:
        return "blocked-business-post-id"
    text = "%s %s" % (page_name(c), c.get('text') or '')
    mention_ids = {m.group(1) for m in _eg.FB_MENTION_RE.finditer(text)}
    if mention_ids & _BLOCKED_PAGE_IDS:
        return "blocked-business-page-id"
    norm = _eg.norm_fb_name(page_name(c))
    for name, reason, canon in _BLOCKED_NAMES:
        if name and name in _eg._norm_text(text):
            return reason
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

# out-of-area city signals. 2026-10-01 P0: single source of truth is
# eligibility-data/corridor.json (cities_out); the builder no longer keeps
# its own city list.
GEO_DROP_RE = re.compile(
    r"\b(%s)\b" % "|".join(re.escape(c) for c in
                           _elig["corridor.json"].get("cities_out", [])),
    re.IGNORECASE)

# CURATED_DROP_RE: evidence-trained 2026-09-28 from the provisional-vs-curated
# diff across passes 129-139 (fb-drop-analysis.py; 246 provisional picks the
# curator dropped). Every alternative below matched drops in >=5 of those
# passes and matched ZERO of the 158 kept curated picks (false-positive
# check in the same analysis). The regex tiers above kept admitting these
# classes; this qualifier kills them at build time. When a new bad class
# recurs, add it here with its pass citations, never as a per-pass patch.
CURATED_DROP_RE = re.compile(
    r"("
    # real-estate listings (drops in p129,130,132,133,134,135; documented p129)
    r"on the market|just listed|new listing|for sale by owner|\bfsbo\b|"
    r"\brealtor\b|\brealty\b|"
    # sponsorship / donation solicitations (drops in all 9; documented p129)
    r"end-of-year giving|looking for local businesses|seeking sponsors|"
    r"sponsor (a|our|the) (team|event|season|league)|"
    # recurring out-of-corridor concert spam, reposted every pass
    # (drops in all 9; documented p129 as out-of-corridor concert near-dups)
    r"falguni pathak|dandiya queen|"
    # B2B website-design solicitation, not a local business promo
    # (drops in p132,133,134,135,136,137,138)
    r"your competitors have a website|gets you a custom \d+-page site|"
    # insurance/benefits enrollment solicitation
    # (drops in p133,134,135,136,137,138)
    r"medicare.{0,20}enrollment|annual notice of changes|"
    # wanted-to-buy / ISO ads the base DROP_RE misses
    # (drops in p133,134,135,136,137,138)
    r"looking for this|willing to sell|looking to buy|"
    # contractor lead-gen with pressure tactics
    # (drops in p134,135,136,137,138)
    r"no money down"
    r")",
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

# 2026-10-01 P0: corridor membership comes from the shared corridor table
# (eligibility-data/corridor.json), not a local set. Discovery short names
# are matched through the per-group aliases.
CORRIDOR = set()
for _g in _elig["corridor.json"]["groups"].values():
    if _g.get("corridor") == "in":
        CORRIDOR.add(_g["name"])
        CORRIDOR.update(_g.get("aliases", []))

# 2026-10-01 FB GEO EXPANSION (Nolan, autonomous): tiered geography mirroring
# the 2026-09-26 IG radius expansion. Tier definitions live in
# eligibility-data/corridor.json (single source of truth); the guard does
# not read tiers (its corridor verdict stays binary in/out/unknown), the
# builder uses them for closest-first CURATION ordering: within each content
# tier, candidates sort by geo tier ascending (never skip a closer tier that
# still yields), then recency. This is ranking only — eligibility is still
# the guard's binary corridor verdict, never-reengage, and class rules.
_TIERS = {int(k): v for k, v in
          _elig["corridor.json"].get("tiers", {}).items()}
_GROUP_TIER = {}
for _g in _elig["corridor.json"]["groups"].values():
    if _g.get("corridor") == "in":
        _t = _g.get("tier", 1)
        _GROUP_TIER[_g["name"]] = _t
        for _a in _g.get("aliases", []):
            _GROUP_TIER.setdefault(_a, _t)

def geo_tier(c):
    """Closest-first geo tier for a candidate: 1 core, 2 near slope, 3 far CO.
    Group-implied tier first, then town text signals; min wins (a GJ-group
    post mentioning 'aspen' stays tier 1). Unknown locality -> 2: never
    outranks explicit Tier-1, never sinks below explicit Tier-3."""
    gt = _GROUP_TIER.get(c.get('group') or '')
    t = ("%s %s" % (c.get('text') or '', c.get('group') or '')).lower()
    tt = None
    for tier in (1, 2, 3):
        for town in _TIERS.get(tier, []):
            if town and re.search(r"\b%s\b" % re.escape(town), t):
                tt = tier
                break
        if tt is not None:
            break
    cands = [x for x in (gt, tt) if x]
    return min(cands) if cands else 2

def _closest_first(cands):
    """Stable sort: geo tier asc, then recency desc (two-pass stable)."""
    cands.sort(key=lambda c: c.get('created') or '', reverse=True)
    cands.sort(key=geo_tier)
    return cands

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
    if CURATED_DROP_RE.search(t):
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

def build_picks(candidates, target_likes):
    """Return (likes, comment_pool). Pure logic; importable for analysis."""
    before = len(candidates)
    blocked_tally = {}
    fresh = []
    for c in candidates:
        r = candidate_blocked(c)
        if r:
            blocked_tally[r] = blocked_tally.get(r, 0) + 1
            continue
        fresh.append(c)
    print(f"pre-filter: {before} -> {len(fresh)} candidates (blocked: {blocked_tally})",
          file=sys.stderr)

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
    # 2026-10-01: closest-first within the tier (geo tier, then recency)
    trade_cands = [c for c in fresh if c.get('trade_hit') and (c['source'] or '').startswith('group') and ok_like(c)]
    _closest_first(trade_cands)
    for c in trade_cands:
        if len(likes) >= target_likes:
            break
        try_add(c)

    # 2) corridor-group business promo/showcase posts
    promo_corridor = [c for c in fresh
                      if (c['source'] or '').startswith('group')
                      and c.get('group') in CORRIDOR
                      and is_promo(c) and ok_like(c)]
    _closest_first(promo_corridor)
    for c in promo_corridor:
        if len(likes) >= target_likes:
            break
        try_add(c)

    # 3) other-group promo posts (CO BizNet etc., locality signals already filtered)
    promo_other = [c for c in fresh
                   if (c['source'] or '').startswith('group')
                   and c.get('group') not in CORRIDOR
                   and is_promo(c) and ok_like(c)]
    _closest_first(promo_other)
    for c in promo_other:
        if len(likes) >= target_likes:
            break
        try_add(c)

    # 4) feed posts (trade hit required by ok_like)
    feed_cands = [c for c in fresh
                  if (c['source'] or '').startswith('feed') and ok_like(c)]
    _closest_first(feed_cands)
    for c in feed_cands:
        if len(likes) >= target_likes:
            break
        try_add(c)

    comment_pool = (trade_cands + promo_corridor)[:25]
    return likes, comment_pool

def main():
    likes, comment_pool = build_picks(cands, TARGET_LIKES)
    job = {"actions": likes, "minDelaySec": 60, "maxDelaySec": 120}
    ts = datetime.now().strftime("%Y%m%d-%H%M%S")
    path = f"/tmp/fb-job-{ts}-provisional.json"
    json.dump(job, open(path, "w"), indent=1)
    print(f"wrote {path}: {len(likes)} likes")

    # comment candidates: strongest trade/promo picks for Page-author vetting
    vet = [{"url": c["url"], "group": c.get("group"), "text": (c.get("text") or "")[:200]} for c in comment_pool]
    vet_path = os.path.join(OUT, f"fb{PASS}-comment-vet.json")
    json.dump(vet, open(vet_path, "w"), indent=1)
    print(f"wrote {vet_path} ({len(vet)} candidates for comment vetting)")

if __name__ == "__main__":
    main()
