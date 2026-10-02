#!/usr/bin/env python3
"""Pass-70 job builder. Filters candidates against the engagement log,
applies content rules + manual curation, assembles the Pig job JSON."""
import json, re, os, time

WS = os.path.expanduser("~/workspace/outreach")
LOG = os.path.join(WS, "facebook-engagement.md")
CAND = os.path.join(WS, "fb70-candidates.json")

# --- handled URLs: every facebook.com URL ever in the engagement log ---
handled_urls = set()
for line in open(LOG, errors="replace"):
    for m in re.finditer(r"https?://facebook\.com/[^\s\)\],;\"']+", line):
        u = m.group(0).rstrip("/.,;")
        handled_urls.add(u)
        handled_urls.add(u + "/")
handled_ids = set()
for u in handled_urls:
    pm = re.search(r"permalink/(\d+)", u)
    if pm:
        handled_ids.add(pm.group(1))
blocked_slugs = set(re.findall(r"facebook\.com/(\d{5,})/",
                               open(LOG, errors="replace").read()))

def post_id(u):
    m = re.search(r"permalink/(\d+)", u)
    return m.group(1) if m else None

def slug_of(u):
    m = re.search(r"facebook\.com/(\d{5,})/", u)
    return m.group(1) if m else None

def bad(t):
    tx = t["text"].lower(); u = t["url"]
    if u in handled_urls or u.rstrip("/") + "/" in handled_urls:
        return "handled-url"
    pid = post_id(u)
    if pid and pid in handled_ids:
        return "handled-id"
    if t["source"].startswith("feed") and slug_of(u) in blocked_slugs:
        return "handled-slug"
    if "/reel/" in u:
        return "reel"
    if len(t["text"]) < 50:
        return "empty-content"
    if re.search(r"open house|\bb?eds\b.*\bbaths\b|for a showing|\$\d{3},\d{3}", tx) or \
       ("listing" in tx and "$" in tx):
        return "real-estate"
    if "yard sale" in tx:
        return "yard-sale"
    if re.search(r"\b(iso|looking for|in need of|need somebody|recommendations? for|anyone know)\b", tx):
        return "iso-seeking"
    if re.search(r"(hiring|\$\d+/hr|looking for a few reliable|now hiring|job opening)", tx):
        return "job-ad"
    if t["group"] == "Mesa pets":
        return "lost-pet"
    if re.search(r"is (going|interested)\.$", tx.strip()) or "was tagged" in tx:
        return "rsvp-stub"
    if "welcome our new members" in tx:
        return "admin-thread"
    if re.search(r"(gofundme|donate|fundraiser)", tx):
        return "fundraiser"
    if "silver collector" in tx:
        return "buyer-not-trade"
    return None

NEVER = ["littos", "litto's", "resurfaced colorado", "screen medic", "felix automotive",
         "garnish lone tree", "cafe india denver", "got weeds", "memphis auto spa",
         "falling star hvac", "horsefly", "wilson tech", "headlight", "flower stand",
         "palisade new construction", "1797 6429", "la plata county humane",
         "copley construction", "rock bottom junk", "bin squatch", "wingin"]

