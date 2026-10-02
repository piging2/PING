#!/bin/bash
cd /home/nolan/ping
echo "=== Bearer enforcement in events route ==="
grep -n -i -B3 -A10 "bearer" gateway/routes/events.js | head -50
echo "=== how /events mounted (auth wrap?) ==="
grep -n -B5 "createEventRoutes\|/events" gateway/bootstrap/gateway_runtime.js | head -20
