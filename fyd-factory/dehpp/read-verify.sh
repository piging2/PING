#!/bin/bash
cd /home/nolan/projects/ping
echo "##### who consumes builder/dimensions"
grep -rln "builder/dimensions\|from \"./dimensions\"\|from \"../builder/dimensions\"" src --include='*.ts' --include='*.tsx' | grep -v __tests__ | head
echo "##### eventSequences 65-83 hardcoded sites"
grep -rn "65-83\|65, 83" src --include='*.ts' --include='*.tsx' | grep -v __tests__ | grep -v fixtures | head
echo "##### site-client ctx"
grep -n "galleryMedia\|objectMedia" src/app/sites/_shared/site-client.tsx src/app/sites/happy-place/page.tsx src/fyd/components/renderer.tsx | head -20
