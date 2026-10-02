#!/bin/bash
# swarm-08 probe 3: mission_control.js REST surface + gateway routes inventory (read-only)
set -u
G=/home/nolan/ping/gateway
echo "=== mission_control.js: size, routes ==="
wc -l "$G/routes/mission_control.js"
grep -n "router\.\(get\|post\|put\|delete\|patch\)\|app\.\(get\|post\)" "$G/routes/mission_control.js" | head -60
echo "=== routes dir ==="
ls "$G/routes" | head -80
echo "=== mission_control.js head ==="
head -120 "$G/routes/mission_control.js"
