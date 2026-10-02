#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
echo "=== planner SitePlannerInput / PlannedSite ==="
sed -n '122,175p' src/fyd/builder/planner.ts
echo ""
echo "=== planSite signature ==="
sed -n '279,330p' src/fyd/builder/planner.ts
