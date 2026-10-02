#!/bin/bash
# Pass 102 (ig-20260922-1501) BROADENED discovery runner, 15:01 MDT scheduled run.
# Nolan's 2026-09-21 directive (any local business owner with a business account
# eligible, trades stay priority; tiers broaden SLOWLY outward: Tier 1 first).
# Full breadth: genuine-empty streak = 1 (pass 101 ELIGIBILITY_EMPTY; light mode
# requires 3). 16 fresh queries vs passes 96/98/99/100/101. Skip list: 326
# handles (ig-skip-list-20260922-1301.json, post pass 101).
# ig-discover.js (fixed 2026-09-21): vetting haystack = handle + header + full
# body-text fallback. Standing Phase-A2: CLI-verify gate-passed handles
# (instagram-cli user-profile country gate, then posts --username for post URL).
set -u
PIGFB="$HOME/workspace/pig-fb"
SRC="$HOME/workspace/goals/ping-social-outreach-campaign/hidden_files/engagement-passes"
TS="20260922-1501"

source "$PIGFB/browser-lock.sh"
browser_lock_acquire ig "ig-pass102-discovery" || { echo "LOCK_FAILED"; exit 2; }
echo "LOCK_HELD"

python3 - "$SRC/ig-skip-list-20260922-1301.json" <<'EOF'
import json, sys
src = sys.argv[1]
skip = json.load(open(src))
strategies = {
    "tradecity": ["palisade electrician", "delta hvac",
                  "montrose roofer", "carbondale plumber",
                  "rifle landscaper", "collbran painter"],
    "hashtag":   ["#gjplumber", "#970roofing",
                  "#grandjunctionhvac", "#palisadecoffee",
                  "#westernslopeeats"],
    "bizlocal":  ["silt restaurant", "new castle coffee",
                  "parachute barber", "olathe salon",
                  "cedaredge bakery"],
}
base = src.rsplit("/", 1)[0]
for name, queries in strategies.items():
    path = f"{base}/ig102-discover-{name}-20260922-1501.json"
    json.dump({"queries": queries, "skip": skip, "maxProfiles": 16}, open(path, "w"))
    print("WROTE", path, len(queries), "queries")
EOF

for s in tradecity hashtag bizlocal; do
  JOB="$SRC/ig102-discover-$s-20260922-1501.json"
  echo "=== START $s ==="
  "$PIGFB/run_ig_discover.sh" "$JOB" > "$JOB.stdout.log" 2>&1
  echo "exit=$? strategy=$s"
  tail -c 400 "$JOB.stdout.log"; echo
done
echo "ALL_STRATEGIES_DONE"
