#!/bin/bash
cd /home/nolan/ping
echo "=== brainos mission_control app ==="; wc -l brainos/orchestration/src/mission_control/app.py; head -50 brainos/orchestration/src/mission_control/app.py
echo "=== brainos live? ==="; grep -rn "brainos" gateway/bootstrap/gateway_runtime.js | head -5; echo ---; ps aux | grep -i brainos | grep -v grep | head -3
echo "=== intent_graph_builder source dir ==="; grep -n "glob\|rglob\|intent" scripts/intent_graph_builder.py | head -20
