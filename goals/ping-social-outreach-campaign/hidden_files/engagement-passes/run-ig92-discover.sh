#!/bin/bash
# Pass 92 (ig-20260921-1901) LIGHT-MODE discovery runner.
# Genuine-empty streak at 4 (passes 88, 89, 90, 91) -> light mode: discovery
# only at half breadth (~8 queries), Phase B executes only if eligible
# candidates appear. If this pass is also genuine-empty, the stretch trigger
# fires (5 consecutive -> 2h to 4h interval via cron.update).
set -u
PIGFB="$HOME/workspace/pig-fb"
SRC="$HOME/workspace/goals/ping-social-outreach-campaign/hidden_files/engagement-passes"
TS="20260921-1901"

source "$PIGFB/browser-lock.sh"
browser_lock_acquire ig "ig-pass92-discovery" || { echo "LOCK_FAILED"; exit 2; }
echo "LOCK_HELD"

python3 - "$SRC/ig-skip-list-20260921-1701.json" <<'EOF'
import json, sys
src = sys.argv[1]
skip = json.load(open(src))
strategies = {
    "tradecity": ["loma electrician", "palisade hvac", "montrose electrician"],
    "hashtag":   ["#palisadeplumbing", "#grandjunctionhvac"],
    "niche":     ["water heater installation", "garage door repair",
                  "septic service"],
}
base = src.rsplit("/", 1)[0]
for name, queries in strategies.items():
    path = f"{base}/ig92-discover-{name}-20260921-1901.json"
    json.dump({"queries": queries, "skip": skip, "maxProfiles": 12}, open(path, "w"))
    print("WROTE", path, len(queries), "queries")
EOF

for s in tradecity hashtag niche; do
  JOB="$SRC/ig92-discover-$s-20260921-1901.json"
  echo "=== START $s ==="
  "$PIGFB/run_ig_discover.sh" "$JOB" > "$JOB.stdout.log" 2>&1
  echo "exit=$? strategy=$s"
  tail -c 400 "$JOB.stdout.log"; echo
done
echo "ALL_STRATEGIES_DONE"
