#!/bin/bash
# Pass 110 (ig-20260923-1501) LIGHT-MODE discovery runner, 15:01 MDT scheduled run.
# LIGHT MODE per yield-cadence: genuine-empty streak is 7 (passes 101-106, 109
# ELIGIBILITY_EMPTY; passes 107/108 were TEMPORARY_FAILURE/worker-death, not
# genuine-empty) -> discovery-only at half breadth (8 queries vs the 16-query
# full breadth); Phase B executes only if eligible candidates appear.
# Interval stretched 2h -> 4h in pass 105; schedule at interval@4h matches the
# 5+ streak band, no cron.update at run start.
# Nolan's 2026-09-21 directive (any local business owner with a business account
# eligible, trades stay priority; tiers broaden SLOWLY outward: Tier 1 first).
# 8 fresh queries vs passes 90-109 (deduped against the Strategy lines in
# instagram-engagement.md and pass 107/108 runner queries).
# Skip list: 413 handles (ig-skip-list-20260923-1101.json, post pass 109).
# ig-discover.js (fixed 2026-09-21): vetting haystack = handle + header + full
# body-text fallback. Standing Phase-A2: CLI-verify gate-passed handles
# (instagram-cli user-profile country gate, then posts --username for post URL).
set -u
PIGFB="$HOME/workspace/pig-fb"
SRC="$HOME/workspace/goals/ping-social-outreach-campaign/hidden_files/engagement-passes"
TS="20260923-1501"

source "$PIGFB/browser-lock.sh"
browser_lock_acquire ig "ig-pass110-discovery" || { echo "LOCK_FAILED"; exit 2; }
echo "LOCK_HELD"

cp "$SRC/ig-skip-list-20260923-1101.json" "$SRC/ig-skip-list-20260923-1501.json"

python3 - "$SRC/ig-skip-list-20260923-1501.json" <<'EOF'
import json, sys
src = sys.argv[1]
skip = json.load(open(src))
strategies = {
    "tradecity": ["grand junction pest control", "montrose concrete",
                  "delta fencing"],
    "hashtag":   ["#970solar", "#970cleaning"],
    "bizlocal":  ["grand junction nail salon", "montrose cafe",
                  "delta coffee"],
}
base = src.rsplit("/", 1)[0]
for name, queries in strategies.items():
    path = f"{base}/ig110-discover-{name}-20260923-1501.json"
    json.dump({"queries": queries, "skip": skip, "maxProfiles": 16}, open(path, "w"))
    print("WROTE", path, len(queries), "queries")
EOF

for s in tradecity hashtag bizlocal; do
  JOB="$SRC/ig110-discover-$s-20260923-1501.json"
  echo "=== START $s ==="
  "$PIGFB/run_ig_discover.sh" "$JOB" > "$JOB.stdout.log" 2>&1
  echo "exit=$? strategy=$s"
  tail -c 400 "$JOB.stdout.log"; echo
done
echo "ALL_STRATEGIES_DONE"
