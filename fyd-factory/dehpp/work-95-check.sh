#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
grep -n "HAPPY_PLACE_TENANT_ID\|HAPPY_PLACE_CATEGORY" src/fyd/compose/params.ts src/app/sites/happy-place/composition.ts | head -5
grep -n "asCompositionIntent" -A 30 src/fyd/compose/params.ts | head -45