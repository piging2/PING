#!/bin/bash
cd /home/nolan/ping
echo "=== mission_control route mounts ==="; grep -n "mission_control\|MissionControlRoutes\|createMissionControl" gateway/bootstrap/gateway_runtime.js | head -10
echo "=== who reads intents/ (plural) ==="; grep -rln "intents/" --include='*.py' --include='*.js' scripts/ gateway/ ping-runtime/ runtime/ 2>/dev/null | grep -v node_modules | head -10
echo "=== intent-map.yaml exists? ==="; ls intent-map.yaml 2>/dev/null; echo "exit=$?"
echo "=== mission-control py servers running? ==="; ps aux | grep -e uvicorn -e gunicorn -e "mission_control" | grep -v grep | head -5
echo "=== MISSION_CONTROL_URL target alive? ==="; curl -s -m 5 -o /dev/null -w "%{http_code}\n" http://localhost:8000/health 2>/dev/null || echo "no-8000"
