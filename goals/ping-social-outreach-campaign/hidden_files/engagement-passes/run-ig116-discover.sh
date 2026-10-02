#!/bin/bash
# Pass 116 (ig-20260924-0301) LIGHT-MODE discovery runner, 03:01 MDT scheduled run.
# LIGHT MODE per yield-cadence: genuine-empty streak is 13 (passes 101-106,
# 109, 110, 111, 112, 113, 114, 115 ELIGIBILITY_EMPTY; passes 107/108 were
# TEMPORARY_FAILURE and did not count) -> discovery-only at half breadth
# (8 queries vs the 16-query full breadth); Phase B executes only if eligible
# candidates appear.
# Interval: 2h baseline per the 2026-09-23 CEO MODE directive (yield-driven
# stretch lifted; verified at run start: schedule at interval@2h, matches).
# No cron.update (CEO MODE 2h baseline stands per passes 111-115 precedent).
# Nolan's 2026-09-21 directive (any local business owner with a business account
# eligible, trades stay priority; tiers broaden SLOWLY outward: Tier 1 first).
# 8 fresh queries vs passes 90-115 (deduped against the Strategy lines in
# instagram-engagement.md): tradecity "palisade electrician" "fruita garage door"
# "rifle electrician"; hashtags "#970locksmith" "#gjdonuts";
# bizlocal "clifton pizza" "rifle gym" "montrose bike shop".
# Skip list: 477 handles (ig-skip-list-20260924-0101.json, post pass 115).
# ig-discover.js (fixed 2026-09-21): vetting haystack = handle + header + full
# body-text fallback. Standing Phase-A2: CLI-verify gate-passed handles
# (instagram-cli user-profile country gate, then posts --username for post URL).
set -u
PIGFB="$HOME/workspace/pig-fb"
SRC="$HOME/workspace/goals/ping-social-outreach-campaign/hidden_files/engagement-passes"
TS="20260924-0301"
PREVTS="20260924-0101"

source "$PIGFB/browser-lock.sh"
browser_lock_acquire ig "ig-pass116-discovery" || { echo "LOCK_FAILED"; exit 2; }
echo "LOCK_HELD"

cp "$SRC/ig-skip-list-$PREVTS.json" "$SRC/ig-skip-list-$TS.json"

python3 - "$SRC/ig-skip-list-$TS.json" <<'EOF'
import json, sys
src = sys.argv[1]
skip = json.load(open(src))
strategies = {
    "tradecity": ["palisade electrician", "fruita garage door", "rifle electrician"],
    "hashtag":   ["#970locksmith", "#gjdonuts"],
    "bizlocal":  ["clifton pizza", "rifle gym", "montrose bike shop"],
}
base = src.rsplit("/", 1)[0]
for name, queries in strategies.items():
    path = f"{base}/ig116-discover-{name}-20260924-0301.json"
    json.dump({"queries": queries, "skip": skip, "maxProfiles": 16}, open(path, "w"))
    print("WROTE", path, len(queries), "queries")
EOF

for s in tradecity hashtag bizlocal; do
  JOB="$SRC/ig116-discover-$s-$TS.json"
  echo "=== START $s ==="
  "$PIGFB/run_ig_discover.sh" "$JOB" > "$JOB.stdout.log" 2>&1
  echo "exit=$? strategy=$s"
  tail -c 400 "$JOB.stdout.log"; echo
done
echo "ALL_STRATEGIES_DONE"
