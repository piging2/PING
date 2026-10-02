#!/bin/bash
cd /home/nolan/projects/ping
echo "########## app/sites/coppersmith-plumbing/page.tsx ##########"
cat src/app/sites/coppersmith-plumbing/page.tsx
echo "########## proceduralize/generator profile option ##########"
grep -n "profile\|archetype\|ArchetypeProfile" src/fyd/proceduralize/generator.ts | head -30
echo "########## planner.ts profile/archtype references ##########"
grep -n "profile\|archetype\|ArchetypeProfile\|applyArchetype" src/fyd/builder/planner.ts | head -30
