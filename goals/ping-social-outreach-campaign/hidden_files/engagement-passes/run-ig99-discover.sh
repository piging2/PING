#!/bin/bash
# Pass 99 (ig-20260922-0701) BROADENED discovery runner.
# Nolan's 2026-09-21 directive (any local business owner with a business account
# eligible, trades stay priority; tiers broaden SLOWLY outward: Tier 1 first,
# Tier 2 slow fill). Full breadth: streak=2 genuine-empty (light mode needs 3,
# stretch needs 5). 16 fresh queries vs passes 96/98.
# Skip list: 270 handles (ig-skip-list-20260922-0505.json, post pass 98).
# ig-discover.js (fixed 2026-09-21): vetting haystack = handle + header + full
# body-text fallback. Standing Phase-A2: CLI-verify gate-passed handles
# (instagram-cli user-profile country gate, then posts --username for post URL).
set -u
PIGFB="$HOME/workspace/pig-fb"
SRC="$HOME/workspace/goals/ping-social-outreach-campaign/hidden_files/engagement-passes"
TS="20260922-0701"

source "$PIGFB/browser-lock.sh"
browser_lock_acquire ig "ig-pass99-discovery" || { echo "LOCK_FAILED"; exit 2; }
echo "LOCK_HELD"

python3 - "$SRC/ig-skip-list-20260922-0505.json" <<'EOF'
import json, sys
src = sys.argv[1]
skip = json.load(open(src))
strategies = {
    "tradecity": ["grand junction electrician", "fruita hvac",
                  "palisade plumber", "delta roofer",
                  "montrose landscaper", "carbondale painter"],
    "hashtag":   ["#970hvac", "#gjroofer", "#970electrician",
                  "#gjlandscaper", "#westerncolorado"],
    "bizlocal":  ["paonia coffee", "hotchkiss restaurant", "cedaredge salon",
                  "olathe coffee", "new castle bakery"],
}
base = src.rsplit("/", 1)[0]
for name, queries in strategies.items():
    path = f"{base}/ig99-discover-{name}-20260922-0701.json"
    json.dump({"queries": queries, "skip": skip, "maxProfiles": 16}, open(path, "w"))
    print("WROTE", path, len(queries), "queries")
EOF

for s in tradecity hashtag bizlocal; do
  JOB="$SRC/ig99-discover-$s-20260922-0701.json"
  echo "=== START $s ==="
  "$PIGFB/run_ig_discover.sh" "$JOB" > "$JOB.stdout.log" 2>&1
  echo "exit=$? strategy=$s"
  tail -c 400 "$JOB.stdout.log"; echo
done
echo "ALL_STRATEGIES_DONE"
