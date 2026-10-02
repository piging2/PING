#!/bin/bash
# stand-in service: appends journal lines, keeps state counter
J="$1/journal.log"; S="$1/state"
n=$(cat "$S" 2>/dev/null || echo 0)
while true; do n=$((n+1)); echo "$(date -u +%FT%TZ) event-$n applied" >> "$J"; echo "$n" > "$S"; sleep 0.2; done
