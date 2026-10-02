#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== strategies.ts:70-170 ==="
sed -n '70,170p' src/fyd/builder/strategies.ts
echo "=== where do planner sections get query (planner.ts:420-470) ==="
sed -n '420,470p' src/fyd/builder/planner.ts
echo "=== /build/[siteId] route: which pipeline? ==="
ls src/app/build/ 2>/dev/null; find src/app -path "*build*" -name "page.tsx" 2>/dev/null | head
echo "=== grep generator vs planner usage in app routes ==="
grep -rln "generateSiteSpec\|planSite\|SitePlanner" src/app --include="*.tsx" --include="*.ts" | head -20
