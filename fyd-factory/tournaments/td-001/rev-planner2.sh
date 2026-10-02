#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== how planner emits sections (search section/query construction) ==="
grep -n "sections.push\|makeSection\|{ component\|component:" src/fyd/builder/planner.ts | head -30
echo "=== strategies.ts ObjectFeed/query ==="
grep -n "ObjectFeed\|kind:" src/fyd/builder/strategies.ts | head -30
