#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== src/app/build/[siteId]/page.tsx (head 120) ==="
sed -n '1,120p' src/app/build/[siteId]/page.tsx
echo "=== which of the 3 terms ==="
grep -n "generateSiteSpec\|planSite\|SitePlanner" src/app/build/[siteId]/page.tsx src/app/sites/happy-place/page.tsx
echo "=== planner section query construction (grep 'query:' in builder) ==="
grep -rn "query:" src/fyd/builder/*.ts | grep -v test | head -20
