#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
echo "########## archetypes/apply.ts ##########"
cat src/fyd/archetypes/apply.ts
echo ""
echo "########## builder/strategy-for-site.ts ##########"
cat src/fyd/builder/strategy-for-site.ts 2>/dev/null | head -120
