#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "##### MarginObjectLayer usages #####"
grep -rln "MarginObjectLayer" src/app src/fyd --include='*.tsx' 2>/dev/null | grep -v __tests__ | head
echo "##### data-object-anchor usages #####"
grep -rln 'data-object-anchor' src/app src/fyd --include='*.tsx' 2>/dev/null | grep -v __tests__ | head
echo "##### site-client (80) #####"
sed -n '1,80p' src/app/sites/_shared/site-client.tsx
