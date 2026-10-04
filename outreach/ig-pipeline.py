#!/usr/bin/env python3
"""ig-pipeline.py — Instagram aggressive-pipeline queue builder (READ-ONLY).

Builds/refreshes the deep qualified candidate queue that the
instagram-engagement-pass consumes. Only read targets are used
(user-profile, posts, media-understanding); nothing is liked, commented,
followed, or unfollowed.

Usage:
  python3 ig-pipeline.py --build [--max-calls 300] [--queue-depth 80]
  python3 ig-pipeline.py --reverify-only        # refresh existing queue entries

Output:
  ~/workspace/goals/ping-social-outreach-campaign/hidden_files/engagement-passes/ig-qualified-queue-<ts>.json
  ~/workspace/outreach/instagram-unfollow/ig-unfollow-evidence.jsonl (appended)
"""

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ig_prefilter

HOME = os.path.expanduser("~")
OUTREACH = os.path.join(HOME, "workspace", "outreach")
PASSES = os.path.join(HOME, "workspace", "goals", "ping-social-outreach-campaign",
                      "hidden_files", "engagement-passes")
UNFOLLOW_DIR = os.path.join(OUTREACH, "instagram-unfollow")

TIER_TOWNS = {
    1: ["grand junction", "fruita", "palisade", "clifton", "collbran", "loma",
        "mack", "de beque", "delta", "montrose", "rifle", "carbondale",
        "western co", "western slope", "western colorado", "grand valley"],
    2: ["paonia", "hotchkiss", "cedaredge", "olathe", "rangely", "parachute",
        "new castle", "silt", "eagle"],
    3: ["gunnison", "durango", "glenwood springs", "glenwood", "aspen",
        "steamboat springs", "craig", "meeker", "vail", "pagosa springs",
        "pagosa", "cortez"],
}

# Western CO zip prefixes -> (town, tier). Fail closed: unknown zips stay UNKNOWN.
ZIP_TIER = {
    "815": ("grand junction area", 1),
    "814": ("montrose/delta area", 1),
    "81650": ("rifle", 1),
    "81623": ("carbondale", 1),
    "81601": ("glenwood springs", 3),
    "81602": ("glenwood springs", 3),
    "812": ("gunnison area", 3),
    "81301": ("durango", 3),
    "81302": ("durango", 3),
    "81147": ("pagosa springs", 3),
    "81652": ("silt", 2),
    "81641": ("parachute", 2),
}

# Business-entity markers: a "personal" account_type is overridden ONLY when
# the display name carries one of these (e.g. "5280 Plumbing & Drains LLC").
BUSINESS_NAME_MARKERS = ["llc", "inc", "co.", "corp", "plumbing", "hvac",
                         "electric", "roofing", "services", "contracting",
                         "contractor", "construction", "heating", "cooling",
                         "landscaping", "garage door", "pest control",
                         "& sons", "brothers", "company"]

TRADE_KEYWORDS = [
    "plumb", "hvac", "heat", "cool", "air", "electric", "roof", "landscape",
    "lawn", "turf", "garage door", "pest", "contractor", "remodel", "renovat",
    "paint", "concrete", "driveway", "fence", "tree", "arbor", "cleaning",
    "appliance", "septic", "well", "solar", "floor", "handyman", "pool", "spa",
    "carpentr", "drywall", "gutter", "siding", "deck",
]

RECENCY_LIMIT_DAYS = 90
QUEUE_REFRESH_DAYS = 7

# 429 SHORT-CIRCUIT (2026-09-26, Nolan-approved): when the endpoint returns 429,
# stop making further calls immediately, classify unvetted handles STILL_UNKNOWN,
# and back off one cadence (6h + 1h grace) instead of hammering a throttled endpoint.
THROTTLE_STATE = os.path.join(HOME, "workspace", "goals",
                              "ping-social-outreach-campaign", "hidden_files",
                              "ig-throttle-state.json")
THROTTLE_BACKOFF_SECONDS = 7 * 3600


class ThrottledError(RuntimeError):
    """Raised when instagram-cli reports HTTP 429. Do not retry; back off."""


