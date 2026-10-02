#!/bin/bash
# swarm-08 probe 19: engine.js closure computation + dashboard.js closure_rate source (read-only)
set -u
echo "### engine.js 470-520 ==="
sed -n '470,520p' /home/nolan/ping/ping-runtime/orchestration/execution/engine.js
echo ""
echo "### dashboard.js 30-60 ==="
sed -n '30,60p' /home/nolan/ping/ping-runtime/orchestration/dashboard.js
echo ""
echo "### dashboard.js served by which route? ==="
timeout 30 grep -rn "dashboard.js\|require.*dashboard" /home/nolan/ping/gateway/*.js 2>/dev/null | grep -v test | grep -v node_modules | head -8
