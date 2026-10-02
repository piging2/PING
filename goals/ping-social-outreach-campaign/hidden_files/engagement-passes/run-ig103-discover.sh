#!/bin/bash
# Pass 103 (ig-20260922-1701) BROADENED discovery runner, 17:01 MDT scheduled run.
# Nolan's 2026-09-21 directive (any local business owner with a business account
# eligible, trades stay priority; tiers broaden SLOWLY outward: Tier 1 first).
# Full breadth: genuine-empty streak = 2 (passes 101/102 ELIGIBILITY_EMPTY;
# light mode requires 3). 16 fresh queries vs passes 96/98/99/100/101/102.
# Skip list: 347 handles (ig-skip-list-20260922-1501.json, post pass 102).
# ig-discover.js (fixed 2026-09-21): vetting haystack = handle + header + full
# body-text fallback. Standing Phase-A2: CLI-verify gate-passed handles
# (instagram-cli user-profile country gate, then posts --username for post URL).
set -u
PIGFB="$HOME/workspace/pig-fb"
SRC="$HOME/workspace/goals/ping-social-outreach-campaign/hidden_files/engagement-passes"
TS="20260922-1701"

source "$PIGFB/browser-lock.sh"
browser_lock_acquire ig "ig-pass103-discovery" || { echo "LOCK_FAILED"; exit 2; }
echo "LOCK_HELD"

python3 - "$SRC/ig-skip-list-20260922-1501.json" <<'EOF'
import json, sys
src = sys.argv[1]
skip = json.load(open(src))
strategies = {
    "tradecity": ["grand junction roofer", "fruita electrician",
                  "palisade painter", "delta tree service",
                  "montrose plumber", "clifton roofer"],
    "hashtag":   ["#970painter", "#970landscaper",
                  "#970carwash", "#grandjunctioneats",
                  "#970coffee"],
    "bizlocal":  ["clifton coffee", "loma restaurant",
                  "mack cafe", "de beque bakery",
                  "rifle salon"],
}
base = src.rsplit("/", 1)[0]
for name, queries in strategies.items():
    path = f"{base}/ig103-discover-{name}-20260922-1701.json"
    json.dump({"queries": queries, "skip": skip, "maxProfiles": 16}, open(path, "w"))
    print("WROTE", path, len(queries), "queries")
EOF

for s in tradecity hashtag bizlocal; do
  JOB="$SRC/ig103-discover-$s-20260922-1701.json"
  echo "=== START $s ==="
  "$PIGFB/run_ig_discover.sh" "$JOB" > "$JOB.stdout.log" 2>&1
  echo "exit=$? strategy=$s"
  tail -c 400 "$JOB.stdout.log"; echo
done
echo "ALL_STRATEGIES_DONE"
