#!/bin/bash
cd /home/nolan/ping
echo "=== /mc write routes ==="; grep -n "router.post\|router.put\|router.delete\|router.patch" gateway/routes/mission_control.js | head -20
echo "=== git log missions/ ==="; git log --oneline -5 -- missions/ 2>/dev/null
echo "=== missions/ tracked? ==="; git ls-files missions/ | head -5
echo "=== replay_worker ==="; wc -l ping-runtime/agents/replay_worker.js; grep -n "class \|async \|emit(" ping-runtime/agents/replay_worker.js | head -25
