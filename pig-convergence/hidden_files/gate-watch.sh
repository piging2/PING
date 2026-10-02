#!/bin/bash
# Phase 0 gate watcher: polls every 10 min, up to 3h. Prints GATE OPEN once both hold.
set -u
for i in $(seq 1 18); do
  TS=$(date -u +%FT%TZ)
  STATUS=$(python3 -c "import json;print(json.load(open('/home/hatch/workspace/pig/antifragility/health-state.json'))['status'])" 2>/dev/null || echo ERR)
  if [ "$STATUS" = "UP" ]; then
    PROBE=$(/home/hatch/workspace/bin/pigwsl-exec 'ls -d /home/nolan/ping >/dev/null 2>&1 && echo PROBE_OK || echo PROBE_FAIL' 2>&1 | tr -d '\r\n' | tail -c 200)
    echo "$TS iter=$i health=UP probe_result=$PROBE"
    if echo "$PROBE" | grep -q PROBE_OK; then
      echo "GATE OPEN"
      exit 0
    fi
  else
    echo "$TS iter=$i health=$STATUS (gate closed)"
  fi
  sleep 600
done
echo "GATE STILL CLOSED after 3h"
exit 1
