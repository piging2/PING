#!/bin/bash
cd /home/nolan/ping
echo "=== base_worker.js ==="; wc -l ping-runtime/agents/base_worker.js; head -120 ping-runtime/agents/base_worker.js
echo "=== automatic_mission_generator importers ==="; grep -rn "automatic_mission_generator" --include='*.js' gateway/ ping-runtime/ 2>/dev/null | grep -v node_modules | grep require | head -5
echo "=== mission.activity.js live? ==="; grep -rn "mission.activity\|mission_activity" --include='*.js' gateway/ 2>/dev/null | grep -v node_modules | grep -v "mission.activity.js" | head -5
