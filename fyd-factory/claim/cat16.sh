#!/bin/bash
cd /home/nolan/projects/ping
echo "########## presentation intent application ##########"
grep -rn "presentationIntent\|PresentationIntent" src/fyd/components/renderer.tsx | head -10
echo "---customize lane---"
ls src/fyd/customize/ 2>/dev/null
grep -rn "presentation" src/fyd/customize/*.ts 2>/dev/null | grep -i "copy\|heading" | head -10
echo "########## buildRenderContext ##########"
grep -rn "buildRenderContext" src/fyd --include="*.tsx" --include="*.ts" -l | grep -v __tests__ | head
