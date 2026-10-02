#!/bin/bash
echo "### 3101/3210 next-server gateway env"
for p in 3288 16302; do
  echo "pid $p: gateway_matches=$(tr '\0' '\n' < /proc/$p/environ 2>/dev/null | grep -ciE 'gateway|journal')"
done
echo "### fyd-tenant-graph catch block (186-205)"
sed -n '180,205p' /home/nolan/projects/ping-constitutional/src/fyd/data/fyd-tenant-graph.ts
echo "### REAL execution probe: replay_determinism.test.js"
cd /home/nolan/ping && timeout 25 node tests/certification/replay_determinism.test.js 2>&1 | tail -15; echo "exit=$?"
