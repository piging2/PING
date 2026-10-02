#!/usr/bin/env python3
"""Pass-84 job builder. Filters fb84 candidates against the engagement log,
applies content rules + manual curation, assembles the Pig job JSON.
Comment candidates author-verified as businesses via facebook-cli post read."""
import json, re, os, time

WS = os.path.expanduser("~/workspace/outreach")
LOG = os.path.join(WS, "facebook-engagement.md")
CAND = os.path.join(WS, "fb84-candidates.json")

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

def pfbid_of(u):
    m = re.search(r"/posts/pfbid([A-Za-z0-9]+)", u)
    return m.group(1) if m else None

INTRO_RE = re.compile(
    r"^\s*(hi|hello|hey)\b[^.]{0,60}\bi'?m\b|^\s*i'?m\s+(a|an|your)\b", re.I)

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
    pf = pfbid_of(u)
    if pf and len(pf) < 40:
        return "truncated-pfbid"
    if len(t["text"]) < 50:
        return "empty-content"
    if INTRO_RE.search(t["text"]):
        return "intro-identity"
    if re.search(r"open house|\bb?eds\b.*\bbaths\b|for a showing|\$\d{3},\d{3}|just hit the market", tx) or \
       ("listing" in tx and "$" in tx):
        return "real-estate"
    if "yard sale" in tx or "moving sale" in tx:
        return "yard-sale"
    if re.search(r"\b(iso|looking for|in need of|need somebody|recommendations? for|anyone know)\b", tx):
        return "iso-seeking"
    if re.search(r"(hiring|\$\d+/hr|looking for a few reliable|now hiring|job opening|work opportunity)", tx):
        return "job-ad"
    if re.search(r"(gofundme|donate|fundraiser)", tx):
        return "fundraiser"
    if "welcome our new members" in tx:
        return "admin-thread"
    if re.search(r"is (going|interested)\.$", tx.strip()) or "was tagged" in tx:
        return "rsvp-stub"
    if re.search(r"(data.?center|jeff hurd|tv campaign|taking the fight)", tx):
        return "political"
    if re.search(r"(please take a (few )?moments|service.?dog|financial literacy|ko-?fi|tarot|peptides|primerica|crypto|bitcoin|kalshi)", tx):
        return "spam-crosspost"
    if "ca shelter" in tx or "shelter post" in tx:
        return "ca-shelter"
    if "anomaly collective" in tx:
        return "competitor-agency"
    return None

NEVER = ["littos", "litto's", "resurfaced colorado", "screen medic", "felix automotive",
         "garnish lone tree", "cafe india denver", "got weeds", "memphis auto spa",
         "falling star hvac", "horsefly", "wilson tech", "headlight", "flower stand",
         "palisade new construction", "1797 6429", "la plata county humane",
         "copley construction", "rock bottom junk", "bin squatch", "wingin",
         "abbotts", "daniel", "integrity painting", "clogzilla", "profinish",
         "mightydoor", "garage door up and over", "black belt home services",
         "ec homes", "bugdaddys", "bookcliff media", "grand valley pet grooming",
         "sage bloom", "precedence music", "legacy furniture", "the 970",
         "cedaredge foodtown", "delta egyptian", "pioneer town museum",
         "richard nelson", "colorado bin squatch", "ag property services",
         "wedding house", "paradise theatre", "moose's dough house", "doughbra",
         "pioneer excavating", "alongside bookkeeping", "yellow ink bookkeeping",
         "see jane ranch", "petit solutions", "synergy security", "ambers house cleaning",
         "tall tail llama ranch", "smith family orchard", "sunflower theatre",
         "two sisters homeopathy", "peach street distillers"]

