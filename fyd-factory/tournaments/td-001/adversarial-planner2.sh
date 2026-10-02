#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== section construction in planner.ts ==="
grep -n "FYDSection\|sections:\|plannedPages\|composeSections\|buildSections" src/fyd/builder/planner.ts | head -30
echo "=== files in builder lane ==="
ls src/fyd/builder/
echo "=== grep ObjectFeed query emission in builder ==="
grep -rn "ObjectFeed" src/fyd/builder/*.ts | grep -v test | head -20
