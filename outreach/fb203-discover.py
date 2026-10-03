#!/usr/bin/env python3
"""Facebook engagement discovery for pass 203 (2026-10-03, no-scale-back ramp, caps 80+23, expanding-pool law: +15 groups tier2/tier3).
Scans newsfeed/friends feed (2 pages) + Western CO local groups (2nd pages
for the 8 busiest) + 4 local business Page timelines. Flags trade-keyword
candidates, excludes sale-post URLs, dumps candidates JSON.
LOCAL ONLY: the 8 global pool-expansion seed groups from 2026-09-21
(HVACR Tech Talk, Landscaping Ideas, PEST CONTROL, AIRBNB CLEANING, All About
AI Tools, Saas Founder Group, SaaS Marketing Group, My724Outdoors) are NOT
scanned this pass; eligibility is Mesa County corridor + near neighbors per
the standing geography rule.
Writes to ~/workspace/outreach/ (durable; /tmp is being wiped mid-run)."""
import json, re, subprocess, sys, os

OUT = os.path.expanduser("~/workspace/outreach")

TRADE_RE = re.compile(
    r"\b(plumb(?:er|ing)|hvac|electric(?:ian|al)|roof(?:er|ing)|landscap\w*|"
    r"concrete|paint(?:er|ing)|drywall|gutter|fenc(?:e|ing)|garage\s?door|pest|"
    r"window\s?(?:clean|wash|tint)|maid|clean(?:ing|er)s?|junk|haul(?:ing|er)|"
    r"handyman|handy\s?man|remodel|tile|flooring|carpet|septic|well\s?pump|"
    r"solar|insulat\w*|siding|deck|mason\w*|chimney|tree\s?service|arborist|"
    r"appliance|locksmith|mov(?:er|ing)|excavat\w*|sprinkler|irrigation|"
    r"pressure\s?wash|power\s?wash|furnace|ac\s?(?:repair|install)|"
    r"water\s?heater|tankless|mini[\s-]?split|ductless)\b",
    re.IGNORECASE)

GROUPS = [
    ("2803047646497352", "CO BizNet"),
    ("1677940889636763", "GJ Message Board"),
    ("3741333852807065", "Fruita"),
    ("2375845965922391", "Montrose"),
    ("1178801365519809", "Ridgway"),
    ("786995948656362", "Durango"),
    ("1504277980997243", "Delta"),
    ("389118470962985", "Palisade"),
    ("1224852974550520", "Palisade Msg"),
    ("2376973139292229", "Orchard Mesa"),
    ("1476564404259758", "GJ community"),
    ("2964258493889262", "GJ Events"),
    ("843886667756237", "Redlands"),
    ("5456977881034408", "WesternCO Msg"),
    ("1034795403236979", "Roofing A"),
    ("2646836605529865", "We are Cedaredge, CO"),
    ("1082777608577867", "Living In GJ"),
    ("1567209726900688", "GJ trees"),
    ("2370574193230682", "Glenwood"),
    ("171567566992739", "CO Desi"),
    ("152267118175659", "Hotchkiss"),
    ("578985622150049", "Cedaredge Message Board"),
    ("145173065573576", "Olathe Colorado"),
    ("1144407923363335", "Parachute Connected"),
    ("486334158737856", "Parachute/Battlement Mesa Social Circle"),
    ("485169098342671", "NEW CASTLE - SILT NEWS"),
    ("1697884374087328", "Rifle, Silt, New Castle - Uncensored"),
    ("3104262053226642", "Silt Community Board"),
    ("732694665673303", "Gunnison Valley Events"),
    ("140879413234689", "Aspen Business Connect"),
    ("259097801349016", "Craig Community Chat"),
    ("1389198991685111", "Meeker/Rangely/Craig/Rifle multi-town"),
    ("205716304012528", "Pagosa Springs Business Updates"),
    ("23894477376835347", "Cortez/Dolores/Mancos chat"),
    ("2585418838149472", "Vail Social"),
    ("1545744559076172", "Steamboat Springs Restaurants"),
    ("1181463741963583", "Paonia"),
]