# manual drops: pass-84 curated
DROP_URLS = {
    # Delta empanadas comment target: "no article found" two passes running (pass 76)
    "https://facebook.com/groups/1504277980997243/permalink/180232634785907/",
    # Ambers house cleaning llc: shower post commented in a prior pass
    "https://facebook.com/groups/5456977881034408/permalink/28529260853379451/",
    "https://facebook.com/groups/5456977881034408/permalink/28529246023380934/",
    # Abbotts Cleanup & Restoration: page handled pass 39, never-re-engage
    "https://facebook.com/groups/2803047646497352/permalink/4074705255998245/",
    # Daniel/Integrity Painting: never-re-engage per pass 48 precedent
    "https://facebook.com/groups/1224852974550520/permalink/2872578693111265/",
    # GJ Msg shingles/swamp-cooler post: handled (guard blocked pass 77)
    "https://facebook.com/groups/1677940889636763/permalink/2290241861739993/",
    # Palisade Msg "Painting parties!": handled (guard blocked pass 77)
    "https://facebook.com/groups/1224852974550520/permalink/2873067523062382/",
    # Cole Bailey pasture posts: ISO-seeking + guard fuzzy-blocked
    "https://facebook.com/groups/3741333852807065/permalink/4472057749734668/",
    "https://facebook.com/groups/1178801365519809/permalink/28520382427601667/",
    # Clogzilla: pass-79 quarantine
    "https://facebook.com/groups/1034795403236979/permalink/2827679746861049/",
    # MightyDoorMechanics: commented pass 78
    "https://facebook.com/groups/1034795403236979/permalink/28276769011946250/",
    # poker flyers: refuse-filtered pass 82
    "https://facebook.com/groups/1034795403236979/permalink/28277621108527707/",
    # Profinish Drywall & Paint "Builders, contractors..." cross-posts: pass-79 quarantine
    "https://facebook.com/groups/2375845965922391/permalink/3492992100874433/",
    "https://facebook.com/groups/1178801365519809/permalink/2852901597340497/",
    "https://facebook.com/groups/1504277980997243/permalink/1805930420831996/",
    "https://facebook.com/groups/2646836605529865/permalink/4985688058311363/",
    # Richard Nelson flooring (GJ Msg cross-post): same business as pass-83 comment
    "https://facebook.com/groups/1677940889636763/permalink/2291272104970334/",
    # EC Homes warped-siding (Ridgway): same business as pass-80 comment
    "https://facebook.com/groups/1178801365519809/permalink/2852941286336529/",
    # Cowboys and Al: pass-82 refuse-filtered
    "https://facebook.com/groups/1504277980997243/permalink/1805845397507165/",
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
    if any(n in t["text"].lower() or n in t["author"].lower() for n in NEVER):
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

# --- comment pairs: business authors verified via facebook-cli post read ---
comments = [
    # Smith Family Orchard Store Friday-baked-goods post (777146298826865)
    # was already engaged in a prior pass (guard SKIPPED_REENGAGEMENT);
    # dropped as a comment target.
    {
        "url": "https://facebook.com/groups/786995948656362/permalink/2006838136672131/",
        "page": "Sunflower Theatre at KSJD (opening weekend)",
        "text": "Opening weekend almost sold out is the best problem in live theatre. Break every leg on that stage.",
    },
    {
        "url": "https://facebook.com/groups/1677940889636763/permalink/2290999658330880/",
        "page": "Two Sisters Homeopathy (wellness intro)",
        "text": "Gentle and individualized beats one-size-fits-all wellness every time. The body keeps the best notes.",
    },
]

# verify comment URLs are in the candidate set and unhandled
byurl = {t["url"]: t for t in cands}
for cm in comments:
    assert cm["url"] in byurl, f"comment URL missing from candidates: {cm['url']}"
    assert cm["url"] not in handled_urls, f"comment URL already handled: {cm['url']}"
    assert len(cm["text"].split()) < 20, f"comment too long: {cm['text']}"
    assert "\u2014" not in cm["text"], f"em dash in comment: {cm['text']}"
    assert cm["text"].lower().count("ping") == 0, f"PING mention: {cm['text']}"

# --- assemble job ---
actions = []
used_pages = set()
label_counts = {}

def unique_page(group, label):
    base = f"{group} ({label})"
    n = label_counts.get(base, 0)
    label_counts[base] = n + 1
    return base if n == 0 else f"{base} [{n+1}]"

def add_action(a):
    assert a["page"] not in used_pages, f"dup page: {a['page']}"
    used_pages.add(a["page"])
    actions.append(a)

# comment pairs first (like + comment on the same post)
for cm in comments:
    t = byurl[cm["url"]]
    like_label = unique_page(t["group"], t["author"][:40] or t["text"][:40].strip())
    add_action({"type": "like", "page": like_label, "url": t["url"]})
    add_action({"type": "comment", "page": cm["page"] + " (comment)",
                "url": cm["url"], "text": cm["text"]})

# top scored likes up to 75 total likes
like_count = sum(1 for a in actions if a["type"] == "like")
for t in likes:
    if like_count >= 75:
        break
    if t["url"] in {a["url"] for a in actions}:
        continue
    label = t["text"][:45].strip()
    page = unique_page(t["group"], label if t["group"] != "home" else (t["author"][:40] or label))
    add_action({"type": "like", "page": page, "url": t["url"]})
    like_count += 1

job = {
    "job_id": f"fb-pass84-{time.strftime('%Y%m%d-%H%M%S')}",
    "platform": "facebook",
    "minDelaySec": 60,
    "maxDelaySec": 120,
    "actions": actions,
}
ts = time.strftime("%Y%m%d-%H%M%S")
job_path = f"/tmp/fb-job-{ts}.json"
json.dump(job, open(job_path, "w"), indent=1)
nl = sum(1 for a in actions if a["type"] == "like")
nc = sum(1 for a in actions if a["type"] == "comment")
print(f"job: {job_path}  likes={nl} comments={nc} total={len(actions)}")
# sanity: unique pages, full URLs only, no sale-post URLs, no truncated pfbids, no reels
pages = [a["page"] for a in actions]
assert len(pages) == len(set(pages)), "duplicate page descriptors!"
for a in actions:
    assert a["url"].startswith("https://facebook.com/"), a["url"]
    assert "?sale_post_id=" not in a["url"], a["url"]
    assert "/reel/" not in a["url"], a["url"]
    pf = pfbid_of(a["url"])
    assert not (pf and len(pf) < 40), f"truncated pfbid: {a['url']}"
print("sanity checks passed")
print("JOB_PATH=" + job_path)