def record_throttle():
    try:
        os.makedirs(os.path.dirname(THROTTLE_STATE), exist_ok=True)
        json.dump({"throttled_at": datetime.now(timezone.utc).isoformat(),
                   "reason": "HTTP 429 from instagram-cli"},
                  open(THROTTLE_STATE, "w"))
    except Exception:
        pass


def throttle_active():
    try:
        st = json.load(open(THROTTLE_STATE))
        t = datetime.fromisoformat(st["throttled_at"])
        return (datetime.now(timezone.utc) - t).total_seconds() < THROTTLE_BACKOFF_SECONDS
    except Exception:
        return False


api_calls = 0
MAX_CALLS = 300


def cli(*args):
    """Run one instagram-cli read command; count against the API budget."""
    global api_calls
    api_calls += 1
    if api_calls > MAX_CALLS:
        raise RuntimeError("API budget exhausted (%d calls)" % MAX_CALLS)
    argv = [str(a) for a in args]
    r = subprocess.run(["instagram-cli"] + argv,
                       capture_output=True, text=True, timeout=60)
    if r.returncode != 0:
        err = (r.stderr or r.stdout or "")[:200]
        if "429" in err or "rate" in err.lower() and "limit" in err.lower():
            record_throttle()
            raise ThrottledError("instagram-cli throttled (429): %s" % err)
        raise RuntimeError("instagram-cli failed: %s" % err)
    return json.loads(r.stdout)


def get_account_id():
    d = cli("accounts")
    accts = d.get("accounts") or []
    if not accts:
        raise RuntimeError("no linked Instagram account")
    return accts[0]["user_fbid"]


def norm(h):
    h = h.strip().lstrip("@").lower()
    return "@" + h


def parse_sources():
    """Extract candidate handles + source tags from the known source files."""
    found = {}
    def add(handle, source):
        handle = norm(handle)
        if handle and handle != "@":
            found.setdefault(handle, source)

    # seed pool: lines like "- @handle | ..."
    p = os.path.join(OUTREACH, "instagram-seed-pool.md")
    if os.path.exists(p):
        for m in re.finditer(r"^-\s*(@[A-Za-z0-9_.]+)", open(p).read(), re.M):
            add(m.group(1), "seed-pool")

    # prospects: lines like "### 1. @handle — ..." (numbered) or
    # "- @handle — ..." (bullets; 2026-10-03+ sections use bullets)
    p = os.path.join(OUTREACH, "instagram-prospects.md")
    if os.path.exists(p):
        txt = open(p).read()
        for m in re.finditer(r"###\s*\d+\.\s*(@[A-Za-z0-9_.]+)", txt):
            add(m.group(1), "prospects")
        for m in re.finditer(r"^-\s*(@[A-Za-z0-9_.]+)", txt, re.M):
            add(m.group(1), "prospects")

    # second-chance eligibles: lines like "1. `@handle` — ..."
    p = os.path.join(OUTREACH, "instagram-second-chance-2026-09-23.md")
    if os.path.exists(p):
        txt = open(p).read()
        section = txt.split("## Eligible")[1].split("## Still rejected")[0] \
            if "## Eligible" in txt else ""
        for m in re.finditer(r"`(@[A-Za-z0-9_.]+)`", section):
            add(m.group(1), "second-chance")

    # reconciliation RECOVERED_CANDIDATE entries in engagement passes.
    # 2026-10-04 fix: actual files are ig-discover-job-<ts>.reconciliation.json
    # (plus older ig*-discover-probe-*.reconciliation.json) with schema
    # {"reconciled": [{"account": "@h", "disposition": "RECOVERED_CANDIDATE", ...}]}.
    # The old ig-reconciliation-*.json glob and items/status schema matched nothing.
    if os.path.isdir(PASSES):
        for fn in sorted(os.listdir(PASSES)):
            if not fn.endswith(".reconciliation.json"):
                continue
            try:
                d = json.load(open(os.path.join(PASSES, fn)))
            except Exception:
                continue
            items = d.get("reconciled") or d.get("items") or d.get("recovered") or []
            for it in items:
                if not isinstance(it, dict):
                    continue
                disp = it.get("disposition") or it.get("status")
                if disp == "RECOVERED_CANDIDATE":
                    add(it.get("account") or it.get("handle", ""), "reconciliation")
    return found


