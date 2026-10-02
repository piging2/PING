#!/bin/bash
# swarm-08 probe 26: missions.js routes + ai healthCheckAll (read-only)
set -u
echo "### routes/missions.js endpoints ==="
grep -n "router\.\(get\|post\|put\|delete\|patch\)" /home/nolan/ping/gateway/routes/missions.js | head -20
echo ""
echo "### ai_runtime healthCheckAll (line 95) ==="
sed -n '90,130p' /home/nolan/ping/ping-runtime/ai/ai_runtime.js
echo ""
echo "### MissionControlHeader.tsx ==="
head -60 /home/nolan/projects/constitutional-runtime/CascadeProjects/infra/ui-next/src/components/MissionControlHeader.tsx
