#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
echo "########## page.tsx ##########"
cat src/app/sites/happy-place/page.tsx
echo ""
echo "########## site-client.tsx (lines 1-120) ##########"
sed -n '1,120p' src/app/sites/_shared/site-client.tsx