PROMO_PATTERNS = [
    "giveaway", "vote for", "vote now", "link in bio to vote", "% off",
    "sale ends", "hiring", "join our team", "now hiring", "we're hiring",
    "meet the team", "staff spotlight", "promotional graphic",
    "merry christmas", "happy holidays", "happy thanksgiving",
    "happy 4th", "memorial day sale", "labor day sale",
]


def looks_promo(text):
    t = (text or "").lower()
    return any(p in t for p in PROMO_PATTERNS)


def media_summary_for(acct_id, media_id):
    try:
        mu = cli("media-understanding", "--account-id", acct_id,
                 "--media-ids", media_id)
        items = mu.get("media") or mu.get("results") or []
        if items:
            it = items[0] if isinstance(items, list) else items
            return (it.get("narrative_summary")
                    or it.get("semantic_understanding")
                    or it.get("summary") or it.get("description")
                    or "")[:300]
    except ThrottledError:
        raise
    except Exception:
        pass
    return ""


def validate_draft(draft):
    """Validate a comment draft against the voice contract.
    Returns (ok, reason)."""
    if not draft or not isinstance(draft, str):
        return False, "empty"
    d = draft.strip()
    words = d.split()
    if len(words) > 20:
        return False, "over 20 words (%d)" % len(words)
    if "\u2014" in d or "--" in d:
        return False, "em dash"
    if "ping" in d.lower():
        return False, "mentions PING"
    if re.search(r"https?://|www\.", d):
        return False, "contains link"
    if re.search(r"\(\d{3}\)|\d{3}[-.]\d{3}[-.]\d{4}", d):
        return False, "contains contact info"
    return True, "ok"


def tier_of(text, zip_code=None):
    t = (text or "").lower()
    for tier in (1, 2, 3):
        for town in TIER_TOWNS[tier]:
            if re.search(r"\b" + re.escape(town) + r"\b", t):
                return tier, town
    # zip fallback (Western CO zip evidence)
    zc = (zip_code or "").strip()
    for prefix, (town, tier) in ZIP_TIER.items():
        if zc.startswith(prefix):
            return tier, town
    return None, None


def is_trade(text):
    t = (text or "").lower()
    return any(k in t for k in TRADE_KEYWORDS)


def get_following_set(acct_id, max_pages=25):
    """Fetch Nolan's following list (cached <= 3 days). Returns set of @handles."""
    cache_dir = UNFOLLOW_DIR
    os.makedirs(cache_dir, exist_ok=True)
    caches = sorted(f for f in os.listdir(cache_dir)
                    if f.startswith("following-cache-") and f.endswith(".json"))
    if caches:
        latest = os.path.join(cache_dir, caches[-1])
        try:
            d = json.load(open(latest))
            age = (datetime.now(timezone.utc) -
                   datetime.fromisoformat(d["cached_at"])).days
            if age < 3:
                return set(d["handles"])
        except Exception:
            pass
    handles, after, pages = [], None, 0
    while pages < max_pages:
        args = ["following", "--account-id", acct_id, "--count", 200]
        if after:
            args += ["--after", after]
        try:
            d = cli(*args)
        except ThrottledError:
            raise
        except Exception:
            break
        items = d.get("users") or d.get("following") or []
        for u in items:
            h = u.get("username") if isinstance(u, dict) else u
            if h:
                handles.append(norm(h))
        pi = d.get("page_info") or {}
        after = pi.get("end_cursor") if pi.get("has_next_page") else None
        pages += 1
        if not after:
            break
    if handles:
        cp = os.path.join(cache_dir, "following-cache-%s.json"
                         % datetime.now(timezone.utc).strftime("%Y%m%d"))
        json.dump({"cached_at": datetime.now(timezone.utc).isoformat(),
                   "count": len(handles), "handles": sorted(set(handles))},
                  open(cp, "w"))
    return set(handles)


