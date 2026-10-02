#!/bin/bash
# Pass 130 (ig-20260926-1101) discovery runner, 2026-09-26 11:01 MDT scheduled run.
# Phase P pipeline (ig-pipeline.py --build, 45 API calls, partial=False) returned
# 14 "eligible", but the guard blocked 13 as ALREADY_ENGAGED / ambiguous identity
# (pass-1/pass-3 re-queues; pipeline does not pre-filter engagement history) and
# the 14th (@aspenwoodllc) was worker-excluded: bio "Fence and Landscaping in
# Southern Colorado", no city/zip, target post documents a Pueblo, CO project --
# none of the geography tiers. Verified this pass via instagram-cli user-profile.
# Queue eligible depth 0 < 2x caps (40 like / 10 comment) -> Phase A fallback.
# Pass 129 (5.5h ago) hit 17/17 typeahead search_failed on this surface (possible
# SURFACE_DRIFT) and quarantined CDP discovery for that pass. This run probes
# ONE strategy first; remaining strategies run only if the typeahead recovers.
# Nolan's 2026-09-21 directive: any local business owner with a business account
# eligible, trades stay priority; tiers broaden SLOWLY outward, Tier 1 first.
# Genuine-empty streak is 1 (pass 129 ELIGIBILITY_EMPTY); do not jump to Tier 3.
# Fresh queries vs passes 118-129.
# Skip list: ig-skip-list-20260926-0501.json (446 handles, latest repaired lineage).
# P0 FIX 2026-09-24: no post link found = extraction failure, never a skip.
# Standing Phase-A2: CLI-verify gate-passed handles (user-profile country gate,
# then posts --username for the post URL).
# Creator-account holds from pass 121 (@bougiebarnwithmonica, @scenicstudiosalons,
# @leticiahairapysalon, @salontrosehtx) stay HELD OUT pending Nolan's policy
# call; standing rule is business accounts only.
set -u
PIGFB="$HOME/workspace/pig-fb"
SRC="$HOME/workspace/goals/ping-social-outreach-campaign/hidden_files/engagement-passes"
TS="20260926-1101"
PREVTS="20260926-0501"

source "$PIGFB/browser-lock.sh"
browser_lock_acquire ig "ig-pass130-discovery" || { echo "LOCK_FAILED"; exit 2; }
echo "LOCK_HELD"

python3 - "$SRC/ig-skip-list-$PREVTS.json" <<'EOF'
import json, sys
src = sys.argv[1]
skip = json.load(open(src))
probe = ["montrose plumber", "fruita electrician", "rifle hvac",
         "delta roofer", "clifton painter", "palisade landscaper"]
rest = {
    "hashtag": ["#palisade", "#cliftonco", "#debeque", "#lomaco", "#mackco", "#collbranco"],
    "bizlocal": ["montrose coffee shop", "grand junction gym", "delta pizza",
                 "fruita bakery", "carbondale salon", "rifle auto repair"],
}
base = src.rsplit("/", 1)[0]
path = f"{base}/ig130-discover-probe-20260926-1101.json"
json.dump({"queries": probe, "skip": skip, "maxProfiles": 16}, open(path, "w"))
print("WROTE", path)
for name, queries in rest.items():
    p2 = f"{base}/ig130-discover-{name}-20260926-1101.json"
    json.dump({"queries": queries, "skip": skip, "maxProfiles": 16}, open(p2, "w"))
    print("WROTE", p2)
EOF

JOB="$SRC/ig130-discover-probe-$TS.json"
echo "=== START probe (tradecity-style) ==="
"$PIGFB/run_ig_discover.sh" "$JOB" > "$JOB.stdout.log" 2>&1
rc=$?
echo "exit=$rc strategy=probe"
tail -c 600 "$JOB.stdout.log"; echo

# Probe decision: count queries that returned anything other than search_failed.
RESFILE=$(python3 -c "
import json,sys,glob,os
cands=sorted(glob.glob('$SRC/ig130-discover-probe-20260926-1101*.result.json'),key=os.path.getmtime)
print(cands[-1] if cands else '')
")
if [ -z "$RESFILE" ]; then
  echo "PROBE_NO_RESULT_FILE: stopping, surface still degraded"
  exit 0
fi
python3 - "$RESFILE" <<'EOF'
import json, sys
r = json.load(open(sys.argv[1]))
queries = r.get("queries", r.get("results", []))
ok = sum(1 for q in queries if q.get("status") not in ("search_failed",))
failed = sum(1 for q in queries if q.get("status") == "search_failed")
print(f"PROBE_STAT ok={ok} failed={failed} total={len(queries)}")
EOF
