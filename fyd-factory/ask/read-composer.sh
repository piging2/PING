#!/bin/bash
cd /home/nolan/projects/ping
echo "########## lib/ping/ask-composer.ts ##########"
cat src/lib/ping/ask-composer.ts
echo
echo "########## ask-fyd-widget.tsx ##########"
cat src/fyd/components/ask-fyd-widget.tsx
echo
echo "########## route.ts ##########"
cat src/app/api/fyd/ask/route.ts
ls src/app/api/fyd/ask/[siteId]/
cat src/app/api/fyd/ask/[siteId]/route.ts 2>/dev/null
