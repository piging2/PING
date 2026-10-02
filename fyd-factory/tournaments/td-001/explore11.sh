#!/bin/bash
set -u
cd /home/nolan/projects/ping
echo "===== planner ObjectFeed/sections ====="
grep -n "ObjectFeed\|sections.push\|\"all\"\|kind: \"all\"" src/fyd/builder/planner.ts | head -30
echo "===== eligibility ObjectFeed eligible ====="
grep -n "ObjectFeed" src/fyd/builder/eligibility.ts | head
echo "===== build/[siteId] page ====="
sed -n '100,180p' src/app/build/[siteId]/page.tsx
