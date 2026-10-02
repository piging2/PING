#!/bin/bash
# Pass 105 (ig-20260922-2101) LIGHT-MODE discovery runner, 21:01 MDT scheduled run.
# LIGHT MODE per yield-cadence: genuine-empty streak is 4 (passes 101/102/103/104)
# -> discovery-only at half breadth (8 queries vs the 16-query full breadth);
# Phase B executes only if eligible candidates appear. Interval stretch needs 5.
# Nolan's 2026-09-21 directive (any local business owner with a business account
# eligible, trades stay priority; tiers broaden SLOWLY outward: Tier 1 first).
# 8 fresh queries vs passes 90-104.
# Skip list: 381 handles (ig-skip-list-20260922-1901.json, post pass 104).
# ig-discover.js (fixed 2026-09-21): vetting haystack = handle + header + full
# body-text fallback. Standing Phase-A2: CLI-verify gate-passed handles
# (instagram-cli user-profile country gate, then posts --username for post URL).
set -u
PIGFB="$HOME/workspace/pig-fb"
SRC="$HOME/workspace/goals/ping-social-outreach-campaign/hidden_files/engagement-passes"
TS="20260922-2101"

source "$PIGFB/browser-lock.sh"
browser_lock_acquire ig "ig-pass105-discovery" || { echo "LOCK_FAILED"; exit 2; }
echo "LOCK_HELD"

python3 - "$SRC/ig-skip-list-20260922-1901.json" <<'EOF'
import json, sys
src = sys.argv[1]
skip = json.load(open(src))
strategies = {
    "tradecity": ["carbondale electrician", "rifle roofer",
                  "palisade handyman"],
    "hashtag":   ["#grandjunctionsmallbiz", "#970autorepair"],
    "bizlocal":  ["grand junction bakery", "palisade coffee",
                  "clifton salon"],
}
base = src.rsplit("/", 1)[0]
for name, queries in strategies.items():
    path = f"{base}/ig105-discover-{name}-20260922-2101.json"
    json.dump({"queries": queries, "skip": skip, "maxProfiles": 16}, open(path, "w"))
    print("WROTE", path, len(queries), "queries")
EOF

for s in tradecity hashtag bizlocal; do
  JOB="$SRC/ig105-discover-$s-20260922-2101.json"
  echo "=== START $s ==="
  "$PIGFB/run_ig_discover.sh" "$JOB" > "$JOB.stdout.log" 2>&1
  echo "exit=$? strategy=$s"
  tail -c 400 "$JOB.stdout.log"; echo
done
echo "ALL_STRATEGIES_DONE"
