#!/usr/bin/env bash
# P3: CORRUPT CACHE ENTRY. One bad digest -> detected on read, quarantined,
# recomputed from source, never trusted (corrupt bytes never served).
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
W="$HERE/work-r2/p3"
rm -rf "$W"; mkdir -p "$W"
FIX="$HERE/../corpus/fixtures/clearwater-plumbing-demo.json"
PASS=0; FAIL=0
note() { if [ "$2" = "ok" ]; then PASS=$((PASS+1)); else FAIL=$((FAIL+1)); fi; echo "[$2] $1"; }

node "$HERE/r2-cache.ts" --store "$W/store" --fixture "$FIX" --mode init > "$W/init.json" 2>&1
N=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$W/init.json','utf8')).entries)")
note "P3-1 cache committed ($N entries)" "$([ "$N" = "25" ] && echo ok || echo FAIL)"

node "$HERE/r2-cache.ts" --store "$W/store" --fixture "$FIX" --mode read-all --report "$W/clean.json" > /dev/null 2>&1
CLEAN_RECOMP=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$W/clean.json','utf8')).recomputed)")
note "P3-2 clean read: all served verified, recompute_calls=0 (got $CLEAN_RECOMP)" \
  "$([ "$CLEAN_RECOMP" = "0" ] && echo ok || echo FAIL)"

# Corrupt the owner object's entry bytes on disk (mid-file bit flips).
node "$HERE/r2-cache.ts" --store "$W/store" --fixture "$FIX" --mode corrupt --key "cw-biz-01" > "$W/corrupt.json" 2>&1
note "P3-3 corruption injected into cw-biz-01 entry" "ok"

node "$HERE/r2-cache.ts" --store "$W/store" --fixture "$FIX" --mode read-all --report "$W/after.json" > /dev/null 2>&1
R="$W/after.json"
DET=$(node -e "const r=JSON.parse(require('fs').readFileSync('$R','utf8')); console.log(r.recomputed)")
QCOUNT=$(node -e "const r=JSON.parse(require('fs').readFileSync('$R','utf8')); console.log(r.quarantined.length)")
RCALLS=$(node -e "const r=JSON.parse(require('fs').readFileSync('$R','utf8')); console.log(r.recompute_calls)")
SERVED_BAD=$(node -e "const r=JSON.parse(require('fs').readFileSync('$R','utf8')); console.log(r.served_corrupt)")
ALL_OK=$(node -e "const r=JSON.parse(require('fs').readFileSync('$R','utf8')); console.log(r.entries)")
note "P3-4 exactly one entry detected corrupt and recomputed (recomputed=$DET)" "$([ "$DET" = "1" ] && echo ok || echo FAIL)"
note "P3-5 corrupt bytes quarantined, not deleted silently (quarantined=$QCOUNT, reason file present: $(ls "$W/store/quarantine/"*.reason.txt >/dev/null 2>&1 && echo yes || echo no))" \
  "$([ "$QCOUNT" = "1" ] && ls "$W/store/quarantine/"*.reason.txt >/dev/null 2>&1 && echo ok || echo FAIL)"
note "P3-6 recompute ran exactly once (recompute_calls=$RCALLS)" "$([ "$RCALLS" = "1" ] && echo ok || echo FAIL)"
note "P3-7 corrupt bytes NEVER served; all $ALL_OK entries verify against committed digests (served_corrupt=$SERVED_BAD)" \
  "$([ "$SERVED_BAD" = "false" ] && [ "$ALL_OK" = "25" ] && echo ok || echo FAIL)"

# Post-heal read: everything clean again, no further recompute.
node "$HERE/r2-cache.ts" --store "$W/store" --fixture "$FIX" --mode read-all --report "$W/healed.json" > /dev/null 2>&1
HEAL_RECOMP=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$W/healed.json','utf8')).recomputed)")
note "P3-8 healed cache reads clean with zero recompute (got $HEAL_RECOMP)" "$([ "$HEAL_RECOMP" = "0" ] && echo ok || echo FAIL)"

VERDICT="PASS"; [ $FAIL -eq 0 ] || VERDICT="FAIL"
cat > "$W/verdict.json" <<EOF
{"probe": "P3 corrupt cache entry", "verdict": "$VERDICT", "checks_passed": $PASS, "checks_failed": $FAIL}
EOF
echo "P3 verdict: $VERDICT ($PASS passed, $FAIL failed)"
[ "$VERDICT" = "PASS" ]