# manual drops (curated): spam, ISO, sensitive, personal, photo-only, vague
DROP_URLS = {
    "https://facebook.com/groups/1677940889636763/permalink/2289294391834740/",
    "https://facebook.com/groups/3741333852807065/permalink/4470690646538045/",
    "https://facebook.com/groups/1476564404259758/permalink/1654358453147018/",
    "https://facebook.com/groups/3741333852807065/permalink/4470819016525208/",
    "https://facebook.com/groups/3741333852807065/permalink/4471293639811079/",
    "https://facebook.com/groups/1504277980997243/permalink/1804413724316999/",
    "https://facebook.com/groups/1504277980997243/permalink/1804180414340330/",
    "https://facebook.com/groups/3741333852807065/permalink/4471139113159865/",
    "https://facebook.com/groups/1178801365519809/permalink/28504051125901464/",
    "https://facebook.com/groups/1178801365519809/permalink/28490297297276847/",
    "https://facebook.com/groups/MMBColorado/permalink/28184122171269100/",
    "https://facebook.com/groups/2803047646497352/permalink/4075322842603153/",
    "https://facebook.com/groups/2803047646497352/permalink/4075319802603457/",
    "https://facebook.com/groups/2803047646497352/permalink/4075019062633531/",
    "https://facebook.com/groups/2803047646497352/permalink/4075016755967095/",
    "https://facebook.com/groups/2803047646497352/permalink/4074995905969180/",
    "https://facebook.com/groups/2803047646497352/permalink/4074955669306537/",
    "https://facebook.com/groups/2803047646497352/permalink/4074953019306802/",
    "https://facebook.com/groups/2803047646497352/permalink/4074950879307016/",
    "https://facebook.com/groups/2803047646497352/permalink/4074948379307266/",
    "https://facebook.com/groups/2803047646497352/permalink/4074866932648744/",
    "https://facebook.com/groups/1677940889636763/permalink/2289293155168197/",
    "https://facebook.com/groups/3741333852807065/permalink/4470995466507563/",
    "https://facebook.com/groups/3741333852807065/permalink/4470961143177662/",
    "https://facebook.com/groups/3741333852807065/permalink/4470858586521251/",
    "https://facebook.com/groups/3741333852807065/permalink/4470846836522426/",
    "https://facebook.com/groups/1677940889636763/permalink/2289461278484718/",
    "https://facebook.com/groups/MMBColorado/permalink/28181004521580865/",
    "https://facebook.com/groups/MMBColorado/permalink/28181334734881177/",
    "https://facebook.com/groups/3741333852807065/permalink/4470752929865150/",
    "https://facebook.com/groups/1178801365519809/permalink/28502038226102754/",
    "https://facebook.com/groups/1476564404259758/permalink/1654435733139290/",
    "https://facebook.com/groups/786995948656362/permalink/2005586333463978/",
    "https://facebook.com/groups/786995948656362/permalink/2004727163549895/",
    "https://facebook.com/groups/786995948656362/permalink/2005498210139457/",
    "https://facebook.com/groups/786995948656362/permalink/2005470693475542/",
    "https://facebook.com/groups/786995948656362/permalink/2005115853511026/",
    "https://facebook.com/groups/1504277980997243/permalink/1804185151006523/",
    "https://facebook.com/groups/1504277980997243/permalink/1804134287678276/",
    "https://facebook.com/groups/coloradobusinessmingle/permalink/28089323614072040/",
    "https://facebook.com/groups/coloradobusinessmingle/permalink/28074536425550759/",
    "https://facebook.com/groups/108728816001912/permalink/3415750368633057/",
    "https://facebook.com/groups/2370574193230682/permalink/4478943139060433/",
    "https://facebook.com/groups/2370574193230682/permalink/4476672005954213/",
}

cands = json.load(open(CAND))
likes, skipped = [], {}
for t in cands:
    r = bad(t)
    if r:
        skipped[r] = skipped.get(r, 0) + 1
        continue
    if t["url"] in DROP_URLS or t["url"].rstrip("/") in DROP_URLS:
        skipped["manual-drop"] = skipped.get("manual-drop", 0) + 1
        continue
    if any(n in t["text"].lower() for n in NEVER):
        skipped["never-name"] = skipped.get("never-name", 0) + 1
        continue
    likes.append(t)
print("eligible:", len(likes), "skipped:", skipped)

TRADE = re.compile(r"\b(plumb(?:er|ing)|hvac|electric(?:ian|al)|roof(?:er|ing)|landscap\w*|"
    r"concrete|paint(?:er|ing)|drywall|gutter|fenc(?:e|ing)|garage\s?door|pest|window|maid|"
    r"clean(?:ing|er)s?|junk|haul(?:ing|er)|handyman|remodel|tile|flooring|carpet|septic|"
    r"solar|insulat\w*|siding|deck|mason\w*|chimney|tree\s?service|arborist|appliance|"
    r"locksmith|mov(?:er|ing)|excavat\w*|sprinkler|pressure\s?wash|furnace|water\s?heater|"
    r"detail(?:ing|er)|auto\s?spa|weed)\b", re.I)
