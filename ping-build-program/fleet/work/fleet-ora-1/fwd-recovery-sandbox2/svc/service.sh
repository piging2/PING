#!/bin/bash
# args: dir ; honors $DEGRADED (1 = degraded mode: half-rate, health reports degraded)
D="$1"; J="$D/journal.log"; S="$D/state"; H="$D/health.json"
n=$(cat "$S" 2>/dev/null || echo 0)
while true; do
  n=$((n+1))
  echo "$(date -u +%FT%TZ) event-$n applied" >> "$J"; echo "$n" > "$S"
  if [ "${DEGRADED:-0}" = "1" ]; then echo "{\"status\":\"degraded\",\"events\":$n}" > "$H"; sleep 0.4
  else echo "{\"status\":\"ok\",\"events\":$n}" > "$H"; sleep 0.2; fi
done
