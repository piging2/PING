#!/bin/bash
# Pass 90 (ig-20260921-1502) discovery runner: holds the ig browser lock and
# runs 3 read-only discovery strategy jobs sequentially.
set -u
PIGFB="$HOME/workspace/pig-fb"
SRC="$HOME/workspace/goals/ping-social-outreach-campaign/hidden_files/engagement-passes"
TS="20260921-1502"

source "$PIGFB/browser-lock.sh"
browser_lock_acquire ig "ig-pass90-discovery" || { echo "LOCK_FAILED"; exit 2; }
echo "LOCK_HELD"

python3 - "$SRC/ig-skip-list-20260921-1914.json" <<'EOF'
import json, sys
src = sys.argv[1]
skip = json.load(open(src))
strategies = {
    "tradecity": ["delta plumber", "clifton electrician", "fruita hvac",
                  "montrose roofer", "loma plumber", "de beque plumber"],
    "hashtag":   ["#970hvac", "#grandjunctionelectrician", "#palisaderoofing",
                  "#rifleelectrician", "#cliftonplumber"],
    "niche":     ["swimming pool service", "tree removal service",
                  "drywall installation", "flooring installation",
                  "fence contractor"],
}
base = src.rsplit("/", 1)[0]
for name, queries in strategies.items():
    path = f"{base}/ig90-discover-{name}-20260921-1502.json"
    json.dump({"queries": queries, "skip": skip, "maxProfiles": 16}, open(path, "w"))
    print("WROTE", path, len(queries), "queries")
EOF

for s in tradecity hashtag niche; do
  JOB="$SRC/ig90-discover-$s-20260921-1502.json"
  echo "=== START $s ==="
  "$PIGFB/run_ig_discover.sh" "$JOB" > "$JOB.stdout.log" 2>&1
  echo "exit=$? strategy=$s"
  tail -c 400 "$JOB.stdout.log"; echo
done
echo "ALL_STRATEGIES_DONE"
