#!/bin/bash
# Pass 100 (ig-20260922-0901) BROADENED discovery runner.
# Nolan's 2026-09-21 directive (any local business owner with a business account
# eligible, trades stay priority; tiers broaden SLOWLY outward: Tier 1 first,
# Tier 2 slow fill). Full breadth: genuine-empty streak=0 after pass 99
# SUCCESS_ACTION (light mode needs 3, stretch needs 5). 16 fresh queries vs
# passes 96/98/99.
# Skip list: 280 handles (ig-skip-list-20260922-0701.json, post pass 99).
# ig-discover.js (fixed 2026-09-21): vetting haystack = handle + header + full
# body-text fallback. Standing Phase-A2: CLI-verify gate-passed handles
# (instagram-cli user-profile country gate, then posts --username for post URL).
set -u
PIGFB="$HOME/workspace/pig-fb"
SRC="$HOME/workspace/goals/ping-social-outreach-campaign/hidden_files/engagement-passes"
TS="20260922-0901"

source "$PIGFB/browser-lock.sh"
browser_lock_acquire ig "ig-pass100-discovery" || { echo "LOCK_FAILED"; exit 2; }
echo "LOCK_HELD"

python3 - "$SRC/ig-skip-list-20260922-0701.json" <<'EOF'
import json, sys
src = sys.argv[1]
skip = json.load(open(src))
strategies = {
    "tradecity": ["clifton plumber", "loma electrician",
                  "collbran tree service", "mack hvac",
                  "de beque plumber", "fruita garage door"],
    "hashtag":   ["#970garagedoor", "#970concrete", "#970tree",
                  "#palisadehvac", "#970fence"],
    "bizlocal":  ["grand junction cafe", "delta coffee shop", "rifle restaurant",
                  "carbondale coffee", "montrose bakery"],
}
base = src.rsplit("/", 1)[0]
for name, queries in strategies.items():
    path = f"{base}/ig100-discover-{name}-20260922-0901.json"
    json.dump({"queries": queries, "skip": skip, "maxProfiles": 16}, open(path, "w"))
    print("WROTE", path, len(queries), "queries")
EOF

for s in tradecity hashtag bizlocal; do
  JOB="$SRC/ig100-discover-$s-20260922-0901.json"
  echo "=== START $s ==="
  "$PIGFB/run_ig_discover.sh" "$JOB" > "$JOB.stdout.log" 2>&1
  echo "exit=$? strategy=$s"
  tail -c 400 "$JOB.stdout.log"; echo
done
echo "ALL_STRATEGIES_DONE"
