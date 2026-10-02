#!/bin/bash
# Pass 122 (ig-20260924-1501) FULL-BREADTH discovery runner, 15:01 MDT scheduled run.
# Genuine-empty streak is 0 (pass 121 landed 8 actions, SUCCESS_ACTION).
# Interval: 2h baseline per the 2026-09-23 CEO MODE directive; verified at run
# start the schedule is at interval@2h, matches the band, no cron.update.
# Nolan's 2026-09-21 directive (any local business owner with a business account
# eligible, trades stay priority; tiers broaden SLOWLY outward: Tier 1 first).
# 16 fresh queries vs passes 90-121 (deduped against the Strategy lines in
# instagram-engagement.md). Tier 1 this pass (streak just reset; do not jump to
# Tier 3 while closer tiers still yield candidates).
# Skip list: ig-skip-list-20260924-1301.json (434 handles, pass 121 product,
# repaired lineage; per P0 policy the latest written file is authoritative).
# P0 FIX 2026-09-24: no post link found = extraction failure, never a skip;
# run_ig_discover.sh wires bounded CLI follow-up + reconciliation automatically.
# Standing Phase-A2: CLI-verify gate-passed handles
# (instagram-cli user-profile country gate, then posts --username for post URL).
# Creator-account holds from pass 121 (@bougiebarnwithmonica, @scenicstudiosalons,
# @leticiahairapysalon, @salontrosehtx) stay HELD OUT pending Nolan's policy
# call; standing rule is business accounts only. If they surface as candidates,
# exclude them at the candidates->eligible step with reason CREATOR_HELD.
set -u
PIGFB="$HOME/workspace/pig-fb"
SRC="$HOME/workspace/goals/ping-social-outreach-campaign/hidden_files/engagement-passes"
TS="20260924-1501"
PREVTS="20260924-1301"

source "$PIGFB/browser-lock.sh"
browser_lock_acquire ig "ig-pass122-discovery" || { echo "LOCK_FAILED"; exit 2; }
echo "LOCK_HELD"

cp "$SRC/ig-skip-list-$PREVTS.json" "$SRC/ig-skip-list-$TS.json"

python3 - "$SRC/ig-skip-list-$TS.json" <<'EOF'
import json, sys
src = sys.argv[1]
skip = json.load(open(src))
strategies = {
    "tradecity": ["palisade tree service", "clifton roofing", "montrose cleaning service",
                  "carbondale hvac", "rifle landscaper", "fruita handyman"],
    "hashtag":   ["#gjmechanic", "#gjplumbing", "#970contractor", "#970cleaning", "#970landscaper"],
    "bizlocal":  ["rifle restaurant", "montrose tattoo", "grand junction cafe",
                  "fruita restaurant", "delta coffee"],
}
base = src.rsplit("/", 1)[0]
for name, queries in strategies.items():
    path = f"{base}/ig122-discover-{name}-20260924-1501.json"
    json.dump({"queries": queries, "skip": skip, "maxProfiles": 16}, open(path, "w"))
    print("WROTE", path, len(queries), "queries")
EOF

for s in tradecity hashtag bizlocal; do
  JOB="$SRC/ig122-discover-$s-$TS.json"
  echo "=== START $s ==="
  "$PIGFB/run_ig_discover.sh" "$JOB" > "$JOB.stdout.log" 2>&1
  echo "exit=$? strategy=$s"
  tail -c 400 "$JOB.stdout.log"; echo
done
echo "ALL_STRATEGIES_DONE"
