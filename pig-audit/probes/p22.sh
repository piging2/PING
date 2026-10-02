#!/bin/bash
cd /home/nolan/ping
echo "=== engine.js 419-560 (dashboard/report/loop) ==="
cat -n ping-runtime/orchestration/execution/engine.js | sed -n '419,560p'
