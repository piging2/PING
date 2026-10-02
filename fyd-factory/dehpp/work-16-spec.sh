#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
echo "=== FYDSiteSpec interface ==="
sed -n '300,360p' src/fyd/sitespec/types.ts
echo ""
echo "=== FYDLayoutCharacter + FYDSiteArchetype ==="
grep -n "FYDLayoutCharacter\s*=" -A 10 src/fyd/sitespec/types.ts | head -15
grep -n "FYDSiteArchetype\s*=" -A 8 src/fyd/sitespec/types.ts | head -12
echo ""
echo "=== DEFAULT_FYD_THEME full ==="
sed -n '295,330p' src/fyd/sitespec/types.ts
