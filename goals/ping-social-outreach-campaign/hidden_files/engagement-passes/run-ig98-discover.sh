#!/bin/bash
# Pass 98 (ig-20260922-0505) BROADENED discovery runner.
# Nolan's 2026-09-21 directive (any local business owner with a business account
# eligible, trades stay priority; tiers broaden SLOWLY outward: Tier 1 first).
# Full breadth (16 queries, all fresh vs pass 96; pass 97 was DEPENDENCY_FAILURE
# and ran no discovery). Skip list: 249 handles (ig-skip-list-20260922-0102.json).
# ig-discover.js (fixed 2026-09-21): vetting haystack = handle + header + full
# body-text fallback. Standing Phase-A2: CLI-verify gate-passed handles
# (instagram-cli user-profile country gate, then posts --username for post URL).
set -u
PIGFB="$HOME/workspace/pig-fb"
SRC="$HOME/workspace/goals/ping-social-outreach-campaign/hidden_files/engagement-passes"
TS="20260922-0505"

source "$PIGFB/browser-lock.sh"
browser_lock_acquire ig "ig-pass98-discovery" || { echo "LOCK_FAILED"; exit 2; }
echo "LOCK_HELD"

python3 - "$SRC/ig-skip-list-20260922-0102.json" <<'EOF'
import json, sys
src = sys.argv[1]
skip = json.load(open(src))
strategies = {
    "tradecity": ["collbran hvac", "loma plumber", "clifton electrician",
                  "mack roofer", "de beque garage door", "carbondale hvac"],
    "hashtag":   ["#gjhvac", "#palisaderoofing", "#970plumber",
                  "#fruitaeats", "#grandjunctioncoffee"],
    "bizlocal":  ["palisade restaurant", "fruita coffee", "clifton auto repair",
                  "delta pet groomer", "montrose gym"],
}
base = src.rsplit("/", 1)[0]
for name, queries in strategies.items():
    path = f"{base}/ig98-discover-{name}-20260922-0505.json"
    json.dump({"queries": queries, "skip": skip, "maxProfiles": 16}, open(path, "w"))
    print("WROTE", path, len(queries), "queries")
EOF

for s in tradecity hashtag bizlocal; do
  JOB="$SRC/ig98-discover-$s-20260922-0505.json"
  echo "=== START $s ==="
  "$PIGFB/run_ig_discover.sh" "$JOB" > "$JOB.stdout.log" 2>&1
  echo "exit=$? strategy=$s"
  tail -c 400 "$JOB.stdout.log"; echo
done
echo "ALL_STRATEGIES_DONE"
