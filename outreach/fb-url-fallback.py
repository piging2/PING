#!/usr/bin/env python3
"""Facebook URL-injection fallback job builder (2026-09-26).

Activated by Nolan's 2026-09-26 order ("if you fail you do it again / more
interactions ASAP"): when the stefi preferred read path is down
(fb-degraded-probe.py exit 2), the pass routes here instead of ending as
NOT_ATTEMPTED.

Design (Stream E, fb-read-fallback-design-2026-09-26.md):
- Candidates are post URLs observed elsewhere (Pig browser session,
  researcher-pasted links, prior stefi discovery). Nothing is guessed,
  scraped, or constructed.
- Each URL is validated READ-ONLY via `facebook-cli post read --url`.
  Unresolvable URLs are dropped, never retried as IDs.
- Validated candidates flow through the UNCHANGED pipeline: never-reengage
  filter -> intent ledger (refuse honored) -> Pig driver with existing pacing
  and halt-on-restriction. This script never dispatches; it only builds the
  job file in the exact /tmp/fb-job-<timestamp>.json format run_pass.sh
  expects (actions with type/url/page/text, unique page descriptors).
- Trust gate: start at HALF caps (37 likes + 10 comments) until 3 consecutive
  successful `post read` validations, then full caps (75 likes + 20 comments).
  Any failed validation resets the streak (fail closed, re-lock to half caps).
- Ledger blind-spot fix (2026-09-26, Nolan): pre-execution intents
  participate in refusal semantics AT BUILD TIME, not just at dispatch. Any
  pool URL whose post ID has an open (non-terminal) intent or a terminal
  UNKNOWN_EXECUTION in the intent ledger is ineligible for the pool and is
  dropped before validation. The 42 unresolved fb-20260924-175129 likes are
  open intents: never retried, never inferred failed, never erased to clear
  the queue. Reuses the guard's canonical `_fb_ledger_engaged_post_ids()`
  helper; the intent ledger stays the single refusal store. Ledger
  unreadable -> fail closed (no job emitted).
- Stefi stays quarantined: this builder never touches the stefi
  groups/timeline endpoints (validation is `post read --url` only). Return
  to the preferred path happens only on a successful fb-degraded-probe.py
  probe (exit 0), routed by the cron body; elapsed time never re-enables it.
- Every emitted action is stamped acquisition_source="url-injection" plus
  the pool entry's original acquisition source.
- Return to the preferred path only after fb-degraded-probe.py reports it
  recovered (exit 0); that routing lives in the cron body, not here.

Usage:
  fb-url-fallback.py [--pool PATH] [--dry-run]
    [--full-likes 75 --full-comments 20] [--max-validate N]
Exit 0: validated job written; JSON summary (with "job" path) on stdout.
Exit 3: nothing emitted (pool empty, none validated, none eligible).
Exit 2: infra/config error (pool unreadable, ledger unreadable, facebook-cli
missing). Fail closed throughout: unvalidated, unresolvable, or
ledger-blocked URLs are dropped, never retried as IDs.
"""
import json
import os
import re
import subprocess
import sys
import time
import importlib.util
from datetime import datetime, timezone

OUTREACH = os.path.expanduser("~/workspace/outreach")
DEFAULT_POOL = os.path.join(OUTREACH, "fb-url-candidates.json")
STATE = os.path.expanduser(
    "~/workspace/goals/ping-social-outreach-campaign/hidden_files/fb-fallback-state.json")

HALF_LIKES, HALF_COMMENTS = 37, 10
TRUST_STREAK = 3  # consecutive successful validations to unlock full caps

SHARE_PATTERNS = ("l.facebook.com", "fb.me/", "fb.watch", "/share/")


def utcnow():
    return datetime.now(timezone.utc).isoformat()


