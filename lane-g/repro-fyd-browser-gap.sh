#!/bin/bash
# LANE G repro: FYD approve browser gap.
# The browser panel (customize-panel.tsx) never sends request_id; the route
# mints a fresh uuid per attempt when absent. So a lost-response retry carries
# a NEW logical id and the journal appends a DUPLICATE overlay event.
# This script proves the mechanics against the REAL journal gateway
# (request_id dedupe backstop): fresh-id-per-attempt duplicates, stable-id
# converges. Run on the Pig. Uses a scratch store + high port; no live data.
set -u
GW_BIN="${GW_BIN:-/home/nolan/build-idem/tools/fyd-journal-gateway/server.mjs}"
PORT="${PORT:-45231}"
STORE="/tmp/lane-g/fyd-journal-repro/events.jsonl"
rm -rf "$(dirname "$STORE")" && mkdir -p "$(dirname "$STORE")"
FYD_JOURNAL_PORT="$PORT" FYD_JOURNAL_STORE="$STORE" node "$GW_BIN" > /tmp/lane-g/fyd-gw-repro.log 2>&1 &
GW=$!
sleep 1
post() { curl -s -X POST "127.0.0.1:$PORT/events" -H 'Content-Type: application/json' -d "$1"; echo; }
echo "--- A: CURRENT browser behavior (no request_id; route mints fresh uuid per attempt) ---"
R1=$(node -e "console.log(require('crypto').randomUUID())")
post "{\"event_type\":\"FYD_SITE_OVERLAY\",\"event_data\":{\"siteId\":\"s1\"},\"request_id\":\"$R1\"}"
R2=$(node -e "console.log(require('crypto').randomUUID())")
post "{\"event_type\":\"FYD_SITE_OVERLAY\",\"event_data\":{\"siteId\":\"s1\"},\"request_id\":\"$R2\"}"
echo "--- B: REQUIRED behavior (browser retains ONE request_id across retry) ---"
R3="owner-action-abc-123"
post "{\"event_type\":\"FYD_SITE_OVERLAY\",\"event_data\":{\"siteId\":\"s2\"},\"request_id\":\"$R3\"}"
post "{\"event_type\":\"FYD_SITE_OVERLAY\",\"event_data\":{\"siteId\":\"s2\"},\"request_id\":\"$R3\"}"
echo "--- journal lines (expect 3: A->2 dupes, B->1 converged) ---"
wc -l "$STORE"
kill "$GW" 2>/dev/null; true
