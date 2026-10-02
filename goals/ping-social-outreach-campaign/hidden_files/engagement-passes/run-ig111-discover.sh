#!/bin/bash
# Pass 111 (ig-20260923-1701) LIGHT-MODE discovery runner, 17:01 MDT scheduled run.
# LIGHT MODE per yield-cadence: genuine-empty streak is 8 (passes 101-106,
# 109, 110 ELIGIBILITY_EMPTY; passes 107/108 were TEMPORARY_FAILURE/worker-death,
# not genuine-empty) -> discovery-only at half breadth (8 queries vs the
# 16-query full breadth); Phase B executes only if eligible candidates appear.
# Interval: 2h baseline restored by the 2026-09-23 CEO MODE directive (the 4h
# yield-driven stretch is lifted; verified at run start: schedule at
# interval@2h, matches the band, no cron.update needed).
# Nolan's 2026-09-21 directive (any local business owner with a business account
# eligible, trades stay priority; tiers broaden SLOWLY outward: Tier 1 first).
# 8 fresh queries vs passes 90-110 (deduped against the Strategy lines in
# instagram-engagement.md): tradecity "delta electrician" "rifle plumber"
# "carbondale landscaper"; hashtags "#970barber" "#gjcoffee"; bizlocal
# "palisade bakery" "delta barber" "montrose salon".
# Skip list: 428 handles (ig-skip-list-20260923-1501.json, post pass 110).
# ig-discover.js (fixed 2026-09-21): vetting haystack = handle + header + full
# body-text fallback. Standing Phase-A2: CLI-verify gate-passed handles
# (instagram-cli user-profile country gate, then posts --username for post URL).
set -u
PIGFB="$HOME/workspace/pig-fb"
SRC="$HOME/workspace/goals/ping-social-outreach-campaign/hidden_files/engagement-passes"
TS="20260923-1701"

source "$PIGFB/browser-lock.sh"
browser_lock_acquire ig "ig-pass111-discovery" || { echo "LOCK_FAILED"; exit 2; }
echo "LOCK_HELD"

cp "$SRC/ig-skip-list-20260923-1501.json" "$SRC/ig-skip-list-20260923-1701.json"

python3 - "$SRC/ig-skip-list-20260923-1701.json" <<'EOF'
import json, sys
src = sys.argv[1]
skip = json.load(open(src))
strategies = {
    "tradecity": ["delta electrician", "rifle plumber",
                  "carbondale landscaper"],
    "hashtag":   ["#970barber", "#gjcoffee"],
    "bizlocal":  ["palisade bakery", "delta barber",
                  "montrose salon"],
}
base = src.rsplit("/", 1)[0]
for name, queries in strategies.items():
    path = f"{base}/ig111-discover-{name}-20260923-1701.json"
    json.dump({"queries": queries, "skip": skip, "maxProfiles": 16}, open(path, "w"))
    print("WROTE", path, len(queries), "queries")
EOF

for s in tradecity hashtag bizlocal; do
  JOB="$SRC/ig111-discover-$s-20260923-1701.json"
  echo "=== START $s ==="
  "$PIGFB/run_ig_discover.sh" "$JOB" > "$JOB.stdout.log" 2>&1
  echo "exit=$? strategy=$s"
  tail -c 400 "$JOB.stdout.log"; echo
done
echo "ALL_STRATEGIES_DONE"
