#!/bin/bash
cd /home/nolan/ping
echo "=== missions routes auth ==="; ls gateway/routes/ | grep -i mission; echo ---; grep -n "router.post\|router.put\|router.delete\|auth\|requireAuth\|middleware" gateway/routes/missions.js | head -20
echo "=== getAutomaticMissionGenerator callers ==="; grep -rn "getAutomaticMissionGenerator" --include='*.js' . 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v worktrees | grep -v "automatic_mission_generator.js" | head -5
echo "=== temporal/index importers ==="; grep -rln "temporal/index\|require.*temporal'" --include='*.js' gateway/ ping-runtime/ 2>/dev/null | grep -v node_modules | grep -v "temporal/" | head -5