def vet_handle(acct_id, handle, source, following_set=frozenset()):
    """Vet one handle. Returns (entry | None, unfollow_evidence | None, reason).

    Unfollow evidence is emitted ONLY for handles in Nolan's own following
    set that vet as dead/private/personal: that is the shared surface with
    the instagram-mass-unfollow lane. Engagement candidates outside the
    following set produce no unfollow evidence.
    """
    ev = {"source": source, "vetted_at": datetime.now(timezone.utc).isoformat(),
          "cli_refs": ["user-profile", "posts"]}
    in_following = handle in following_set
    try:
        d = cli("user-profile", "--account-id", acct_id, "--username", handle)
    except ThrottledError:
        raise
    except Exception as e:
        return None, None, "PROFILE_LOOKUP_FAILED: %s" % e
    profs = d.get("profiles") or []
    if not profs:
        ue = ({"handle": handle, "reason": "dead-or-renamed",
               "evidence": "user-profile returned no profile"} if in_following else None)
        return None, ue, "PROFILE_NOT_FOUND"
    p = profs[0]

    if p.get("is_private"):
        ue = ({"handle": handle, "reason": "private",
               "evidence": "is_private=true"} if in_following else None)
        return None, ue, "PRIVATE"
    atype = (p.get("account_type") or "").lower()
    if atype not in ("business", "creator"):
        # "personal" account_type is overridden only when the display name
        # carries an explicit business-entity marker (e.g. "5280 Plumbing &
        # Drains LLC"); otherwise it is treated as a personal profile.
        name_l = (p.get("name") or "").lower()
        if not any(m in name_l for m in BUSINESS_NAME_MARKERS):
            ue = ({"handle": handle, "reason": "personal-account",
                   "evidence": "account_type=%s" % atype} if in_following else None)
            return None, ue, "NOT_BUSINESS"
        ev["business_override"] = "personal-type with business name marker"
    if (p.get("country") or "").upper() != "US":
        return None, None, "NON_US country=%s" % p.get("country")

    bi = p.get("business_info") or {}
    blob = " ".join(filter(None, [
        p.get("name"), p.get("bio"), bi.get("city"),
        bi.get("street_address"), bi.get("zip_code"),
    ]))
    tier, town = tier_of(blob, bi.get("zip_code"))
    if tier is None:
        return None, None, "STILL_UNKNOWN geography (no Western CO town/zip match)"

    pd = None
    last_err = ""
    for attempt in range(2):
        try:
            pd = cli("posts", "--account-id", acct_id, "--username", handle,
                     "--limit", 5, "--post-types", "POST")
            break
        except ThrottledError:
            raise
        except Exception as e:
            last_err = str(e)
            if "HTTP 500" not in last_err:
                break
    if pd is None:
        tag = "PROVIDER_500_RETRYABLE" if "HTTP 500" in last_err else "POSTS_LOOKUP_FAILED"
        return None, None, "%s: %s" % (tag, last_err[:120])
    posts = [x for x in (pd.get("posts") or []) if x.get("url")]
    if not posts:
        return None, None, "NO_FEED_POSTS"

    # Select the newest non-promo post within the recency window.
    # Caption screen is free; media-understanding is spent only on
    # caption-clean posts. Staleness is judged on the newest post overall:
    # a stale account is stale even if an older post was genuine work.
    newest = posts[0]
    try:
        newest_created = datetime.fromisoformat(str(newest.get("created_at")))
    except Exception:
        return None, None, "POST_DATE_UNPARSEABLE"
    if newest_created.tzinfo is None:
        newest_created = newest_created.replace(tzinfo=timezone.utc)
    if (datetime.now(timezone.utc) - newest_created).days > RECENCY_LIMIT_DAYS:
        return None, None, "STALE latest_post %dd old" % (
            datetime.now(timezone.utc) - newest_created).days

    selected, media_summary, age_days, created = None, "", None, None
    for cand in posts:
        cap = (cand.get("post_caption") or "")
        if looks_promo(cap):
            continue
        try:
            cd = datetime.fromisoformat(str(cand.get("created_at")))
        except Exception:
            continue
        if cd.tzinfo is None:
            cd = cd.replace(tzinfo=timezone.utc)
        ad = (datetime.now(timezone.utc) - cd).days
        if ad > RECENCY_LIMIT_DAYS:
            continue
        ms = media_summary_for(acct_id, cand.get("post_id", ""))
        if looks_promo(ms):
            continue
        selected, media_summary, age_days, created = cand, ms, ad, cd
        break
    if selected is None:
        return None, None, "PROMO_ONLY no genuine work post in latest %d" % len(posts)
    ev["cli_refs"] = ["user-profile", "posts"] + (["media-understanding"]
                                                  if media_summary else [])

    caption = (selected.get("post_caption") or "")[:160]
    trade = is_trade(blob + " " + caption + " " + media_summary)

    score = 0
    score += {1: 3, 2: 2, 3: 1}[tier]
    if trade:
        score += 2
    if age_days <= 30:
        score += 2
    elif age_days <= 60:
        score += 1
    score += 1  # photo/carousel (post-types=POST requested)

    entry = {
        "handle": handle,
        "display_name": (p.get("name") or "")[:80],
        "category": "trade" if trade else "business",
        "town": town,
        "tier": tier,
        "trade_priority": trade,
        "followers": p.get("follower_count"),
        "post_count": p.get("post_count"),
        "target_post_url": selected.get("url"),
        "target_post_date": created.date().isoformat(),
        "post_type": "photo",
        "post_evidence": {"caption_excerpt": caption, "media_summary": media_summary},
        "comment_draft": None,
        "evidence": ev,
        "rank_score": score,
    }
    return entry, None, "ELIGIBLE"


