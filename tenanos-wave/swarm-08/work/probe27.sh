#!/bin/bash
# swarm-08 probe 27: MissionControlHeader rest + missions.js full (read-only)
set -u
echo "### MissionControlHeader.tsx rest (fetch check) ==="
grep -n "fetch\|axios\|health\|/api" /home/nolan/projects/constitutional-runtime/CascadeProjects/infra/ui-next/src/components/MissionControlHeader.tsx | head -10
wc -l /home/nolan/projects/constitutional-runtime/CascadeProjects/infra/ui-next/src/components/MissionControlHeader.tsx
echo ""
echo "### routes/missions.js full ==="
cat /home/nolan/ping/gateway/routes/missions.js
