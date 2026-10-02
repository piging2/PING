#!/bin/bash
# STEP 6: start built Next app on a free port, check all routes, content, viewport; then stop.
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
cd "$WT"
export PATH=/home/nolan/.nvm/versions/node/v22.23.2/bin:$PATH
export NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1
export DEV_MODE_SKIP_KV=true
export FYD_PROJECTION_DIR=/home/nolan/fyd-preview-wt/fyd-night-projections
export SHARP_IGNORE_GLOBAL_LIBVIPS=1
export NEXT_TELEMETRY_DISABLED=1

PORT=3101
while ss -tln 2>/dev/null | grep -q ":$PORT "; do PORT=$((PORT+1)); done
BASE="http://localhost:$PORT"
echo "STEP6: starting next start on port $PORT"

npx next start -p $PORT >/tmp/fyd-preview-step6-server.log 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null; wait $SRV 2>/dev/null' EXIT

READY=0
for i in $(seq 1 60); do
  if curl -s -o /dev/null --max-time 3 "$BASE/fyd-night"; then READY=1; echo "ready after ${i}s"; break; fi
  sleep 1
done
if [ "$READY" != "1" ]; then echo "STEP6 FAIL: server never ready"; tail -20 /tmp/fyd-preview-step6-server.log; exit 1; fi

code() { curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$1"; }
fetch() { curl -s --max-time 20 "$1"; }

echo "=== route statuses ==="
for r in /fyd-night /sites/happy-place /sites/coppersmith-plumbing /preview/ask /preview/owner-console \
  /fyd-night/cohort/bemis-electric /fyd-night/cohort/claire-codling /fyd-night/cohort/dalby-cpa \
  /fyd-night/cohort/gear-junction /fyd-night/cohort/hand-law /fyd-night/cohort/suehiro \
  /fyd-night/cohort/white-star /fyd-night/cohort/pride-plumbing /fyd-night/cohort/pantuso \
  /fyd-night/cohort/klik-boutique /o/happy-place /o/coppersmith-plumbing; do
  echo "$r -> $(code "$BASE$r")"
done

echo "=== content checks ==="
HP=$(fetch "$BASE/sites/happy-place")
CS=$(fetch "$BASE/sites/coppersmith-plumbing")
COHORT=$(fetch "$BASE/fyd-night/cohort/hand-law")
ASK=$(fetch "$BASE/preview/ask")
OWNER=$(fetch "$BASE/preview/owner-console")
FYD=$(fetch "$BASE/fyd-night")

check() { # name, body, needle, expect(1=present,0=absent)
  if printf '%s' "$2" | grep -qF "$3"; then got=present; else got=absent; fi
  exp="absent"; [ "$4" = "1" ] && exp="present"
  if [ "$got" = "$exp" ]; then echo "PASS $1"; else echo "FAIL $1 (expected $exp)"; fi
}
check "hp-service-Repairs" "$HP" "Repairs" 1
check "hp-no-happy-place-bizinfo" "$HP" "Happy Place" 0
check "cs-service-Plumbing" "$CS" "Plumbing" 1
check "cohort-back-link" "$COHORT" "Back to Night Cohort" 1
check "owner-notice" "$OWNER" "DEMO OWNER MODE, simulated authority, preview only" 1
check "ask-label" "$ASK" "Ask FYD" 1
check "fyd-night-cohort-word" "$FYD" "Cohort" 1
if printf '%s' "$HP" | grep -qi 'name="viewport"'; then echo "PASS viewport-meta-present"; else echo "FAIL viewport-meta-present"; fi
if printf '%s' "$HP" | grep -qi 'width=device-width'; then echo "PASS viewport-width-device-width"; else echo "FAIL viewport-width-device-width"; fi
echo "hp Painting mentions: $(printf '%s' "$HP" | grep -o 'Painting' | wc -l)"
echo "cs HVAC mentions: $(printf '%s' "$CS" | grep -oi 'hvac' | wc -l)"
echo "cohort hand-law H1/heading sample: $(printf '%s' "$COHORT" | grep -o '<h1[^>]*>[^<]*</h1>' | head -2)"
echo "=== server log tail ==="
tail -3 /tmp/fyd-preview-step6-server.log
echo "STEP6 DONE"
