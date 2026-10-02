#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
echo "########## site-client.tsx (lines 120-260) ##########"
sed -n '120,260p' src/app/sites/_shared/site-client.tsx
echo ""
echo "########## total lines ##########"
wc -l src/app/sites/_shared/site-client.tsx
