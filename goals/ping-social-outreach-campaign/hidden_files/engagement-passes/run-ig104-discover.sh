#!/bin/bash
# Pass 104 (ig-20260922-1901) LIGHT-MODE discovery runner, 19:01 MDT scheduled run.
# LIGHT MODE per yield-cadence: 3 consecutive genuine-empty passes (101/102/103)
# -> discovery-only at half breadth (8 queries vs the 16-query full breadth);
# Phase B executes only if eligible candidates appear.
# Nolan's 2026-09-21 directive (any local business owner with a business account
# eligible, trades stay priority; tiers broaden SLOWLY outward: Tier 1 first).
# 8 fresh queries vs passes 96/98/99/100/101/102/103.
# Skip list: 367 handles (ig-skip-list-20260922-1701.json, post pass 103).
# ig-discover.js (fixed 2026-09-21): vetting haystack = handle + header + full
# body-text fallback. Standing Phase-A2: CLI-verify gate-passed handles
# (instagram-cli user-profile country gate, then posts --username for post URL).
set -u
PIGFB="$HOME/workspace/pig-fb"
SRC="$HOME/workspace/goals/ping-social-outreach-campaign/hidden_files/engagement-passes"
TS="20260922-1901"

source "$PIGFB/browser-lock.sh"
browser_lock_acquire ig "ig-pass104-discovery" || { echo "LOCK_FAILED"; exit 2; }
echo "LOCK_HELD"

python3 - "$SRC/ig-skip-list-20260922-1701.json" <<'EOF'
import json, sys
src = sys.argv[1]
skip = json.load(open(src))
strategies = {
    "tradecity": ["montrose electrician", "delta plumber",
                  "grand junction landscaper"],
    "hashtag":   ["#gjcontractor", "#970smallbusiness"],
    "bizlocal":  ["delta bakery", "montrose gym",
                  "fruita coffee"],
}
base = src.rsplit("/", 1)[0]
for name, queries in strategies.items():
    path = f"{base}/ig104-discover-{name}-20260922-1901.json"
    json.dump({"queries": queries, "skip": skip, "maxProfiles": 16}, open(path, "w"))
    print("WROTE", path, len(queries), "queries")
EOF

for s in tradecity hashtag bizlocal; do
  JOB="$SRC/ig104-discover-$s-20260922-1901.json"
  echo "=== START $s ==="
  "$PIGFB/run_ig_discover.sh" "$JOB" > "$JOB.stdout.log" 2>&1
  echo "exit=$? strategy=$s"
  tail -c 400 "$JOB.stdout.log"; echo
done
echo "ALL_STRATEGIES_DONE"
