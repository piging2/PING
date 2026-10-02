#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
grep -n "^export" src/fyd/data/ping-object-source.ts | head -8
echo ""
grep -n "interface ProjectionMeta\|eventSequences" src/fyd/data/ping-object-source.ts | head -8
echo ""
grep -n "KNOWN_SCHEMAS" src/app/sites/happy-place/page.tsx
