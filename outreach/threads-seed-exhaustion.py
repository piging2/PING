#!/usr/bin/env python3
"""threads-seed-exhaustion.py: generic seed-exhaustion for Threads engagement passes.

Rule (Nolan-approved 2026-09-30, convergence GO, unit Threads): a seed whose
enumerated candidates come back 100% already-engaged across
EXHAUSTION_STREAK_THRESHOLD consecutive passes is marked
EXHAUSTED_FOR_CURRENT_WINDOW. The pass stops enumerating it every pass and a
replacement-seed request is emitted. This is orchestration state only: the
never-re-engage guard and all safety rules are untouched, and no seed handle
is special-cased anywhere in this module. Any engagement pass could reuse it.

A seed is "100% already-engaged" for a pass when it enumerated >= 1 candidate
post, every candidate was blocked as already-engaged, and zero were eligible.
Passes where the seed enumerated nothing (identity exclusion, enumeration
failure) hold the streak: they neither confirm nor deny exhaustion. Passes
with any other block mix hold it too (conservative).

Re-open conditions (any one re-opens the seed to ACTIVE):
  1. time window expires (EXHAUSTION_WINDOW_DAYS after marking),
  2. the seed source changes (threads-seeds.md content hash differs),
  3. new posts appear for the seed,
  4. engagement state changes (history hash differs, or a candidate is eligible).

Usage:
  threads-seed-exhaustion.py observe --seed @handle --pass-id ID
      --post-ids CODE1,CODE2 [--already-engaged N] [--eligible N]
      [--pass-ts ISO] [--source-sig S] [--history-sig H]
  threads-seed-exhaustion.py recommend --seeds @a,@b,@c [--format json|text]
  threads-seed-exhaustion.py status

The pass worker calls `observe` once per seed per pass with the guard's
outcome, then `recommend` with the full seed list to learn which seeds to
enumerate for the discovery job. Exhausted seeds are skipped; a replacement
request is printed and written when a seed transitions to exhausted.
"""
import argparse
import datetime
import hashlib
import json
import os
import re
import sys

HOME = os.path.expanduser("~")
OUTREACH = os.path.join(HOME, "workspace/outreach")

# Consecutive 100%-already-engaged passes before a seed is marked exhausted.
# Conservative on purpose: the cron body's yield cadence already treats 3
# empty passes as light mode and 5 as an interval stretch, so 10 consecutive
# fully-engaged passes is well past "thin" and into "provably barren".
EXHAUSTION_STREAK_THRESHOLD = 10
# How long an exhaustion marking lasts before the window expires.
EXHAUSTION_WINDOW_DAYS = 7

STATUS_ACTIVE = "ACTIVE"
STATUS_EXHAUSTED = "EXHAUSTED_FOR_CURRENT_WINDOW"


def state_path():
    return os.environ.get("THREADS_SEED_EXHAUSTION_STATE",
                          os.path.join(OUTREACH, "threads-seed-exhaustion.json"))


def requests_dir():
    return os.environ.get("THREADS_SEED_REQUESTS_DIR",
                          os.path.join(OUTREACH, "seed-replacement-requests"))


def seeds_file():
    return os.environ.get("THREADS_SEEDS_FILE",
                          os.path.join(OUTREACH, "threads-seeds.md"))


def engagement_log():
    return os.environ.get("THREADS_ENGAGEMENT_LOG",
                          os.path.join(OUTREACH, "threads-engagement.md"))


def utcnow():
    return datetime.datetime.now(datetime.timezone.utc)


def utcnow_iso():
    return utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_ts(ts):
    if not ts:
        return None
    try:
        t = datetime.datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
        return t if t.tzinfo else t.replace(tzinfo=datetime.timezone.utc)
    except Exception:
        return None


def sha256_file(path):
    try:
        h = hashlib.sha256()
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                h.update(chunk)
        return h.hexdigest()
    except Exception:
        return None


def seed_source_signature():
    """Hash of the seed list source. A changed seed file (seeds added,
    removed, or edited) re-opens exhausted seeds for re-evaluation."""
    return sha256_file(seeds_file())


def engagement_history_signature():
    """Hash of the durable engagement history the guard consults. If the
    history changes (engagements added or removed), exhaustion is
    re-evaluated: previously-engaged posts may be eligible again."""
    return sha256_file(engagement_log())


def load_state():
    p = state_path()
    try:
        with open(p, encoding="utf-8") as f:
            d = json.load(f)
        if isinstance(d, dict) and isinstance(d.get("seeds"), dict):
            return d
    except Exception:
        pass
    return {"seeds": {}}


