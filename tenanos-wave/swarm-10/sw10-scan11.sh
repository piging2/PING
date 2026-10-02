#!/bin/bash
# SWARM-10 scan 11: mission_control dead-letter routes; any accept/reject API;
# canonical_events ingest of approval events. Read-only.
R=/home/nolan/ping
echo "===== R1: mission_control dead letter routes (620-681) ====="
sed -n '600,681p' "$R/gateway/routes/mission_control.js"
echo "===== R2: accept/reject endpoints anywhere ====="
grep -rEn "router\.(post|put)\(['\"][^'\"]*(accept|reject|approve)" "$R/gateway/routes" 2>/dev/null | head -15
echo "===== R3: canonical_events route - can clients post arbitrary event types ====="
grep -n 'event_type|POST|post(' "$R/gateway/routes/canonical_events.js" | head -20
