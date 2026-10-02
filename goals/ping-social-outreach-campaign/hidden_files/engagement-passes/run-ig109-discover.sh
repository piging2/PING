#!/bin/bash
# Pass 109 (ig-20260923-1101) LIGHT-MODE discovery runner, 11:01 MDT scheduled run.
# LIGHT MODE per yield-cadence: genuine-empty streak is 6 (passes 101-106 all
# ELIGIBILITY_EMPTY; passes 107/108 died on first strategy with 0-byte logs,
# classified TEMPORARY_FAILURE/worker-death, not genuine-empty) ->
# discovery-only at half breadth (8 queries vs the 16-query full breadth);
# Phase B executes only if eligible candidates appear.
# Interval stretched 2h -> 4h in pass 105; schedule at interval@4h matches the
# 5+ streak band, no cron.update at run start.
# Nolan's 2026-09-21 directive (any local business owner with a business account
# eligible, trades stay priority; tiers broaden SLOWLY outward: Tier 1 first).
# 8 fresh queries vs passes 90-108 (deduped against the Strategy lines in
# instagram-engagement.md and pass 107/108 runner queries).
# Skip list: 399 handles (ig-skip-list-20260923-0701.json, post pass 106;
# passes 107/108 died before any skip update).
# ig-discover.js (fixed 2026-09-21): vetting haystack = handle + header + full
# body-text fallback. Standing Phase-A2: CLI-verify gate-passed handles
# (instagram-cli user-profile country gate, then posts --username for post URL).
set -u
PIGFB="$HOME/workspace/pig-fb"
SRC="$HOME/workspace/goals/ping-social-outreach-campaign/hidden_files/engagement-passes"
TS="20260923-1101"

source "$PIGFB/browser-lock.sh"
browser_lock_acquire ig "ig-pass109-discovery" || { echo "LOCK_FAILED"; exit 2; }
echo "LOCK_HELD"

cp "$SRC/ig-skip-list-20260923-0701.json" "$SRC/ig-skip-list-20260923-1101.json"

python3 - "$SRC/ig-skip-list-20260923-1101.json" <<'EOF'
import json, sys
src = sys.argv[1]
skip = json.load(open(src))
strategies = {
    "tradecity": ["rifle tree service", "loma painter",
                  "clifton garage door"],
    "hashtag":   ["#970concrete", "#970pestcontrol"],
    "bizlocal":  ["rifle bakery", "carbondale coffee",
                  "clifton bakery"],
}
base = src.rsplit("/", 1)[0]
for name, queries in strategies.items():
    path = f"{base}/ig109-discover-{name}-20260923-1101.json"
    json.dump({"queries": queries, "skip": skip, "maxProfiles": 16}, open(path, "w"))
    print("WROTE", path, len(queries), "queries")
EOF

for s in tradecity hashtag bizlocal; do
  JOB="$SRC/ig109-discover-$s-20260923-1101.json"
  echo "=== START $s ==="
  "$PIGFB/run_ig_discover.sh" "$JOB" > "$JOB.stdout.log" 2>&1
  echo "exit=$? strategy=$s"
  tail -c 400 "$JOB.stdout.log"; echo
done
echo "ALL_STRATEGIES_DONE"
