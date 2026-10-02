#!/usr/bin/env python3
"""Deterministic LinkedIn engagement eligibility filter.

Candidate + action + intent-ledger history + weekly cap -> ELIGIBLE/DROPPED.

Guard rails (Nolan binding 2026-10-02):
  - Never-reengage: any URL with a terminal ledger intent (EXECUTED/FAILED/
    UNKNOWN_EXECUTION) or listed in linkedin-engagement.md never-re-engage
    sections is dropped, always.
  - Per-pass caps: 15 likes + up to 2 connection invites per pass.
  - Weekly cap: 100 invites/week via linkedin-weekly-cap.py; connections stop
    when the week budget is spent (likes continue).
  - No DMs, no messages. Connect actions target relevant local business people.

Usage:
  linkedin-eligibility.py --candidates candidates.json --out dispatch.json

Candidates JSON: [{"url": "...", "type": "like"|"connect", "name": "..."}]
Output: {"actions": [...], "minDelaySec": 90, "maxDelaySec": 240}

Exit 0: dispatch written (may be likes-only or empty-but-valid).
Exit 2: zero eligible candidates -> EXPANDING POOL LAW (Nolan 2026-10-02):
  the pass must expand discovery, not dispatch empty. The cron body treats
  exit 2 as a signal to widen the candidate pool.
Exit 1: hard error (fail closed).
"""

import argparse
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
LEDGER = os.path.join(HERE, "action-intent-ledger.py")
WEEKLY_CAP = os.path.join(HERE, "linkedin-weekly-cap.py")
LOG_MD = os.path.join(HERE, "linkedin-engagement.md")
ACCOUNT = "PING Social"

MAX_LIKES_PER_PASS = 15
MAX_CONNECTS_PER_PASS = 2
MIN_DELAY, MAX_DELAY = 90, 240


def _md_blocked_urls():
    """URLs in the never-re-engage sections of linkedin-engagement.md."""
    blocked = set()
    if not os.path.exists(LOG_MD):
        return blocked
    text = open(LOG_MD).read()
    # Every bullet URL under a "Never re-engage" heading stays blocked forever.
    for m in re.finditer(r"https://www\.linkedin\.com/[^\s\)]+", text):
        url = m.group(0).rstrip(".,)")
        # Only treat URLs that appear after a Never re-engage heading as
        # permanent blocks; scan is section-aware below.
        blocked.add(url)
    # Section-aware pass: keep only URLs inside never-re-engage sections.
    sections = re.split(r"^## ", text, flags=re.M)
    keep = set()
    for s in sections:
        if s.lower().startswith("never re-engage"):
            for m in re.finditer(r"https://www\.linkedin\.com/[^\s\)]+", s):
                keep.add(m.group(0).rstrip(".,)"))
    return keep


def _ledger_blocked(url, action):
    """True if the intent ledger already holds a non-refused intent for url."""
    try:
        r = subprocess.run(
            [sys.executable, LEDGER, "check", "--platform", "linkedin",
             "--account", ACCOUNT, "--action", action, "--url", url],
            capture_output=True, text=True, timeout=30)
        if r.returncode != 0:
            # Ledger unreadable -> fail CLOSED: treat as blocked.
            return True
        d = json.loads(r.stdout or "{}")
        return int(d.get("matches", 0)) > 0
    except Exception:
        return True  # fail closed


def _weekly_remaining():
    try:
        r = subprocess.run([sys.executable, WEEKLY_CAP, "check"],
                           capture_output=True, text=True, timeout=15)
        return int(r.stdout.strip()) if r.returncode == 0 else 0
    except Exception:
        return 0  # fail closed


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--candidates", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()

    try:
        cands = json.load(open(a.candidates))
    except Exception as e:
        print(f"ELIGIBILITY-ERROR cannot read candidates: {e}", file=sys.stderr)
        return 1
    if not isinstance(cands, list):
        print("ELIGIBILITY-ERROR candidates must be a list", file=sys.stderr)
        return 1

    md_blocked = _md_blocked_urls()
    weekly_remaining = _weekly_remaining()
    connect_budget = min(MAX_CONNECTS_PER_PASS, weekly_remaining)
    like_budget = MAX_LIKES_PER_PASS

    eligible, dropped = [], []
    # Deterministic order: sort by (type, url).
    for c in sorted(cands, key=lambda x: (x.get("type", ""), x.get("url", ""))):
        url = c.get("url", "")
        atype = c.get("type", "")
        if atype not in ("like", "connect"):
            dropped.append((url, "BAD_TYPE")); continue
        if not url.startswith("https://www.linkedin.com/"):
            dropped.append((url, "BAD_URL")); continue
        if url in md_blocked:
            dropped.append((url, "NEVER_REENGAGE_MD")); continue
        if _ledger_blocked(url, atype):
            dropped.append((url, "NEVER_REENGAGE_LEDGER")); continue
        if atype == "like" and like_budget <= 0:
            dropped.append((url, "PASS_LIKE_CAP")); continue
        if atype == "connect" and connect_budget <= 0:
            dropped.append((url, "WEEKLY_OR_PASS_CONNECT_CAP")); continue
        eligible.append({"type": atype, "url": url,
                         "name": c.get("name", "")})
        if atype == "like":
            like_budget -= 1
        else:
            connect_budget -= 1

    likes = sum(1 for e in eligible if e["type"] == "like")
    connects = sum(1 for e in eligible if e["type"] == "connect")
    dispatch = {"actions": eligible,
                "minDelaySec": MIN_DELAY, "maxDelaySec": MAX_DELAY}
    with open(a.out, "w") as f:
        json.dump(dispatch, f, indent=1)

    print(f"ELIGIBLE likes={likes} connects={connects} "
          f"(weekly_remaining={weekly_remaining})")
    for url, reason in dropped:
        print(f"DROPPED {reason} {url}")

    if not eligible:
        print("EXPAND_POOL: zero eligible candidates; widen discovery "
              "(expanding pool law, Nolan 2026-10-02).", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
