#!/bin/bash
# Pass 114 (ig-20260923-2301) LIGHT-MODE discovery runner, 23:01 MDT scheduled run.
# LIGHT MODE per yield-cadence: genuine-empty streak is 11 (passes 101-106,
# 109, 110, 111, 112, 113 ELIGIBILITY_EMPTY; passes 107/108 were
# TEMPORARY_FAILURE and did not count) -> discovery-only at half breadth
# (8 queries vs the 16-query full breadth); Phase B executes only if eligible
# candidates appear.
# Interval: 2h baseline per the 2026-09-23 CEO MODE directive (yield-driven
# stretch lifted; verified at run start: schedule at interval@2h, matches).
# Nolan's 2026-09-21 directive (any local business owner with a business account
# eligible, trades stay priority; tiers broaden SLOWLY outward: Tier 1 first).
# 8 fresh queries vs passes 90-113 (deduped against the Strategy lines in
# instagram-engagement.md): tradecity "de beque electrician" "loma roofer"
# "mack plumber"; hashtags "#970handyman" "#970remodel";
# bizlocal "grand junction pizza" "montrose bookstore" "delta diner".
# Skip list: 452 handles (ig-skip-list-20260923-2101.json, post pass 113).
# ig-discover.js (fixed 2026-09-21): vetting haystack = handle + header + full
# body-text fallback. Standing Phase-A2: CLI-verify gate-passed handles
# (instagram-cli user-profile country gate, then posts --username for post URL).
set -u
PIGFB="$HOME/workspace/pig-fb"
SRC="$HOME/workspace/goals/ping-social-outreach-campaign/hidden_files/engagement-passes"
TS="20260923-2301"

source "$PIGFB/browser-lock.sh"
browser_lock_acquire ig "ig-pass114-discovery" || { echo "LOCK_FAILED"; exit 2; }
echo "LOCK_HELD"

cp "$SRC/ig-skip-list-20260923-2101.json" "$SRC/ig-skip-list-20260923-2301.json"

python3 - "$SRC/ig-skip-list-20260923-2301.json" <<'EOF'
import json, sys
src = sys.argv[1]
skip = json.load(open(src))
strategies = {
    "tradecity": ["de beque electrician", "loma roofer", "mack plumber"],
    "hashtag":   ["#970handyman", "#970remodel"],
    "bizlocal":  ["grand junction pizza", "montrose bookstore", "delta diner"],
}
base = src.rsplit("/", 1)[0]
for name, queries in strategies.items():
    path = f"{base}/ig114-discover-{name}-20260923-2301.json"
    json.dump({"queries": queries, "skip": skip, "maxProfiles": 16}, open(path, "w"))
    print("WROTE", path, len(queries), "queries")
EOF

for s in tradecity hashtag bizlocal; do
  JOB="$SRC/ig114-discover-$s-20260923-2301.json"
  echo "=== START $s ==="
  "$PIGFB/run_ig_discover.sh" "$JOB" > "$JOB.stdout.log" 2>&1
  echo "exit=$? strategy=$s"
  tail -c 400 "$JOB.stdout.log"; echo
done
echo "ALL_STRATEGIES_DONE"
