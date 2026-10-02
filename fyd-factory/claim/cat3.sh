#!/bin/bash
cd /home/nolan/projects/ping
echo "########## renderer.tsx 670-760 ##########"
sed -n '670,760p' src/fyd/components/renderer.tsx
echo
echo "########## planner.ts 130-170 ##########"
sed -n '130,170p' src/fyd/builder/planner.ts
echo
echo "########## planner.ts 240-270 ##########"
sed -n '240,270p' src/fyd/builder/planner.ts
echo
echo "########## planner.ts 380-420 ##########"
sed -n '380,420p' src/fyd/builder/planner.ts
