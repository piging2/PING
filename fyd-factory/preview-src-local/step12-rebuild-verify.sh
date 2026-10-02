#!/bin/bash
# STEP 12: rebuild, then verify /sites routes work WITHOUT FYD_PROJECTION_DIR set
# (proves the bundled fallback is deployment-safe).
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
cd "$WT"
export PATH=/home/nolan/.nvm/versions/node/v22.23.2/bin:$PATH
export NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1
export DEV_MODE_SKIP_KV=true
# NOTE: FYD_PROJECTION_DIR intentionally UNSET
export SHARP_IGNORE_GLOBAL_LIBVIPS=1
export NEXT_TELEMETRY_DISABLED=1
echo "=== rebuild ==="
npx next build 2>&1 | grep -E "fyd-night|sites/|preview/|/o/|BUILD|error|Error" | head -20
echo "BUILD EXIT: $?"
PORT=3101
while ss -tln 2>/dev/null | grep -q ":$PORT "; do PORT=$((PORT+1)); done
BASE="http://localhost:$PORT"
echo "=== serve without FYD_PROJECTION_DIR on port $PORT ==="
npx next start -p $PORT >/tmp/fyd-preview-step12-server.log 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null; wait $SRV 2>/dev/null' EXIT
for i in $(seq 1 60); do
  if curl -s -o /dev/null --max-time 3 "$BASE/fyd-night"; then echo "ready after ${i}s"; break; fi
  sleep 1
done
for r in /sites/happy-place /sites/coppersmith-plumbing /fyd-night /fyd-night/cohort/hand-law /preview/ask; do
  echo "$r -> $(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$BASE$r")"
done
echo "happy-place content has Repairs: $(curl -s --max-time 15 "$BASE/sites/happy-place" | grep -c 'Repairs')"
echo "STEP12 DONE"
