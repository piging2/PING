#!/bin/bash
# swarm-08 probe 34: collectMissions/collectPostgres sources (read-only, last)
set -u
SA=/home/nolan/ping/ping-runtime/runtime/system_authority.js
echo "### collectMissions ==="
awk '/async collectMissions|collectMissions\(\)/,/^\s{2}\}/' "$SA" | head -30
echo ""
echo "### organizational_health anywhere in system_authority ==="
grep -c "organizational_health" "$SA"
