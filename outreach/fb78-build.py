#!/usr/bin/env python3
"""Pass-78 job builder. Filters fb78 candidates against the engagement log,
applies content rules + manual curation, assembles the Pig job JSON.
Comment candidates were author-verified as businesses via post reads."""
import json, re, os, time

WS = os.path.expanduser("~/workspace/outreach")
LOG = os.path.join(WS, "facebook-engagement.md")
CAND = os.path.join(WS, "fb78-candidates.json")

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
    if "yard sale" in tx or "moving sale" in tx:
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
         "copley construction", "rock bottom junk", "bin squatch", "wingin",
         "abbotts", "daniel", "integrity painting"]

# manual drops: pass-78 curated (handled-by-guard history, never-re-engage pages,
# duplicate posts of handled pages, stale/fail-loop targets)
DROP_URLS = {
    # Delta empanadas comment target: "no article found" two passes running (pass 76)
    "https://facebook.com/groups/1504277980997243/permalink/180232634785907/",
    # Ambers house cleaning llc: shower post commented in a prior pass; the
    # near-duplicate is the same page -> off-limits
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
    # Cole Bailey pasture posts: ISO-seeking anyway, plus guard fuzzy-blocked
    "https://facebook.com/groups/3741333852807065/permalink/4472057749734668/",
    "https://facebook.com/groups/1178801365519809/permalink/28520382427601667/",
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
# 1. Mightydoormechanics (business) - garage door tune-up post
# 2. Garage Door Up and Over (business) - $79 lube and tune special
comments = [
    {
        "url": "https://facebook.com/groups/1034795403236979/permalink/28276769011946250/",
        "page": "Mightydoormechanics (garage door tune-up post)",
        "text": "Springs, rollers, cables, the whole garage door orchestra. A tune-up beats a snapped cable every time.",
    },
    {
        "url": "https://facebook.com/groups/2803047646497352/permalink/4077000632435374/",
        "page": "Garage Door Up and Over ($79 lube and tune special)",
        "text": "$79 for a lube and tune is a steal. Smooth rollers make the whole house quieter.",
    },
]

# verify comment URLs are in the candidate set and unhandled
byurl = {t["url"]: t for t in cands}
for cm in comments:
    assert cm["url"] in byurl, f"comment URL missing from candidates: {cm['url']}"
    assert cm["url"] not in handled_urls, f"comment URL already handled: {cm['url']}"
    assert len(cm["text"].split()) < 20, f"comment too long: {cm['text']}"
    assert "\u2014" not in cm["text"], f"em dash in comment: {cm['text']}"

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
    "job_id": f"fb-pass78-{time.strftime('%Y%m%d-%H%M%S')}",
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
# sanity: unique pages, full URLs only, no sale-post URLs, no reels in likes
pages = [a["page"] for a in actions]
assert len(pages) == len(set(pages)), "duplicate page descriptors!"
for a in actions:
    assert a["url"].startswith("https://facebook.com/"), a["url"]
    assert "?sale_post_id=" not in a["url"], a["url"]
print("sanity checks passed")
print("JOB_PATH=" + job_path)