def save_state(state):
    p = state_path()
    d = os.path.dirname(p)
    if d:
        os.makedirs(d, exist_ok=True)
    tmp = p + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2, sort_keys=True)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, p)


def new_entry():
    return {"status": STATUS_ACTIVE,
            "consecutive_all_engaged": 0,
            "last_seen_posts": [],
            "source_signature": None,
            "history_signature": None,
            "window_start": None,
            "window_end": None,
            "exhausted_since": None,
            "decision_requested": False,
            "last_pass_id": None,
            "last_observed": None,
            "reopened_reason": None}


def safe_handle(handle):
    return re.sub(r"[^A-Za-z0-9]+", "_", handle or "seed").strip("_") or "seed"


def emit_replacement_request(seed, entry):
    """Exactly one replacement-seed request per exhaustion event. Written to
    the requests dir and printed for the pass worker to surface."""
    d = requests_dir()
    os.makedirs(d, exist_ok=True)
    req = {
        "type": "threads_seed_replacement_request",
        "seed": seed,
        "emitted_at": utcnow_iso(),
        "authority": "Nolan directive 2026-09-30 (Threads seed exhaustion)",
        "status": STATUS_EXHAUSTED,
        "consecutive_all_engaged_passes": entry["consecutive_all_engaged"],
        "last_pass_id": entry["last_pass_id"],
        "window": {"start": entry["window_start"], "end": entry["window_end"]},
        "requested_action": ("Harvest or provide replacement Threads seeds: "
                             "this seed's candidates have been 100%% "
                             "already-engaged for %d consecutive passes. It is "
                             "skipped for enumeration until the window expires "
                             "or a re-open condition fires."
                             % entry["consecutive_all_engaged"]),
    }
    fname = "threads-seed-replacement-request-%s-%s.json" % (
        safe_handle(seed), utcnow().strftime("%Y%m%d-%H%M%S"))
    path = os.path.join(d, fname)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(req, f, ensure_ascii=False, indent=2, sort_keys=True)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, path)
    print("REPLACEMENT_SEEDS_REQUESTED seed=%s (%d consecutive 100%% "
          "already-engaged passes; window until %s)"
          % (seed, entry["consecutive_all_engaged"], entry["window_end"]))
    print("  request file: " + path)
    return path


def mark_exhausted(seed, entry, now):
    entry["status"] = STATUS_EXHAUSTED
    entry["exhausted_since"] = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    entry["window_start"] = entry["exhausted_since"]
    entry["window_end"] = (now + datetime.timedelta(
        days=EXHAUSTION_WINDOW_DAYS)).strftime("%Y-%m-%dT%H:%M:%SZ")
    entry["decision_requested"] = False
    print("seed %s marked %s (streak %d)" %
          (seed, STATUS_EXHAUSTED, entry["consecutive_all_engaged"]))
    if not entry["decision_requested"]:
        emit_replacement_request(seed, entry)
        entry["decision_requested"] = True


def reopen(seed, entry, reason, now):
    entry["status"] = STATUS_ACTIVE
    entry["consecutive_all_engaged"] = 0
    entry["window_start"] = None
    entry["window_end"] = None
    entry["exhausted_since"] = None
    entry["decision_requested"] = False
    entry["reopened_reason"] = reason
    print("seed %s re-opened to ACTIVE (reason=%s)" % (seed, reason))


