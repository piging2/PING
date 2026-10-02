#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== planner.ts: explore/page emission ====="
grep -n "explore\|slug" src/fyd/builder/planner.ts | head -20
echo
echo "===== coppersmith page: which pipeline builds its spec ====="
sed -n '1,80p' src/app/sites/coppersmith-plumbing/page.tsx
