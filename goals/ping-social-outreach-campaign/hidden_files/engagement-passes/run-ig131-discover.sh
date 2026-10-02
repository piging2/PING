#!/bin/bash
# Pass 131 (ig-20260926-1903) Phase A fallback probe, 2026-09-26 13:01 MDT scheduled run.
# Phase P pipeline (ig-pipeline.py --build, 45 API calls, partial=False) returned
# 14 "eligible"; guard blocked 13 as ALREADY_ENGAGED / ambiguous identity and the
# worker excluded @aspenwoodllc (out of all tiers, gate 4 fail-closed, same as
# passes 129/130). Eligible depth 0 < 2x caps (100 like / 24 comment) -> Phase A.
# CDP search typeahead has been SURFACE_DRIFT since pass 129 (~14h). This run
# probes ONE strategy read-only; further strategies run only if it recovers.
set -u
PIGFB="$HOME/workspace/pig-fb"
SRC="$HOME/workspace/goals/ping-social-outreach-campaign/hidden_files/engagement-passes"
TS="20260926-1903"
PREVTS="20260926-0501"

source "$PIGFB/browser-lock.sh"
browser_lock_acquire ig "ig-pass131-discovery" || { echo "LOCK_FAILED"; exit 2; }
echo "LOCK_HELD"

python3 - "$SRC/ig-skip-list-$PREVTS.json" <<'EOF'
import json, sys
src = sys.argv[1]
skip = json.load(open(src))
probe = ["fruita barber", "palisade winery", "delta salon", "rifle bakery",
         "collbran mechanic", "de beque electrician"]
base = src.rsplit("/", 1)[0]
path = f"{base}/ig131-discover-probe-20260926-1903.json"
json.dump({"queries": probe, "skip": skip, "maxProfiles": 16}, open(path, "w"))
print("WROTE", path)
EOF

JOB="$SRC/ig131-discover-probe-$TS.json"
echo "=== START probe (bizlocal-style) ==="
"$PIGFB/run_ig_discover.sh" "$JOB" > "$JOB.stdout.log" 2>&1
rc=$?
echo "exit=$rc strategy=probe"
tail -c 600 "$JOB.stdout.log"; echo

RESFILE=$(python3 -c "
import json,sys,glob,os
cands=sorted(glob.glob('$SRC/ig131-discover-probe-20260926-1903*.result.json'),key=os.path.getmtime)
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