PHONE = re.compile(r"\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4}")
PROMO = re.compile(r"(free estimate|call or text|now booking|grand opening|book your|"
    r"before and after|before & after|llc|our team|proud to|now serving|check out our|"
    r"stop by|visit us)", re.I)
LOCAL = re.compile(r"(grand valley|western slope|montrose|fruita|palisade|delta co|ridgway|"
    r"durango|glenwood|grand junction|olathe|cedaredge|colorado)", re.I)

def score(t):
    s = 0; tx = t["text"]
    if TRADE.search(tx): s += 3
    if PHONE.search(tx): s += 2
    if PROMO.search(tx): s += 1
    if LOCAL.search(tx): s += 1
    if t["source"].startswith("feed"): s += 2
    return s

likes.sort(key=score, reverse=True)

# --- comment pairs (like + comment), verified fresh this pass ---
# (Copley Construction was dropped: liked in pass 69. Thin trade pool this pass.)
comments = [
    {
        "name": "Rock bottom junk removal",
        "url": "https://facebook.com/groups/786995948656362/permalink/2005328996823045/",
        "page": "Durango group (Rock bottom junk removal promo)",
        "text": "Rock bottom prices, top shelf hauling. Clutter does not stand a chance.",
    },
    {
        "name": "Colorado Bin Squatch",
        "url": "https://facebook.com/groups/2803047646497352/permalink/4075401619261942/",
        "page": "CO BizNet (Colorado Bin Squatch bin cleaning)",
        "text": "A bin-hunting cryptid with a pressure washer. Finally, a legend worth believing in.",
    },
]

# verify comment URLs are in the candidate set and unhandled
byurl = {t["url"]: t for t in cands}
for cm in comments:
    assert cm["url"] in byurl, f"comment URL missing from candidates: {cm['url']}"
    assert cm["url"] not in handled_urls, f"comment URL already handled: {cm['url']}"
    assert len(cm["text"].split()) < 20, f"comment too long: {cm['text']}"

# --- assemble job ---
actions = []
used_pages = set()

def add_like(t, label):
    page = f"{t['group']} ({label})"
    assert page not in used_pages, f"dup page: {page}"
    used_pages.add(page)
    actions.append({"type": "like", "page": page, "url": t["url"]})

# comment pairs first
for cm in comments:
    t = byurl[cm["url"]]
    add_like(t, cm["name"] + " promo")
    actions.append({"type": "comment", "page": cm["page"] + " (comment)",
                    "url": cm["url"], "text": cm["text"]})

# No fresh home-feed slugs this pass: every feed page slug already appears in
# the engagement log (Bitcoin Magazine, Chicago Bulls, and all others handled).

# top scored likes up to 75 total likes
like_count = sum(1 for a in actions if a["type"] == "like")
for t in likes:
    if like_count >= 75:
        break
    if t["url"] in {a["url"] for a in actions}:
        continue
    label = t["text"][:45].strip()
    add_like(t, label)
    like_count += 1

job = {
    "job_id": f"fb-pass70-{time.strftime('%Y%m%d-%H%M%S')}",
    "platform": "facebook",
    "minDelaySec": 60,
    "maxDelaySec": 120,
    "actions": actions,
}
ts = time.strftime("%Y%m%d-%H%M%S")
job_path = os.path.join(WS, f"fb-job-{ts}.json")
json.dump(job, open(job_path, "w"), indent=1)
nl = sum(1 for a in actions if a["type"] == "like")
nc = sum(1 for a in actions if a["type"] == "comment")
print(f"job: {job_path}  likes={nl} comments={nc} total={len(actions)}")
# sanity: unique pages, full URLs only, no sale-post URLs
pages = [a["page"] for a in actions]
assert len(pages) == len(set(pages)), "duplicate page descriptors!"
for a in actions:
    assert a["url"].startswith("https://facebook.com/"), a["url"]
    assert "?sale_post_id=" not in a["url"], a["url"]
print("sanity checks passed")