DEEP_GROUPS = {"CO BizNet", "GJ Message Board", "Fruita", "Montrose",
               "Ridgway", "Durango", "Palisade", "WesternCO Msg"}

# local business / news Page timelines for business-Page feed coverage
PAGE_TIMELINES = [
    ("100063701014441", "Evolve Fitness"),
    ("100053209611279", "KREX5 FOX4"),
    ("100044739921733", "Tony Laubach"),
    ("100083569260679", "Joe Ruch"),
]

def run(cmd):
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if out.returncode != 0:
            return None
        return json.loads(out.stdout)
    except Exception as e:
        print(f"  cmd failed {cmd[:3]}: {e}", file=sys.stderr)
        return None

def norm_posts(resp):
    if not resp:
        return [], None
    if isinstance(resp, dict) and "posts" in resp:
        return resp["posts"], resp.get("next_cursor")
    if isinstance(resp, dict) and "data" in resp:
        cur = None
        try:
            cur = resp.get("paging", {}).get("cursors", {}).get("after")
        except Exception:
            pass
        return resp["data"], cur
    return [], None

cands = []
seen_urls = set()

def add(group, p, source):
    url = p.get("url") or p.get("post_url")
    if not url:
        return
    if "?sale_post_id=" in url:
        return
    url = url.strip()
    if url in seen_urls:
        return
    seen_urls.add(url)
    text = p.get("content") or p.get("post_caption") or p.get("header_text") or ""
    author = p.get("author_name") or p.get("username") or p.get("author") or ""
    cands.append({
        "source": source, "group": group,
        "url": url,
        "author": author,
        "text": text[:400],
        "trade_hit": bool(TRADE_RE.search(text)),
        "created": p.get("created_at") or p.get("post_created_at") or "",
    })

print("== feeds ==", flush=True)
for feed in ("newsfeed", "friends"):
    resp = run(["facebook-cli", "feed", feed, "--limit", "10"])
    posts, cursor = norm_posts(resp)
    for p in posts:
        add("home", p, "feed-" + feed)
    print(f"feed {feed}: {len(posts)} posts", flush=True)
    if cursor:
        resp2 = run(["facebook-cli", "feed", feed, "--limit", "10", "--after", cursor])
        posts2, _ = norm_posts(resp2)
        for p in posts2:
            add("home", p, "feed-" + feed + "-p2")
        print(f"feed {feed} p2: {len(posts2)} posts", flush=True)

print("== groups ==", flush=True)
for gid, gname in GROUPS:
    resp = run(["facebook-cli", "groups", "posts", "--group-id", gid,
                "--sort-by", "NEW_POSTS", "--limit", "20"])
    posts, cursor = norm_posts(resp)
    n = 0
    for p in posts:
        add(gname, p, "group")
        n += 1
    if cursor and gname in DEEP_GROUPS:
        resp2 = run(["facebook-cli", "groups", "posts", "--group-id", gid,
                     "--sort-by", "NEW_POSTS", "--limit", "20", "--after", cursor])
        posts2, _ = norm_posts(resp2)
        for p in posts2:
            add(gname, p, "group-p2")
            n += 1
    print(f"{gname}: {n} collected", flush=True)

print("== page timelines ==", flush=True)
for pid, pname in PAGE_TIMELINES:
    resp = run(["facebook-cli", "timeline", "fetch", "--profile-id", pid, "--limit", "10"])
    posts, _ = norm_posts(resp)
    for p in posts:
        add(pname, p, "page-timeline")
    print(f"{pname}: {len(posts)} collected", flush=True)

trade = [c for c in cands if c["trade_hit"]]
print(f"TOTAL {len(cands)} candidates, {len(trade)} trade-keyword hits", flush=True)
out_path = os.path.join(OUT, "fb203-candidates.json")
json.dump(cands, open(out_path, "w"), indent=1)
print("wrote", out_path, flush=True)
