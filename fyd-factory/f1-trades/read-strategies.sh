#!/bin/bash
cd /home/nolan/projects/ping
echo "########## builder/strategies.ts ##########"
cat src/fyd/builder/strategies.ts
echo "########## builder/infer-strategy.ts ##########"
cat src/fyd/builder/infer-strategy.ts
echo "########## builder/strategy-for-site.ts ##########"
cat src/fyd/builder/strategy-for-site.ts
echo "########## sitespec/types dir ##########"
ls src/fyd/sitespec/ 2>/dev/null; find src/fyd -name "types.ts" -path "*sitespec*"
