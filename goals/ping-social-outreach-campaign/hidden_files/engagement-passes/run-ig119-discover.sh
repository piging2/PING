#!/bin/bash
# Pass 119 (ig-20260924-0901) LIGHT-MODE discovery runner, 09:01 MDT scheduled run.
# LIGHT MODE per yield-cadence: genuine-empty streak is 16 (passes 101-106,
# 109, 110, 111, 112, 113, 114, 115, 116, 117, 118 ELIGIBILITY_EMPTY; passes
# 107/108 were TEMPORARY_FAILURE and did not count) -> discovery-only at half
# breadth (8 queries vs the 16-query full breadth); Phase B executes only if
# eligible candidates appear.
# Interval: 2h baseline per the 2026-09-23 CEO MODE directive (yield-driven
# stretch lifted; verified at run start: schedule at interval@2h, matches).
# No cron.update (light mode does not change cadence; CEO MODE 2h baseline
# stands per passes 111-118 precedent; sprint directive reaffirms 2h cadence).
# Nolan's 2026-09-21 directive (any local business owner with a business account
# eligible, trades stay priority; tiers broaden SLOWLY outward: Tier 1 first).
# 8 fresh queries vs passes 90-118 (deduped against the Strategy lines in
# instagram-engagement.md): tradecity "rifle hvac" "palisade roofer"
# "montrose electrician"; hashtags "#970roofing" "#gjplumber";
# bizlocal "fruita bakery" "clifton salon" "delta cafe".
# Skip list: 507 handles (ig-skip-list-20260924-0701.json, post pass 118).
# ig-discover.js (fixed 2026-09-21): vetting haystack = handle + header + full
# body-text fallback. Standing Phase-A2: CLI-verify gate-passed handles
# (instagram-cli user-profile country gate, then posts --username for post URL).
set -u
PIGFB="$HOME/workspace/pig-fb"
SRC="$HOME/workspace/goals/ping-social-outreach-campaign/hidden_files/engagement-passes"
TS="20260924-0901"
PREVTS="20260924-0701"

source "$PIGFB/browser-lock.sh"
browser_lock_acquire ig "ig-pass119-discovery" || { echo "LOCK_FAILED"; exit 2; }
echo "LOCK_HELD"

cp "$SRC/ig-skip-list-$PREVTS.json" "$SRC/ig-skip-list-$TS.json"

python3 - "$SRC/ig-skip-list-$TS.json" <<'EOF'
import json, sys
src = sys.argv[1]
skip = json.load(open(src))
strategies = {
    "tradecity": ["rifle hvac", "palisade roofer", "montrose electrician"],
    "hashtag":   ["#970roofing", "#gjplumber"],
    "bizlocal":  ["fruita bakery", "clifton salon", "delta cafe"],
}
base = src.rsplit("/", 1)[0]
for name, queries in strategies.items():
    path = f"{base}/ig119-discover-{name}-20260924-0901.json"
    json.dump({"queries": queries, "skip": skip, "maxProfiles": 16}, open(path, "w"))
    print("WROTE", path, len(queries), "queries")
EOF

for s in tradecity hashtag bizlocal; do
  JOB="$SRC/ig119-discover-$s-$TS.json"
  echo "=== START $s ==="
  "$PIGFB/run_ig_discover.sh" "$JOB" > "$JOB.stdout.log" 2>&1
  echo "exit=$? strategy=$s"
  tail -c 400 "$JOB.stdout.log"; echo
done
echo "ALL_STRATEGIES_DONE"
