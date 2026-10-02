#!/bin/bash
# Pass 93 (ig-20260921-1930) BROADENED retry discovery runner.
# Nolan's 2026-09-21 directive ("there should always be eligible candidates"; refined
# same day): Tier 2 geography + ANY local business owner with a business account
# eligible (trades stay priority). Full breadth (16 queries), light mode exited.
# Skip list rebuilt for the broadened scope: engaged handles (guard history, 136)
# + 'no posts' hard-keep (48) = 184. Old geography/trade rejects are re-vettable.
# ig-discover.js broadened: BUSINESS keyword gate replaces TRADE-only gate.
set -u
PIGFB="$HOME/workspace/pig-fb"
SRC="$HOME/workspace/goals/ping-social-outreach-campaign/hidden_files/engagement-passes"
TS="20260921-1930"

source "$PIGFB/browser-lock.sh"
browser_lock_acquire ig "ig-pass93-discovery" || { echo "LOCK_FAILED"; exit 2; }
echo "LOCK_HELD"

python3 - "$SRC/ig-skip-list-20260921-1930.json" <<'EOF'
import json, sys
src = sys.argv[1]
skip = json.load(open(src))
strategies = {
    "tradecity": ["grand junction plumber", "durango electrician", "montrose hvac",
                  "glenwood springs roofer", "aspen painter", "steamboat springs plumber"],
    "hashtag":   ["#aspenplumbing", "#glenwoodhvac", "#steamboatroofing",
                  "#durangoplumber", "#montroseelectrician"],
    "bizlocal":  ["durango restaurant", "glenwood springs auto repair", "aspen salon",
                  "steamboat springs coffee", "grand junction boutique"],
}
base = src.rsplit("/", 1)[0]
for name, queries in strategies.items():
    path = f"{base}/ig93-discover-{name}-20260921-1930.json"
    json.dump({"queries": queries, "skip": skip, "maxProfiles": 16}, open(path, "w"))
    print("WROTE", path, len(queries), "queries")
EOF

for s in tradecity hashtag bizlocal; do
  JOB="$SRC/ig93-discover-$s-20260921-1930.json"
  echo "=== START $s ==="
  "$PIGFB/run_ig_discover.sh" "$JOB" > "$JOB.stdout.log" 2>&1
  echo "exit=$? strategy=$s"
  tail -c 400 "$JOB.stdout.log"; echo
done
echo "ALL_STRATEGIES_DONE"
