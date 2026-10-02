#!/bin/bash
# laneB10 poll loop: watches for laneB*/report.md landings. Read-only; no interference.
seen=/home/hatch/workspace/ping-24h/lanes/laneB10-falsifier/seen.txt
touch "$seen"
deadline=$(( $(date +%s) + 19*3600 ))
while [ "$(date +%s)" -lt "$deadline" ]; do
  for d in /home/hatch/workspace/ping-24h/lanes/laneB*/; do
    [ -d "$d" ] || continue
    lane=$(basename "$d")
    if [ -f "$d/report.md" ] && ! grep -qx "$lane" "$seen" 2>/dev/null; then
      echo "NEW_REPORT_LANDED: $lane at $(date -u +%FT%TZ)"
      echo "$lane" >> "$seen"
    fi
  done
  sleep 600
done
echo "POLL_DONE"
