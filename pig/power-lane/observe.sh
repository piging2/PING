#!/bin/bash
# Bounded post-change reachability observation: 10 probes, 120s apart (~20 min).
# Each probe exercises the full route: egress proxy -> Tailscale -> Windows SSH.
LOG=~/workspace/pig/power-lane/observation-2026-10-01.log
echo "observation start: $(date '+%F %T %Z')" >> "$LOG"
for i in $(seq 1 10); do
  TS=$(date '+%F %T %Z')
  if timeout 45 ~/workspace/bin/pig "echo ALIVE" 2>/dev/null | grep -q ALIVE; then
    echo "$TS probe $i: ROUTE_OK" >> "$LOG"
  else
    echo "$TS probe $i: ROUTE_FAIL" >> "$LOG"
  fi
  [ "$i" -lt 10 ] && sleep 120
done
echo "observation end: $(date '+%F %T %Z')" >> "$LOG"
