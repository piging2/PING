#!/bin/bash
# F5-CEILING probe L: strategy vector assignments, build page planSite call
set -e
cd /home/nolan/projects/ping
sed -n '150,230p' src/fyd/builder/strategies.ts
echo "===== build page planSite usage ====="
grep -n -B5 -A25 "planSite" "src/app/build/[siteId]/page.tsx" | head -80
