#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "########## types.ts tail (FYDSiteSpec) ##########"
sed -n '150,400p' src/fyd/sitespec/types.ts
echo "########## components registry ##########"
ls src/fyd/components/
echo "----- registry file head -----"
for f in src/fyd/components/registry.ts src/fyd/components/registry.tsx src/fyd/components/index.ts; do
  [ -f "$f" ] && { echo "--- $f"; cat "$f"; }
done 2>/dev/null | head -150
