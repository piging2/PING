#!/bin/bash
cd /home/nolan/projects/ping
echo "########## generated-presentation.ts 1-180 ##########"
sed -n '1,180p' src/fyd/builder/generated-presentation.ts
echo
echo "########## renderer boundField classification call sites ##########"
grep -n "boundField(ctx\|boundField(\s*$\|boundTitle\|boundDescription" src/fyd/components/renderer.tsx | head -40
