#!/bin/bash
# Pass 152 (ig-20260928-110154) Phase A fallback probe, 2026-09-28 05:01 MDT scheduled run.
# Phase P pipeline (ig-pipeline.py --build, 23 API calls, partial=False) returned
# 1 carried entry (@aspenwoodllc); guard ELIGIBLE but intent-ledger refuse BLOCKS
# it again (2 open pass-135 intents, UNKNOWN_EXECUTION, deliberately
# unreconciled). Eligible depth 0 < 2x caps (100 like / 24 comment) -> Phase A
# fallback per Phase P step 4.
# One bounded read-only Pig CDP probe with 6 FRESH radius-expansion queries not
# tried in passes 146-151 (closest-first: 3 unpursued core-corridor queries
# first, then further rest-of-Colorado + neighboring-state border regions).
# Budget: 1 CDP attempt this pass. New evidence, not a repeat.
set -u
PIGFB="$HOME/workspace/pig-fb"
SRC="$HOME/workspace/goals/ping-social-outreach-campaign/hidden_files/engagement-passes"
TS="20260928-110154"

source "$PIGFB/browser-lock.sh"
browser_lock_acquire ig "ig-pass152-discovery" || { echo "LOCK_FAILED"; exit 2; }
echo "LOCK_HELD"

python3 - "$SRC/ig-skip-list-20260926-0501.json" <<'PYEOF'
import json, sys
src = sys.argv[1]
skip = json.load(open(src))
probe = ["palisade co plumber", "clifton co electrician",
         "collbran co handyman", "durango co electrician",
         "colorado springs roofer", "kingman az electrician"]
base = src.rsplit("/", 1)[0]
path = f"{base}/ig152-discover-probe-20260928-110154.json"
json.dump({"queries": probe, "skip": skip, "maxProfiles": 16}, open(path, "w"))
print("WROTE", path)
PYEOF

JOB="$SRC/ig152-discover-probe-$TS.json"
echo "=== START probe (radius expansion) ==="
timeout 600 "$PIGFB/run_ig_discover.sh" "$JOB" > "$JOB.stdout.log" 2>&1
rc=$?
echo "exit=$rc strategy=probe"
tail -c 600 "$JOB.stdout.log"; echo

RESFILE=$(python3 -c "
import json,sys,glob,os
cands=sorted(glob.glob('$SRC/ig152-discover-probe-20260928-110154*.result.json'),key=os.path.getmtime)
print(cands[-1] if cands else '')
")
if [ -z "$RESFILE" ]; then
  echo "PROBE_NO_RESULT_FILE: stopping, surface still degraded"
  exit 0
fi
python3 - "$RESFILE" <<'PYEOF'
import json, sys
r = json.load(open(sys.argv[1]))
queries = r.get("queries", r.get("results", []))
ok = sum(1 for q in queries if q.get("status") not in ("search_failed",))
failed = sum(1 for q in queries if q.get("status") == "search_failed")
print(f"PROBE_STAT ok={ok} failed={failed} total={len(queries)}")
nm = r.get("near_misses", [])
print(f"NEAR_MISSES n={len(nm)}")
for x in nm[:12]:
    print(" -", x.get("handle"), x.get("observation_status"), str(x.get("note",""))[:80])
cands = r.get("candidates", [])
print(f"CANDIDATES n={len(cands)}")
for x in cands[:12]:
    print(" -", x.get("handle"), str(x.get("note",""))[:80])
PYEOF
