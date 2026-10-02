#!/bin/bash
# Pass 91 (ig-20260921-1701) LIGHT-MODE discovery runner.
# 3 consecutive genuine-empties (passes 88, 89, 90) -> light mode: discovery
# only at half breadth (~8 queries), Phase B executes only if eligible
# candidates appear.
set -u
PIGFB="$HOME/workspace/pig-fb"
SRC="$HOME/workspace/goals/ping-social-outreach-campaign/hidden_files/engagement-passes"
TS="20260921-1701"

source "$PIGFB/browser-lock.sh"
browser_lock_acquire ig "ig-pass91-discovery" || { echo "LOCK_FAILED"; exit 2; }
echo "LOCK_HELD"

python3 - "$SRC/ig-skip-list-20260921-1502.json" <<'EOF'
import json, sys
src = sys.argv[1]
skip = json.load(open(src))
strategies = {
    "tradecity": ["collbran hvac", "mack plumber", "de beque electrician"],
    "hashtag":   ["#grandjunctionroofing", "#riflehvac"],
    "niche":     ["chimney sweep service", "siding installation",
                  "irrigation service"],
}
base = src.rsplit("/", 1)[0]
for name, queries in strategies.items():
    path = f"{base}/ig91-discover-{name}-20260921-1701.json"
    json.dump({"queries": queries, "skip": skip, "maxProfiles": 12}, open(path, "w"))
    print("WROTE", path, len(queries), "queries")
EOF

for s in tradecity hashtag niche; do
  JOB="$SRC/ig91-discover-$s-20260921-1701.json"
  echo "=== START $s ==="
  "$PIGFB/run_ig_discover.sh" "$JOB" > "$JOB.stdout.log" 2>&1
  echo "exit=$? strategy=$s"
  tail -c 400 "$JOB.stdout.log"; echo
done
echo "ALL_STRATEGIES_DONE"
