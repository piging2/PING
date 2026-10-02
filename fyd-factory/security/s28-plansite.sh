#!/bin/bash
set -u
cd /home/nolan/projects/ping
grep -n -B3 -A40 'interface SitePlannerInput' src/fyd/builder/planner.ts | head -70
echo "=== PlannedSite ==="
grep -n -B2 -A20 'interface PlannedSite' src/fyd/builder/planner.ts | head -30
echo "=== build route: planSite -> render ==="
sed -n '70,130p' 'src/app/build/[siteId]/page.tsx'
