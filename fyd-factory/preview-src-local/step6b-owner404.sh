#!/bin/bash
# STEP 6b: verify owner-console 404s when demo env is unset; grab cohort back-link text.
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
cd "$WT"
export PATH=/home/nolan/.nvm/versions/node/v22.23.2/bin:$PATH
# NOTE: NEXT_PUBLIC_FYD_DEMO_OWNER_MODE intentionally UNSET
export DEV_MODE_SKIP_KV=true
export FYD_PROJECTION_DIR=/home/nolan/fyd-preview-wt/fyd-night-projections
export SHARP_IGNORE_GLOBAL_LIBVIPS=1
export NEXT_TELEMETRY_DISABLED=1

PORT=3101
while ss -tln 2>/dev/null | grep -q ":$PORT "; do PORT=$((PORT+1)); done
BASE="http://localhost:$PORT"
echo "STEP6b: starting next start on port $PORT (demo owner mode UNSET)"
npx next start -p $PORT >/tmp/fyd-preview-step6b-server.log 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null; wait $SRV 2>/dev/null' EXIT
for i in $(seq 1 60); do
  if curl -s -o /dev/null --max-time 3 "$BASE/fyd-night"; then echo "ready after ${i}s"; break; fi
  sleep 1
done
echo "owner-console status (expect 404): $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$BASE/preview/owner-console")"
echo "ask status (expect 200): $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$BASE/preview/ask")"
echo "--- cohort back-link text on hand-law page ---"
curl -s --max-time 20 "$BASE/fyd-night/cohort/hand-law" | grep -oi '<a[^>]*>[^<]*back[^<]*</a>' | head -3
echo "STEP6b DONE"
