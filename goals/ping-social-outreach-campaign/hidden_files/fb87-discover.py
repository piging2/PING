#!/usr/bin/env python3
"""FB engagement discovery: home feed + local groups, filter to like/comment candidates."""
import json, subprocess, re, sys

def cli(*args):
    try:
        out = subprocess.run(["facebook-cli", *args], capture_output=True, text=True, timeout=90)
        txt = out.stdout.strip()
        return json.loads(txt) if txt.startswith(("{","[")) else None
    except Exception as e:
        return {"_error": str(e)}

GROUPS = [
    "786995948656362",   # Durango
    "1677940889636763", # GJ Message Board
    "2376973139292229", # Orchard Mesa
    "2646836605529865", # Roofing B
    "2803047646497352", # CO BizNet
    "3741333852807065", # Fruita
    "1178801365519809", # Ridgway
    "1224852974550520", # Palisade Msg
    "2964258493889262", # GJ Events
    "843886667756237",  # Redlands
    "2375845965922391", # Montrose
    "hvacrtechtalk",     # HVACR Tech Talk
    "landscapingideas",  # Landscaping and Designing Ideas
    "pesthomes",         # PEST CONTROL
    "189143395673059",   # AIRBNB CLEANING SERVICES
    "freeai",            # All About AI Tools
    "saasfoundergroup",  # SaaS Founder Group
    "4098505490210812",  # SaaS Marketing Group
    "my724outdoors",     # My724Outdoors
]

SKIP_PATTERNS = [
    r'\bISO\b', r'\bin search of\b', r'\bwanted\b', r'yard sale', r'moving sale',
    r'\bhiring\b', r'now hiring', r'job (opening|fair|posting)', r'for sale\b.*\$',
    r'\breal estate\b', r'\bfor rent\b', r'\bbeds?\b.*\bbaths?\b', r'\bacres?\b.*\bfor sale\b',
    r'\bpolitic', r'\bvote\b', r'\bcampaign\b', r'\bmaga\b', r'\bdemocrat',
    r'\bgo ?fund ?me\b', r'\bfundraiser\b', r'\bdonate\b',
    r'\btarot\b', r'\bko-?fi\b', r'\bcrypto\b', r'\bkalshi\b', r'\bpeptides?\b', r'\bprimerica\b',
    r'financial literacy', r'\bservice dog\b', r'\bdata center\b',
    r'\bprayer request\b', r'\brest in peace\b', r'\bRIP\b', r'\bupdated her profile picture\b',
    r'\bupdated his profile picture\b',
]

def skip_reason(text):
    t = (text or "").strip()
    if not t:
        return "empty caption"
    for p in SKIP_PATTERNS:
        if re.search(p, t, re.I):
            return f"pattern:{p}"
    if re.match(r"(?i)^(hi |hey |hello )?(i'm|i am) (a |an |your )", t):
        return "ambiguous identity intro"
    return None

def post_url(p):
    for k in ("url","post_url","permalink","permalink_url"):
        if p.get(k): return p[k]
    return ""

def post_text(p):
    for k in ("post_caption","content","text","message","caption"):
        if p.get(k): return p[k]
    return ""

def post_author(p):
    for k in ("author_name","username","from_name","author"):
        if p.get(k): return p[k]
    return ""

def extract_posts(data):
    if data is None: return []
    if isinstance(data, dict):
        for k in ("posts","data","items","stories"):
            if k in data and isinstance(data[k], list):
                return data[k]
        return [data] if "id" in data else []
    if isinstance(data, list): return data
    return []

cands = []
def harvest(label, data):
    for p in extract_posts(data):
        if not isinstance(p, dict): continue
        url = post_url(p)
        if not url: continue
        if "/reel/" in url: continue
        if "sale_post_id" in url: continue
        text = post_text(p)
        reason = skip_reason(text)
        if reason: continue
        cands.append({"url": url, "author": post_author(p), "group": label,
                      "text": text[:140].replace("\n"," "),
                      "post_id": p.get("post_id") or p.get("id") or ""})

# home feed, 2 pages
cur = None
for page in range(2):
    args = ["feed","newsfeed","--limit","25"] + (["--after",cur] if cur else [])
    d = cli(*args) or {}
    harvest("home feed", d)
    cur = (d.get("paging") or {}).get("cursors",{}).get("after") if isinstance(d,dict) else None
    if not cur: break

d = cli("feed","friends","--limit","25") or {}
harvest("friends feed", d)

errors = []
for g in GROUPS:
    d = cli("groups","posts","--group-id",g)
    if d and d.get("_error"): errors.append(f"{g}: {d['_error']}")
    harvest(g, d)

json.dump(cands, open("/home/hatch/workspace/goals/ping-social-outreach-campaign/hidden_files/fb87-candidates-raw.json","w"), indent=1)
print(f"harvested={len(cands)}")
trade = [c for c in cands if re.search(r'\b(plumb|hvac|electric|roof|landscape|garage door|pest|tree service|concrete|paint|mason|remodel|fence|deck|gutter|siding|appliance|cleaning|junk removal|handyman)\b', c["text"], re.I)]
print(f"trade_hits={len(trade)}")
print("errors:", errors if errors else "none")
