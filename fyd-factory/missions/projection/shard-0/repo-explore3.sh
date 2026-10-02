#!/bin/bash
cd /home/nolan/projects/ping
echo "########## src/fyd/object/object-projection.ts ##########"
wc -l src/fyd/object/object-projection.ts src/fyd/ask/concierge.ts src/types/projections.ts
echo "### exports of object-projection"
grep -n "^export" src/fyd/object/object-projection.ts | head -40
echo "### exports of concierge"
grep -n "^export" src/fyd/ask/concierge.ts | head -40
echo "### projections.ts types"
grep -n "^export" src/types/projections.ts | head -40
