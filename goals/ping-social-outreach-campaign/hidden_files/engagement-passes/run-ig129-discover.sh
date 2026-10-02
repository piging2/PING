#!/bin/bash
# Pass 129 (ig-20260926-1107) discovery runner, 2026-09-26 05:01 MDT scheduled run.
# Phase P pipeline (ig-pipeline.py --build, 91 API calls) returned 14 "eligible",
# but the guard blocked all 13 projected candidates as ALREADY_ENGAGED (pass-1
# accounts re-queued by the pipeline; @c.s__landscaping blocked as ambiguous
# identity, fail-closed) and the 14th (@aspenwoodllc) was worker-excluded:
# pipeline tier-matched on the NAME "Aspen", but bio says "Fence and Landscaping
# in Southern Colorado" and the project post is in Pueblo, CO -- none of the
# tiers. Queue eligible depth 0 < 2x caps (40 like / 10 comment) -> Phase A
# fallback runs. Discovery health gate revalidated HEALTHY this pass (5/5
# positive controls via instagram-cli, posts endpoint recovered from 429).
# Nolan's 2026-09-21 directive (any local business owner with a business account
# eligible, trades stay priority; tiers broaden SLOWLY outward: Tier 1 first).
# Genuine-empty streak is 0; do not jump to Tier 3 while closer tiers still yield.
# Fresh queries vs passes 118-123 (deduped against the Strategy lines in
# instagram-engagement.md).
# Skip list: ig-skip-list-20260924-2301.json (446 handles, latest repaired
# lineage per pass 128; per P0 policy the latest written file is authoritative).
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
TS="20260926-0501"
PREVTS="20260924-2301"

source "$PIGFB/browser-lock.sh"
browser_lock_acquire ig "ig-pass129-discovery" || { echo "LOCK_FAILED"; exit 2; }
echo "LOCK_HELD"

cp "$SRC/ig-skip-list-$PREVTS.json" "$SRC/ig-skip-list-$TS.json"

python3 - "$SRC/ig-skip-list-$TS.json" <<'EOF'
import json, sys
src = sys.argv[1]
skip = json.load(open(src))
strategies = {
    "tradecity": ["de beque contractor", "loma electrician", "mack hvac",
                  "collbran plumber", "palisade electrician", "clifton landscaper"],
    "hashtag":   ["#gjhvac", "#970plumber", "#970hvac", "#grandjunctionco", "#970electrician"],
    "bizlocal":  ["grand junction auto repair", "delta barber", "montrose pet groomer",
                  "fruita pizza", "clifton bakery", "palisade salon"],
}
base = src.rsplit("/", 1)[0]
for name, queries in strategies.items():
    path = f"{base}/ig129-discover-{name}-20260926-0501.json"
    json.dump({"queries": queries, "skip": skip, "maxProfiles": 16}, open(path, "w"))
    print("WROTE", path, len(queries), "queries")
EOF

for s in tradecity hashtag bizlocal; do
  JOB="$SRC/ig129-discover-$s-$TS.json"
  echo "=== START $s ==="
  "$PIGFB/run_ig_discover.sh" "$JOB" > "$JOB.stdout.log" 2>&1
  echo "exit=$? strategy=$s"
  tail -c 400 "$JOB.stdout.log"; echo
done
echo "ALL_STRATEGIES_DONE"
