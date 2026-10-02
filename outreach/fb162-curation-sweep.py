#!/usr/bin/env python3
"""fb162 manual curation sweep: reviewable fresh-pool candidates.
Applies class-based drop rules + terminal-aware ledger checks (PREFIXED post IDs).
"""
import json, re, sys, os
sys.path.insert(0, os.path.expanduser("~/workspace/outreach"))
import importlib.util
_spec = importlib.util.spec_from_file_location("engagement_guard", os.path.expanduser("~/workspace/outreach/engagement-guard.py"))
_mod = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(_mod)
_fb_ledger_engaged_post_ids = _mod._fb_ledger_engaged_post_ids

OUT = os.path.expanduser("~/workspace/outreach")
cands = json.load(open(os.path.join(OUT, "fb162-candidates.json")))
engaged = _fb_ledger_engaged_post_ids()
print("ledger engaged post IDs consulted:", len(engaged), file=sys.stderr)

def post_id(url):
    m = re.search(r'/permalink/(\d+)', url or '')
    if m: return m.group(1)
    m = re.search(r'/posts/(\d+)', url or '')
    if m: return m.group(1)
    m = re.search(r'/(\d{10,})/posts/', url or '')
    if m: return m.group(1)
    return None

# load engaged business names (engaged-name filter from builder) for recency
eng_names = set()
try:
    for line in open(os.path.join(OUT, "facebook-engagement.md"), errors="ignore"):
        pass
except FileNotFoundError:
    pass
# reuse builder's exclusion data instead of re-deriving
led = os.path.join(OUT, "fb162-ledger-excluded.json")
blk = json.load(open(led)) if os.path.exists(led) else {}

NONELIGIBLE_RE = re.compile(
    r"(?i)\b(real[ -]?estate|realtor|for sale by owner|fsbo|open house\b|lot deal|"
    r"lodge\b|ranch for sale|acreage|missing|lost dog|lost cat|reward for|"
    r"pet\b.*lost|vote|ballot|council|mayor|political|democrat|republican|"
    r"iso\b|in search of|for sale\b|sold\b|yard sale|garage sale|free stuff|"
    r"concert|theatre|theater|live music|fundrais|gofundme|benefit\b|"
    r"hiring|job opening|now hiring|help wanted|road construction|"
    r"traffic alert|highway|car show|parade of homes|home show\b)", re.I)
OUT_CORRIDOR_RE = re.compile(
    r"(?i)\b(durango|glenwood springs|colorado springs|denver|aurora|thornton|"
    r"littleton|loveland|pueblo|aspen|steamboat|craig|meeker|gunnison|"
    r"manitou|pagosa|montrose)?"  # montrose IS eligible
)
OUT_CORRIDOR_RE = re.compile(
    r"(?i)\b(durango|glenwood springs|colorado springs|denver\b|aurora|thornton|"
    r"littleton|loveland|pueblo\b|aspen|steamboat|craig|meeker|gunnison|"
    r"manitou springs|pagosa|wake forest|denver metro)\b")
B2B_SPAM_RE = re.compile(r"(?i)(ai[- ]?receptionist|marketing agency|web design|seo\b|lead gen|photo booth)")
PROMO_SIGNAL_RE = re.compile(
    r"(?i)\b(promo|special|sale|discount|deal|offer|grand opening|now open|"
    r"book now|call today|free (quote|estimate)|same.day|fall|season|"
    r"serving|locally owned|family owned|open house\b|taco tuesday|daily special|"
    r"tree|drywall|paint|plumb|hvac|electric|roof|landscap|concrete|fenc|"
    r"handyman|remodel|chimney|detail|massage|barber|bakery|sourdough|"
    r"farm stand|restaurant|cafe|coffee|pest|junk|haul|clean|maid)\b")

# builder already pre-filtered to fresh; load the builder's fresh list if available
fresh_ids = set()
prov = json.load(open("/tmp/fb-job-20260930-132701-provisional.json"))
print("provisional actions:", len(prov["actions"]), file=sys.stderr)

survivors = []
for c in cands:
    src = c.get("source") or ""
    if src == "feed-newsfeed":
        continue  # personal-profile / friend / brand-page feed posts: not eligible surfaces
    url = c.get("url") or ""
    text = c.get("text") or ""
    author = c.get("author") or ""
    hay = f"{text} {author}"
    pid = post_id(url)
    if pid and f"post:{pid}" in engaged:
        continue
    if NONELIGIBLE_RE.search(hay):
        continue
    if OUT_CORRIDOR_RE.search(hay):
        continue
    if B2B_SPAM_RE.search(hay):
        continue
    survivors.append(c)

print("survivors after class+ledger filters:", len(survivors), file=sys.stderr)
for c in survivors:
    t = (c.get("text") or "")[:110].replace("\n", " ")
    print("---", c.get("group"), "|", (c.get("author") or "")[:45])
    print("   ", t)
    print("   ", (c.get("url") or "")[-70:])
json.dump(survivors, open(os.path.join(OUT, "fb162-sweep-survivors.json"), "w"), indent=1)