def append_unfollow_evidence(records):
    if not records:
        return
    os.makedirs(UNFOLLOW_DIR, exist_ok=True)
    path = os.path.join(UNFOLLOW_DIR, "ig-unfollow-evidence.jsonl")
    with open(path, "a") as f:
        for r in records:
            r["ts"] = datetime.now(timezone.utc).isoformat()
            r["producer"] = "ig-pipeline"
            f.write(json.dumps(r) + "\n")


def main():
    global MAX_CALLS
    ap = argparse.ArgumentParser()
    ap.add_argument("--build", action="store_true")
    ap.add_argument("--reverify-only", action="store_true")
    ap.add_argument("--max-calls", type=int, default=300)
    ap.add_argument("--queue-depth", type=int, default=80)
    args = ap.parse_args()
    MAX_CALLS = args.max_calls

    ts = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    os.makedirs(PASSES, exist_ok=True)

    # 429 backoff: if a previous run was throttled within one cadence, make no
    # calls this run. Carry the latest queue forward unchanged; unvetted handles
    # stay STILL_UNKNOWN (never skip-listed, never permanent rejects).
    if throttle_active():
        queues = sorted(f for f in os.listdir(PASSES)
                        if f.startswith("ig-qualified-queue-") and f.endswith(".json"))
        entries = []
        if queues:
            try:
                entries = json.load(open(os.path.join(PASSES, queues[-1]))).get("entries", [])
            except Exception:
                entries = []
        queue = {
            "built_at": datetime.now(timezone.utc).isoformat(),
            "depth_target": args.queue_depth,
            "partial": True,
            "throttled_backoff": True,
            "api_calls_used": 0,
            "entries": entries,
            "skipped": [],
        }
        out = os.path.join(PASSES, "ig-qualified-queue-%s.json" % ts)
        json.dump(queue, open(out, "w"), indent=1)
        print(json.dumps({"queue": out, "eligible": len(entries),
                          "throttled_backoff": True, "api_calls": 0, "partial": True},
                         indent=1))
        return 4

    try:
        return _build(args, ts)
    except ThrottledError as e:
        # record_throttle() already ran in cli(); finalize with zero further calls.
        queues = sorted(f for f in os.listdir(PASSES)
                        if f.startswith("ig-qualified-queue-") and f.endswith(".json"))
        entries = []
        if queues:
            try:
                entries = json.load(open(os.path.join(PASSES, queues[-1]))).get("entries", [])
            except Exception:
                entries = []
        queue = {
            "built_at": datetime.now(timezone.utc).isoformat(),
            "depth_target": args.queue_depth,
            "partial": True,
            "throttled_429": True,
            "throttle_error": str(e)[:200],
            "api_calls_used": api_calls,
            "entries": entries,
            "skipped": [],
        }
        out = os.path.join(PASSES, "ig-qualified-queue-%s.json" % ts)
        json.dump(queue, open(out, "w"), indent=1)
        print(json.dumps({"queue": out, "eligible": len(entries),
                          "throttled_429": True, "api_calls": api_calls, "partial": True},
                         indent=1), file=sys.stderr)
        return 4


