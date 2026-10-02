#!/bin/bash
# Pass 106 (ig-20260922-2301) LIGHT-MODE discovery runner, 23:01 MDT scheduled run.
# LIGHT MODE per yield-cadence: genuine-empty streak is 5 (passes 101-105 all
# ELIGIBILITY_EMPTY) -> discovery-only at half breadth (8 queries vs the
# 16-query full breadth); Phase B executes only if eligible candidates appear.
# Interval already stretched 2h -> 4h in pass 105; current schedule matches
# that band, no cron.update this pass.
# Nolan's 2026-09-21 directive (any local business owner with a business account
# eligible, trades stay priority; tiers broaden SLOWLY outward: Tier 1 first).
# 8 fresh queries vs passes 90-105.
# Skip list: 394 handles (ig-skip-list-20260922-2101.json, post pass 105).
# ig-discover.js (fixed 2026-09-21): vetting haystack = handle + header + full
# body-text fallback. Standing Phase-A2: CLI-verify gate-passed handles
# (instagram-cli user-profile country gate, then posts --username for post URL).
set -u
PIGFB="$HOME/workspace/pig-fb"
SRC="$HOME/workspace/goals/ping-social-outreach-campaign/hidden_files/engagement-passes"
TS="20260922-2301"

source "$PIGFB/browser-lock.sh"
browser_lock_acquire ig "ig-pass106-discovery" || { echo "LOCK_FAILED"; exit 2; }
echo "LOCK_HELD"

python3 - "$SRC/ig-skip-list-20260922-2101.json" <<'EOF'
import json, sys
src = sys.argv[1]
skip = json.load(open(src))
strategies = {
    "tradecity": ["fruita roofer", "montrose handyman",
                  "grand junction painter"],
    "hashtag":   ["#fruitaroofer", "#970garagedoor"],
    "bizlocal":  ["montrose coffee", "fruita bakery",
                  "delta salon"],
}
base = src.rsplit("/", 1)[0]
for name, queries in strategies.items():
    path = f"{base}/ig106-discover-{name}-20260922-2301.json"
    json.dump({"queries": queries, "skip": skip, "maxProfiles": 16}, open(path, "w"))
    print("WROTE", path, len(queries), "queries")
EOF

for s in tradecity hashtag bizlocal; do
  JOB="$SRC/ig106-discover-$s-20260922-2301.json"
  echo "=== START $s ==="
  "$PIGFB/run_ig_discover.sh" "$JOB" > "$JOB.stdout.log" 2>&1
  echo "exit=$? strategy=$s"
  tail -c 400 "$JOB.stdout.log"; echo
done
echo "ALL_STRATEGIES_DONE"
