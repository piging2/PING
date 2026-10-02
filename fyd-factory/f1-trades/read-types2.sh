#!/bin/bash
cd /home/nolan/projects/ping
echo "########## types.ts 300-520 ##########"
sed -n '300,520p' src/fyd/sitespec/types.ts
echo "########## registry.ts component def names ##########"
grep -n '"[A-Z][A-Za-z]*"' src/fyd/components/registry.ts | head -60
echo "########## registry.ts head ##########"
sed -n '1,120p' src/fyd/components/registry.ts
