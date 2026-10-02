#!/usr/bin/env python3
"""Pass 109 deep sweep: pages 3-4 of the 8 busiest groups (NEW_POSTS).
Appends fresh posts to fb109-candidates.json (dedup by URL)."""
import json, re, subprocess, sys, os

OUT = os.path.expanduser("~/workspace/outreach")
cands = json.load(open(os.path.join(OUT, "fb109-candidates.json")))
seen = {c["url"] for c in cands}

TRADE_RE = re.compile(
    r"\b(plumb(?:er|ing)|hvac|electric(?:ian|al)|roof(?:er|ing)|landscap\w*|"
    r"concrete|paint(?:er|ing)|drywall|gutter|fenc(?:e|ing)|garage\s?door|pest|"
    r"window\s?(?:clean|wash|tint)|maid|clean(?:ing|er)s?|junk|haul(?:ing|er)|"
    r"handyman|handy\s?man|remodel|tile|flooring|carpet|septic|well\s?pump|"
    r"solar|insulat\w*|siding|deck|mason\w*|chimney|tree\s?service|arborist|"
    r"appliance|locksmith|mov(?:er|ing)|excavat\w*|sprinkler|irrigation|"
    r"pressure\s?wash|power\s?wash|furnace|ac\s?(?:repair|install)|"
    r"water\s?heater|tankless|mini[\s-]?split|ductless)\b", re.IGNORECASE)

GROUPS = [
    ("2803047646497352", "CO BizNet"),
    ("1677940889636763", "GJ Message Board"),
    ("3741333852807065", "Fruita"),
    ("2375845965922391", "Montrose"),
    ("1178801365519809", "Ridgway"),
    ("1504277980997243", "Delta"),
    ("389118470962985", "Palisade"),
    ("5456977881034408", "WesternCO Msg"),
]

def run(cmd):
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if out.returncode != 0:
            return None
        return json.loads(out.stdout)
    except Exception as e:
        print(f"  cmd failed: {e}", file=sys.stderr)
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

added = 0
for gid, gname in GROUPS:
    cursor = None
    # walk to page 3: pages 1-2 were fetched in the main sweep; refetch to get cursor
    for page in (1, 2):
        cmd = ["facebook-cli", "groups", "posts", "--group-id", gid,
               "--sort-by", "NEW_POSTS", "--limit", "20"]
        if cursor:
            cmd += ["--after", cursor]
        posts, cursor = norm_posts(run(cmd))
        if not cursor:
            break
    # now fetch pages 3 and 4
    for page in (3, 4):
        if not cursor:
            break
        cmd = ["facebook-cli", "groups", "posts", "--group-id", gid,
               "--sort-by", "NEW_POSTS", "--limit", "20", "--after", cursor]
        posts, cursor = norm_posts(run(cmd))
        n = 0
        for p in posts:
            url = (p.get("url") or p.get("post_url") or "").strip()
            if not url or "?sale_post_id=" in url or url in seen:
                continue
            seen.add(url)
            text = p.get("content") or p.get("post_caption") or p.get("header_text") or ""
            cands.append({
                "source": f"group-p{page}", "group": gname, "url": url,
                "author": p.get("author_name") or p.get("username") or p.get("author") or "",
                "text": text[:400], "trade_hit": bool(TRADE_RE.search(text)),
                "created": p.get("created_at") or p.get("post_created_at") or "",
            })
            n += 1
            added += 1
        print(f"{gname} p{page}: +{n}", flush=True)

json.dump(cands, open(os.path.join(OUT, "fb109-candidates.json"), "w"), indent=1)
print(f"TOTAL now {len(cands)} candidates, deep sweep added {added}", flush=True)