def observe(seed, post_ids, already_engaged, eligible, pass_id,
            pass_ts=None, source_sig=None, history_sig=None):
    """Record one pass observation for a seed. Returns the outcome string:
    ALL_ENGAGED / HAS_ELIGIBLE / NO_ENUMERATION / MIXED_BLOCKED, prefixed with
    EXHAUSTED_SKIP when the seed stays exhausted (do not enumerate it)."""
    state = load_state()
    entry = state["seeds"].setdefault(seed, new_entry())
    now = parse_ts(pass_ts) or utcnow()
    src = source_sig if source_sig is not None else seed_source_signature()
    hist = history_sig if history_sig is not None else engagement_history_signature()

    # Re-open check first: any re-open condition fires before evaluation.
    if entry["status"] == STATUS_EXHAUSTED:
        reason = None
        wend = parse_ts(entry.get("window_end"))
        if wend is not None and now >= wend:
            reason = "window_expired"
        elif src != entry.get("source_signature"):
            reason = "source_changed"
        elif eligible > 0:
            reason = "engagement_state_changed"
        elif hist != entry.get("history_signature"):
            reason = "engagement_state_changed"
        elif any(p not in (entry.get("last_seen_posts") or []) for p in post_ids):
            reason = "new_posts"
        if reason:
            reopen(seed, entry, reason, now)

    if entry["status"] == STATUS_EXHAUSTED:
        entry["last_pass_id"] = pass_id
        entry["last_observed"] = now.strftime("%Y-%m-%dT%H:%M:%SZ")
        entry["last_seen_posts"] = list(post_ids)
        save_state(state)
        return "EXHAUSTED_SKIP"

    n = len(post_ids)
    if eligible > 0:
        entry["consecutive_all_engaged"] = 0
        outcome = "HAS_ELIGIBLE"
    elif n > 0 and already_engaged == n:
        entry["consecutive_all_engaged"] += 1
        outcome = "ALL_ENGAGED"
        if entry["consecutive_all_engaged"] >= EXHAUSTION_STREAK_THRESHOLD:
            entry["last_pass_id"] = pass_id
            mark_exhausted(seed, entry, now)
    elif n == 0:
        outcome = "NO_ENUMERATION"  # hold the streak: neither confirm nor deny
    else:
        outcome = "MIXED_BLOCKED"  # hold the streak: conservative

    entry["last_pass_id"] = pass_id
    entry["last_observed"] = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    entry["last_seen_posts"] = list(post_ids)
    entry["source_signature"] = src
    entry["history_signature"] = hist
    save_state(state)
    print("observe seed=%s pass=%s outcome=%s streak=%d status=%s" %
          (seed, pass_id, outcome, entry["consecutive_all_engaged"],
           entry["status"]))
    return outcome


def recommend(seeds, fmt="text"):
    """Split a candidate seed list into seeds to enumerate vs exhausted skips.
    The discovery-job builder enumerates only `enumerate`."""
    state = load_state()
    now = utcnow()
    enumerate_seeds = []
    skipped = []
    for seed in seeds:
        entry = state["seeds"].get(seed)
        if entry and entry.get("status") == STATUS_EXHAUSTED:
            wend = parse_ts(entry.get("window_end"))
            if wend is None or now < wend:
                skipped.append(seed)
                continue
        enumerate_seeds.append(seed)
    pending = 0
    try:
        pending = len([f for f in os.listdir(requests_dir())
                       if f.endswith(".json")])
    except Exception:
        pass
    result = {"enumerate": enumerate_seeds,
              "skip_exhausted": skipped,
              "replacement_requests_pending": pending}
    if fmt == "json":
        print(json.dumps(result, indent=2, sort_keys=True))
    else:
        print("enumerate (%d): %s" % (len(enumerate_seeds),
                                      ", ".join(enumerate_seeds) or "(none)"))
        print("skip_exhausted (%d): %s" % (len(skipped),
                                           ", ".join(skipped) or "(none)"))
        if skipped:
            print("note: %d replacement-seed request(s) pending in %s"
                  % (pending, requests_dir()))
    return result


def status():
    state = load_state()
    seeds = state.get("seeds", {})
    if not seeds:
        print("no seed observations recorded")
        return
    for seed in sorted(seeds):
        e = seeds[seed]
        print("%s: %s streak=%d last_pass=%s window_end=%s reopened=%s" %
              (seed, e.get("status"), e.get("consecutive_all_engaged"),
               e.get("last_pass_id"), e.get("window_end"),
               e.get("reopened_reason")))


def main(argv=None):
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)

    ob = sub.add_parser("observe")
    ob.add_argument("--seed", required=True)
    ob.add_argument("--pass-id", required=True)
    ob.add_argument("--post-ids", default="",
                    help="comma-separated candidate post codes enumerated")
    ob.add_argument("--already-engaged", type=int, default=0)
    ob.add_argument("--eligible", type=int, default=0)
    ob.add_argument("--pass-ts", default=None)
    ob.add_argument("--source-sig", default=None)
    ob.add_argument("--history-sig", default=None)

    rc = sub.add_parser("recommend")
    rc.add_argument("--seeds", required=True,
                    help="comma-separated full seed list to filter")
    rc.add_argument("--format", default="text", choices=("text", "json"))

    sub.add_parser("status")

    a = ap.parse_args(argv)
    if a.cmd == "observe":
        post_ids = [p for p in a.post_ids.split(",") if p]
        outcome = observe(a.seed, post_ids, a.already_engaged, a.eligible,
                          a.pass_id, a.pass_ts, a.source_sig, a.history_sig)
        print("outcome=" + outcome)
        return 0
    if a.cmd == "recommend":
        recommend([s for s in a.seeds.split(",") if s], a.format)
        return 0
    status()
    return 0


if __name__ == "__main__":
    sys.exit(main())
