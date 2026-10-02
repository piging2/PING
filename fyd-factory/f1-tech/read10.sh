#!/bin/bash
cd /home/nolan/projects/ping
echo "##### dimensions.ts: ctaEmphasis/density consumers"
grep -n "ctaEmphasis\|density" src/fyd/builder/dimensions.ts | head -20
echo "##### planner.ts: profile/archetype consumers"
grep -n "profile\|archetype\|ARCHETYPE" src/fyd/builder/planner.ts | head -20
echo "##### ping object source"
ls src/fyd/data/ | head; sed -n '1,60p' src/fyd/data/ping-object-source.ts 2>/dev/null