def _build(args, ts):
    # Everything above the "expensive calls" marker below is FREE (local
    # files only): the cheap pre-filter must run before any instagram-cli
    # call, so already-engaged / suppressed / unidentifiable handles never
    # burn API budget.

    # Load latest queue for re-verification
    queues = sorted(f for f in os.listdir(PASSES)
                    if f.startswith("ig-qualified-queue-") and f.endswith(".json"))
    existing = []
    if queues:
        try:
            existing = json.load(open(os.path.join(PASSES, queues[-1]))).get("entries", [])
        except Exception:
            existing = []

    fresh = parse_sources()
    # handles already in a fresh queue entry stay; others get vetted
    existing_handles = {e["handle"] for e in existing}
    to_vet = {h: s for h, s in fresh.items() if h not in existing_handles}

    results, unfollow_ev, skipped = [], [], []
    partial = False

    # Cheap pre-filter BEFORE any instagram-cli call (2026-09-27): the
    # guard's never-re-engage verdicts decide on local history only, so
    # already-engaged, suppressed, and unidentifiable handles never reach
    # vet_handle and burn zero API calls. Filtered identities stay visible
    # in `skipped` with stage + reason. The dispatch-time guard remains the
    # safety boundary; this is a cost saver.
    pf_new = ig_prefilter.prefilter(sorted(to_vet.items()))
    for d in pf_new["decisions"]:
        if d["stage"] != "ELIGIBLE_FOR_VETTING":
            skipped.append((d["handle"], d["reason"]))
    # pf eligible handles are canonical (no @); vet_handle takes the
    # @-prefixed form exactly as parse_sources() produced.
    vet_new = [("@" + h, s) for h, s in pf_new["eligible"]]
    prefilter_metrics = {"new_candidates": pf_new["metrics"]}

    # Re-verify existing entries older than the refresh window. A cheap
    # pre-filter runs on the stale set too: a handle engaged since its last
    # vet must not burn another API round-trip.
    stale_entries, fresh_entries = [], []
    for e in existing:
        try:
            vetted = datetime.fromisoformat(e["evidence"]["vetted_at"])
        except Exception:
            vetted = None
        age = (datetime.now(timezone.utc) - vetted).days if vetted else 999
        (stale_entries if age >= QUEUE_REFRESH_DAYS else fresh_entries).append(e)
    pf_stale = ig_prefilter.prefilter(
        [(e["handle"], e["evidence"]["source"]) for e in stale_entries])
    for d in pf_stale["decisions"]:
        if d["stage"] != "ELIGIBLE_FOR_VETTING":
            skipped.append((d["handle"], d["reason"]))
    stale_drop = {d["handle"].lstrip("@").lower() for d in pf_stale["decisions"]
                  if d["stage"] != "ELIGIBLE_FOR_VETTING"}
    prefilter_metrics["reverify_candidates"] = pf_stale["metrics"]
    # Stale entries that survived the cheap pre-filter: the only stale
    # entries that may spend an API call.
    stale_survivors = [e for e in stale_entries
                       if e["handle"].lstrip("@").lower() not in stale_drop]

    # Fresh carried entries are re-run through the cheap pre-filter too
    # (2026-09-27: 13 handles vetted 2026-09-26 under the pre-prefilter
    # pipeline were carried for ~30h while the dispatch guard blocked them
    # every pass; the never-re-engage check must apply to carried entries,
    # not just new/stale candidates).
    pf_fresh = ig_prefilter.prefilter(
        [(e["handle"], e["evidence"]["source"]) for e in fresh_entries])
    for d in pf_fresh["decisions"]:
        if d["stage"] != "ELIGIBLE_FOR_VETTING":
            skipped.append((d["handle"], d["reason"]))
    fresh_drop = {d["handle"].lstrip("@").lower() for d in pf_fresh["decisions"]
                  if d["stage"] != "ELIGIBLE_FOR_VETTING"}
    prefilter_metrics["carried_candidates"] = pf_fresh["metrics"]
    kept = []
    for e in fresh_entries:
        if e["handle"].lstrip("@").lower() in fresh_drop:
            continue
        # Fresh entry: validate any carried draft against the voice contract.
        if e.get("comment_draft"):
            ok, reason = validate_draft(e["comment_draft"])
            if not ok:
                e["comment_draft"] = None
                e["draft_dropped"] = reason
        kept.append(e)
    results.extend(kept)

    # --- expensive calls start here: only after the free pre-filter, and
    # only when at least one handle will actually be vetted. ---
    will_vet_stale = bool(stale_survivors)
    will_vet_new = bool(vet_new) and not args.reverify_only
    acct_id = None
    following_set = frozenset()
    if will_vet_stale or will_vet_new:
        acct_id = get_account_id()
        # Nolan's following set: the shared surface with the mass-unfollow lane.
        following_set = get_following_set(acct_id)
        print("following set: %d handles" % len(following_set), file=sys.stderr)
    else:
        print("prefilter eliminated every candidate; zero instagram-cli "
              "calls made", file=sys.stderr)

    reverify_vetted = 0
    reverify_accepted = 0
    for e in stale_survivors:
        reverify_vetted += 1
        try:
            entry, ue, reason = vet_handle(acct_id, e["handle"], e["evidence"]["source"], following_set)
        except ThrottledError:
            raise
        except RuntimeError:
            partial = True
            results.append(e)  # budget/API error: keep last-known-good, stop
            break
        if entry:
            results.append(entry)
            reverify_accepted += 1
        elif reason.startswith("PROVIDER_500_RETRYABLE"):
            # Provider outage: carry the last-known-good entry forward
            # (flagged) rather than regressing the queue to empty.
            e["carried_forward"] = True
            e["carry_reason"] = reason
            results.append(e)
            skipped.append((e["handle"], reason))
            partial = True
        else:
            skipped.append((e["handle"], reason))
        if ue:
            unfollow_ev.append(ue)

    vetted_count = 0
    new_accepted = 0
    if will_vet_new:
        for handle, source in vet_new:
            # VETTED counts handles that REACHED vet_handle, even when the
            # call itself raises; the increment precedes the call by design.
            vetted_count += 1
            try:
                entry, ue, reason = vet_handle(acct_id, handle, source, following_set)
            except ThrottledError:
                raise
            except RuntimeError as e:
                partial = True
                skipped.append((handle, "BUDGET_EXHAUSTED"))
                break
            if entry:
                results.append(entry)
                new_accepted += 1
            else:
                skipped.append((handle, reason))
            if ue:
                unfollow_ev.append(ue)

    results.sort(key=lambda e: (-e["rank_score"], e["handle"]))
    # Per-population vetting metrics: VETTED counts handles that reached
    # vet_handle in that population; ACCEPTED counts the ones vet_handle
    # accepted as queue entries. Carried-forward / fresh-kept entries are
    # not vetting acceptances and stay out of these counts.
    prefilter_metrics["new_candidates"]["VETTED"] = vetted_count
    prefilter_metrics["new_candidates"]["ACCEPTED"] = new_accepted
    prefilter_metrics["reverify_candidates"]["VETTED"] = reverify_vetted
    prefilter_metrics["reverify_candidates"]["ACCEPTED"] = reverify_accepted
    queue = {
        "built_at": datetime.now(timezone.utc).isoformat(),
        "depth_target": args.queue_depth,
        "partial": partial,
        "api_calls_used": api_calls,
        "prefilter_metrics": prefilter_metrics,
        "entries": results[:args.queue_depth],
        "skipped": [{"handle": h, "reason": r} for h, r in skipped],
    }
    out = os.path.join(PASSES, "ig-qualified-queue-%s.json" % ts)
    json.dump(queue, open(out, "w"), indent=1)
    append_unfollow_evidence(unfollow_ev)

    print(json.dumps({
        "queue": out,
        "eligible": len(queue["entries"]),
        "skipped": len(skipped),
        "unfollow_evidence": len(unfollow_ev),
        "api_calls": api_calls,
        "partial": partial,
        "prefilter_metrics": prefilter_metrics,
    }, indent=1))


if __name__ == "__main__":
    sys.exit(main())
