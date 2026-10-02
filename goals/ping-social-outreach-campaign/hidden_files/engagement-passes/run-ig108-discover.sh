#!/bin/bash
# Pass 108 (ig-20260923-0701) LIGHT-MODE discovery runner, 07:01 MDT scheduled run.
# LIGHT MODE per yield-cadence: genuine-empty streak is 6 (passes 101-106 all
# ELIGIBILITY_EMPTY) -> discovery-only at half breadth (8 queries vs the
# 16-query full breadth); Phase B executes only if eligible candidates appear.
# Interval stretched 2h -> 4h in pass 105; schedule at interval@4h matches the
# 5+ streak band, no cron.update at run start.
# Nolan's 2026-09-21 directive (any local business owner with a business account
# eligible, trades stay priority; tiers broaden SLOWLY outward: Tier 1 first).
# 8 fresh queries vs passes 90-107 (deduped against the Strategy lines in
# instagram-engagement.md and pass 107's runner queries).
# Skip list: 399 handles (ig-skip-list-20260922-2301.json, post pass 106;
# pass 107 was interrupted before producing a log section, so no skip update).
# ig-discover.js (fixed 2026-09-21): vetting haystack = handle + header + full
# body-text fallback. Standing Phase-A2: CLI-verify gate-passed handles
# (instagram-cli user-profile country gate, then posts --username for post URL).
set -u
PIGFB="$HOME/workspace/pig-fb"
SRC="$HOME/workspace/goals/ping-social-outreach-campaign/hidden_files/engagement-passes"
TS="20260923-0701"

source "$PIGFB/browser-lock.sh"
browser_lock_acquire ig "ig-pass108-discovery" || { echo "LOCK_FAILED"; exit 2; }
echo "LOCK_HELD"

cp "$SRC/ig-skip-list-20260922-2301.json" "$SRC/ig-skip-list-20260923-0701.json"

python3 - "$SRC/ig-skip-list-20260923-0701.json" <<'EOF'
import json, sys
src = sys.argv[1]
skip = json.load(open(src))
strategies = {
    "tradecity": ["rifle electrician", "grand junction concrete",
                  "clifton painter"],
    "hashtag":   ["#970fencing", "#970treeservice"],
    "bizlocal":  ["grand junction barber", "palisade bakery",
                  "carbondale gym"],
}
base = src.rsplit("/", 1)[0]
for name, queries in strategies.items():
    path = f"{base}/ig108-discover-{name}-20260923-0701.json"
    json.dump({"queries": queries, "skip": skip, "maxProfiles": 16}, open(path, "w"))
    print("WROTE", path, len(queries), "queries")
EOF

for s in tradecity hashtag bizlocal; do
  JOB="$SRC/ig108-discover-$s-20260923-0701.json"
  echo "=== START $s ==="
  "$PIGFB/run_ig_discover.sh" "$JOB" > "$JOB.stdout.log" 2>&1
  echo "exit=$? strategy=$s"
  tail -c 400 "$JOB.stdout.log"; echo
done
echo "ALL_STRATEGIES_DONE"