def load_pool(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            raw = json.load(f)
    except Exception as e:
        print(json.dumps({"ok": False, "error": "pool unreadable: %s" % e,
                          "pool": path}), file=sys.stderr)
        return None
    items = raw if isinstance(raw, list) else raw.get("candidates", [])
    return items if isinstance(items, list) else None


def load_state():
    try:
        st = json.load(open(STATE))
        if isinstance(st, dict):
            return st
    except Exception:
        pass
    return {"consecutive_validations": 0, "full_caps_unlocked": False,
            "full_caps_unlocked_at": None, "validations_total": 0,
            "validations_failed_total": 0, "last_run_at": None,
            "last_run_validated": 0, "last_run_dropped": 0}


def save_state(st):
    os.makedirs(os.path.dirname(STATE), exist_ok=True)
    tmp = STATE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(st, f, indent=1)
    os.replace(tmp, STATE)


# Mechanical like-eligibility filters (2026-09-21 fb121 lineage). Junk/
# classifieds/out-of-area signals are dropped before validation so the
# trust streak is not spent on posts that could never be engaged.
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
def _corridor_cities():
    """Out-of-corridor city signals. Single source of truth is
    eligibility-data/corridor.json (2026-10-01 P0); this module keeps no
    local city list."""
    path = os.path.join(OUTREACH, "eligibility-data", "corridor.json")
    try:
        with open(path, "r", encoding="utf-8") as f:
            cities = json.load(f).get("cities_out", [])
    except (OSError, ValueError) as e:
        raise RuntimeError("eligibility data unreadable: %s: %s" % (path, e))
    return cities


GEO_DROP_RE = re.compile(
    r"\b(%s)\b" % "|".join(re.escape(c) for c in _corridor_cities()),
    re.IGNORECASE)


def like_eligible(entry):
    """Mechanical pre-filter; the never-reengage guard and ledger still run."""
    url = entry.get("url") or ""
    text = entry.get("text") or ""
    if not url:
        return False, "no-url"
    if "facebook.com" not in url and "fb.me" not in url and "fb.watch" not in url:
        return False, "non-facebook-url"
    if "/reel/" in url:
        return False, "reel"
    if not text.strip():
        return False, "empty-text"
    if DROP_RE.search(text):
        return False, "junk-signal"
    if GEO_DROP_RE.search(text):
        return False, "out-of-area"
    return True, ""


def ledger_blocked_post_ids():
    """Post IDs ineligible for the fallback pool per intent-ledger refusal
    semantics (Nolan 2026-09-26 ledger blind-spot fix).

    Blocks post IDs with an open (non-terminal) intent or a terminal
    UNKNOWN_EXECUTION observation, plus EXECUTED/FAILED per the standing
    never-reengage rule. Intents whose every observation is terminal
    NOT_ATTEMPTED are proven non-executions and stay eligible.

    Reuses the guard's canonical helper so the intent ledger stays the
    single refusal store; nothing is duplicated and no UNKNOWN is erased.
    Fail closed: ledger missing/unreadable -> raise, no job is emitted.
    """
    ledger_path = os.path.join(OUTREACH, "action-intent-ledger.jsonl")
    if not os.path.isfile(ledger_path):
        raise RuntimeError("intent ledger unreadable: %s" % ledger_path)
    spec = importlib.util.spec_from_file_location(
        "fburlfall_eg", os.path.join(OUTREACH, "engagement-guard.py"))
    eg = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(eg)
    return eg, set(eg._fb_ledger_engaged_post_ids())


def decode_share_url(url):
    """Resolve share links to their canonical URL; fail closed."""
    try:
        r = subprocess.run(
            ["facebook-cli", "link-sharing", "decode-url", "--url", url],
            capture_output=True, text=True, timeout=45)
    except Exception:
        return None
    if r.returncode != 0:
        return None
    try:
        d = json.loads(r.stdout)
    except Exception:
        return None
    orig = (d.get("original_url") or "").strip()
    return orig or None


def validate_url(url):
    """Read-only validation. Returns (ok, resolved) where resolved carries
    post_id, canonical url, owner_name, caption on success."""
    if any(p in url for p in SHARE_PATTERNS):
        dec = decode_share_url(url)
        if not dec:
            return False, {"reason": "share-link-decode-failed"}
        url = dec
    try:
        r = subprocess.run(
            ["facebook-cli", "post", "read", "--url", url],
            capture_output=True, text=True, timeout=60)
    except Exception as e:
        return False, {"reason": "validation-exception: %s" % str(e)[:120]}
    if r.returncode != 0:
        err = (r.stderr or r.stdout or "")[:160].replace("\n", " ")
        return False, {"reason": "post-read-rc=%d: %s" % (r.returncode, err)}
    try:
        d = json.loads(r.stdout)
    except Exception:
        return False, {"reason": "post-read-unparseable"}
    posts = d.get("posts") or []
    if not posts:
        return False, {"reason": "no-post-resolved"}
    p = posts[0]
    if not p.get("post_id"):
        return False, {"reason": "resolved-without-post-id"}
    return True, {
        "post_id": p.get("post_id"),
        "url": p.get("url") or url,
        "owner_name": p.get("owner_name") or p.get("username") or "",
        "caption": p.get("post_caption") or "",
        "created": (p.get("post_created_at") or {}).get("utc") or p.get("created_at") or "",
    }


def page_descriptor(owner_name, caption, used):
    snippet = re.sub(r"\s+", " ", (caption or ""))[:42].strip()
    base = (owner_name or "post").strip()
    name = ("%s: %s" % (base, snippet)) if snippet else base
    name = name[:90]
    if name not in used:
        used.add(name)
        return name
    i = 2
    while True:
        cand = ("%s [%d]" % (name[:84], i))
        if cand not in used:
            used.add(cand)
            return cand
        i += 1


def main():
    args = sys.argv[1:]
    dry_run = "--dry-run" in args
    pool_path = DEFAULT_POOL
    if "--pool" in args:
        pool_path = os.path.expanduser(args[args.index("--pool") + 1])
    full_likes = int(args[args.index("--full-likes") + 1]) if "--full-likes" in args else 75
    full_comments = int(args[args.index("--full-comments") + 1]) if "--full-comments" in args else 20
    max_validate = int(args[args.index("--max-validate") + 1]) if "--max-validate" in args else 60

    # Soft routing check: the fallback is only meaningful while the preferred
    # read path is degraded. Warning only, not a gate: the cron body owns
    # routing via fb-degraded-probe.py, and only a successful probe (never
    # elapsed time) re-enables the preferred path. Stefi stays quarantined.
    try:
        ostate = json.load(open(os.path.expanduser(
            "~/workspace/goals/ping-social-outreach-campaign/hidden_files/fb-outage-state.json")))
        if not (ostate.get("consecutive_not_attempted", 0) >= 2
                and ostate.get("signature") == "stefi-500+timeline-403"):
            print("[fb-url-fallback] WARNING: preferred path does not look degraded "
                  "(outage state: %s); fallback running outside the degraded route."
                  % json.dumps({k: ostate.get(k) for k in
                                ("consecutive_not_attempted", "signature")}),
                  file=sys.stderr)
    except Exception:
        pass

    items = load_pool(pool_path)
    if items is None:
        return 2

    # Ledger blind-spot fix: refusal semantics apply at build time. Fail
    # closed when the ledger cannot be consulted.
    try:
        eg, ledger_blocked = ledger_blocked_post_ids()
    except Exception as e:
        print(json.dumps({"ok": False, "error": "ledger unavailable, failing closed: %s" % e}),
              file=sys.stderr)
        return 2
    print("[fb-url-fallback] ledger-blocked post ids: %d" % len(ledger_blocked),
          file=sys.stderr)

    # Fail closed on entries with no recorded acquisition source, and dedupe.
    accepted, rejected = [], 0
    seen = set()
    for e in items:
        if not isinstance(e, dict):
            rejected += 1
            continue
        url = (e.get("url") or "").strip()
        src = (e.get("acquisition_source") or "").strip()
        if not url or not src:
            rejected += 1
            continue
        norm = url.rstrip("/").lower()
        if norm in seen:
            rejected += 1
            continue
        seen.add(norm)
        accepted.append(e)

    st = load_state()
    validated, dropped = [], []
    streak = st.get("consecutive_validations", 0)
    ledger_blocked_count = 0

    for e in accepted[:max_validate]:
        # Refusal before validation: open intent or terminal UNKNOWN (or any
        # prior engagement) in the ledger makes the URL ineligible. This is
        # the build-time mirror of the dispatch-time guard/refuse filters;
        # the 42 unresolved fb-20260924-175129 likes are blocked here.
        pids = set(eg._platform_post_ids("facebook", e.get("url") or ""))
        if pids & ledger_blocked:
            ledger_blocked_count += 1
            dropped.append({"url": e.get("url"),
                            "why": "ledger-blocked-open-or-unknown"})
            continue
        ok, _ = like_eligible(e)
        if not ok:
            dropped.append({"url": e.get("url"), "why": "like-filter:" + _})
            continue
        ok, res = validate_url(e.get("url"))
        st["validations_total"] = st.get("validations_total", 0) + 1
        if ok:
            streak += 1
            e["_resolved"] = res
            validated.append(e)
        else:
            streak = 0  # trust broken: fail closed, re-lock to half caps
            st["full_caps_unlocked"] = False
            st["validations_failed_total"] = st.get("validations_failed_total", 0) + 1
            dropped.append({"url": e.get("url"), "why": res.get("reason", "validate-failed")})
        time.sleep(1)  # bounded read cadence; these are cheap reads

    st["consecutive_validations"] = streak
    if streak >= TRUST_STREAK and not st.get("full_caps_unlocked"):
        st["full_caps_unlocked"] = True
        st["full_caps_unlocked_at"] = utcnow()
    full = bool(st.get("full_caps_unlocked"))
    like_cap = full_likes if full else HALF_LIKES
    comment_cap = full_comments if full else HALF_COMMENTS

    actions, used_pages = [], set()
    likes, comments = 0, 0
    for e in validated:
        res = e["_resolved"]
        if likes >= like_cap:
            break
        pn = page_descriptor(res.get("owner_name") or e.get("author") or "post",
                             res.get("caption") or e.get("text") or "", used_pages)
        action = {"type": "like", "url": res.get("url") or e.get("url"),
                  "page": pn, "acquisition_source": "url-injection",
                  "pool_source": e.get("acquisition_source"),
                  "pool_observed_at": e.get("observed_at"),
                  "post_id": res.get("post_id")}
        actions.append(action)
        likes += 1
        ctext = (e.get("comment_text") or "").strip()
        if ctext and e.get("author_is_page") and comments < comment_cap:
            words = len(ctext.split())
            if 3 <= words <= 20:  # comment voice: punchy, under 20 words
                cpn = page_descriptor(res.get("owner_name") or e.get("author") or "post",
                                      res.get("caption") or e.get("text") or "", used_pages)
                actions.append({"type": "comment", "url": res.get("url") or e.get("url"),
                                "page": cpn, "text": ctext,
                                "acquisition_source": "url-injection",
                                "pool_source": e.get("acquisition_source"),
                                "pool_observed_at": e.get("observed_at"),
                                "post_id": res.get("post_id")})
                comments += 1

    st["last_run_at"] = utcnow()
    st["last_run_validated"] = len(validated)
    st["last_run_dropped"] = len(dropped)
    save_state(st)

    summary = {
        "ok": True, "dry_run": dry_run,
        "pool": pool_path,
        "pool_entries": len(items), "pool_accepted": len(accepted),
        "pool_rejected_no_source": rejected,
        "pool_ledger_blocked": ledger_blocked_count,
        "ledger_blocked_ids_consulted": len(ledger_blocked),
        "validated": len(validated), "dropped": len(dropped),
        "dropped_detail": dropped[:10],
        "trust_streak": streak, "trust_needed": TRUST_STREAK,
        "full_caps_unlocked": full,
        "caps": {"likes": like_cap, "comments": comment_cap},
        "actions": {"likes": likes, "comments": comments, "total": len(actions)},
        "job": None,
    }
    if actions:
        ts = datetime.now().strftime("%Y%m%d-%H%M%S")
        job = {"actions": actions, "minDelaySec": 60, "maxDelaySec": 120,
               "acquisition_source": "url-injection",
               "fallback": True, "fallback_caps": {"likes": like_cap, "comments": comment_cap},
               "trust_streak": streak, "pool": pool_path, "built_at_utc": utcnow()}
        job_path = "/tmp/fb-job-%s.json" % ts
        with open(job_path, "w", encoding="utf-8") as f:
            json.dump(job, f, indent=1)
        summary["job"] = job_path
        print(json.dumps(summary, indent=1))
        return 0
    summary["ok"] = False
    summary["note"] = "no actions emitted: pool empty, none validated, or none eligible"
    print(json.dumps(summary, indent=1))
    return 3


if __name__ == "__main__":
    sys.exit(main())
