#!/bin/bash
# LANE-ARCH probe J: planner strategy seam + explorer constraint context + build route tail (read-only)
set -u
REPO=/home/nolan/projects/ping
cd "$REPO"
echo "=== build/[siteId]/page.tsx lines 60-130 ==="
sed -n '60,130p' src/app/build/\[siteId\]/page.tsx
echo "=== planner.ts SitePlannerInput ==="
grep -n "interface SitePlannerInput" -A 25 src/fyd/builder/planner.ts
echo "=== MarginObjectLayer explorer context ==="
sed -n '40,70p' src/fyd/ui/object-layer/MarginObjectLayer.tsx
sed -n '465,490p' src/fyd/ui/object-layer/MarginObjectLayer.tsx
echo "=== src/components/fyd empty check ==="
ls -la src/components/fyd/ 2>/dev/null | head; echo "(empty means no output above)"
