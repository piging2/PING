#!/usr/bin/env python3
"""Cheap health probe for the Facebook engagement surface during repeated identical provider outages.

Nolan-approved 2026-09-26: during repeated identical provider outage (stefi 500 + timeline 403),
run ONE cheap probe instead of the expensive full discovery. When the probe recovers, resume
normal discovery. No provider-policy bypass: the probe is a single read the pass would make anyway.

Usage:
  fb-degraded-probe.py                      probe mode (exit 0 = run full discovery, exit 2 = skip)
  fb-degraded-probe.py --record-outcome ok|stefi-outage|other
"""
import json
import os
import subprocess
import sys
from datetime import datetime, timezone

STATE = os.path.expanduser(
    "~/workspace/goals/ping-social-outreach-campaign/hidden_files/fb-outage-state.json")
KNOWN_SIG = "stefi-500+timeline-403"
DEGRADED_AFTER = 2  # consecutive NOT_ATTEMPTED with the known signature before probing
PROBE_GROUP_ID = "2803047646497352"  # CO BizNet: one cheap group-posts read


def load_state():
    try:
        return json.load(open(STATE))
    except Exception:
        return {"consecutive_not_attempted": 0, "signature": None,
                "last_probe_at": None, "probes_failed": 0}


def save_state(st):
    os.makedirs(os.path.dirname(STATE), exist_ok=True)
    json.dump(st, open(STATE, "w"), indent=1)


def probe_once():
    """Single cheap read against the failing endpoint. Returns True on recovery."""
    try:
        r = subprocess.run(
            ["facebook-cli", "groups", "posts", "--group-id", PROBE_GROUP_ID,
             "--sort-by", "NEW_POSTS", "--limit", "1"],
            capture_output=True, text=True, timeout=60)
    except Exception:
        return False
    if r.returncode != 0:
        return False
    try:
        d = json.loads(r.stdout)
    except Exception:
        return False
    posts = d.get("posts") or d.get("data") or []
    return isinstance(posts, list)  # any well-formed list = endpoint alive


def main():
    args = sys.argv[1:]
    if args[:1] == ["--record-outcome"]:
        outcome = args[1] if len(args) > 1 else ""
        st = load_state()
        if outcome == "ok":
            st = {"consecutive_not_attempted": 0, "signature": None,
                  "last_probe_at": st.get("last_probe_at"), "probes_failed": 0}
        elif outcome == "stefi-outage":
            st["consecutive_not_attempted"] = st.get("consecutive_not_attempted", 0) + 1
            st["signature"] = KNOWN_SIG
        else:  # any other failure mode: do not accumulate into the stefi degraded path
            st["consecutive_not_attempted"] = 0
            st["signature"] = None
        save_state(st)
        print(json.dumps({"recorded": outcome, "state": st}))
        return 0

    st = load_state()
    if not (st.get("consecutive_not_attempted", 0) >= DEGRADED_AFTER
            and st.get("signature") == KNOWN_SIG):
        print(json.dumps({"probe": "not_needed", "state": st}))
        return 0

    ok = probe_once()
    st["last_probe_at"] = datetime.now(timezone.utc).isoformat()
    if ok:
        save_state({"consecutive_not_attempted": 0, "signature": None,
                    "last_probe_at": st["last_probe_at"], "probes_failed": 0})
        print(json.dumps({"probe": "ok", "note": "endpoint recovered; resume full discovery"}))
        return 0
    st["probes_failed"] = st.get("probes_failed", 0) + 1
    save_state(st)
    print(json.dumps({"probe": "failed", "note": "outage continues; skip discovery this pass",
                      "state": st}))
    return 2


if __name__ == "__main__":
    sys.exit(main())
