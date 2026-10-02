#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== src/app/build/[siteId]/page.tsx ==="
cat src/app/build/\[siteId\]/page.tsx 2>/dev/null | head -80
echo "=== planner.ts ObjectFeed usage ==="
grep -n "ObjectFeed" src/fyd/builder/planner.ts | head -20
echo "=== eligibility.ts ObjectFeed / all-query usage ==="
grep -n "ObjectFeed\|kind" src/fyd/builder/eligibility.ts | head -20
