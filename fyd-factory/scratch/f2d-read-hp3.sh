#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "########## types.ts ##########"
sed -n '1,120p' src/fyd/sitespec/types.ts
echo "########## rich graph: all object schemas ##########"
grep -n "ping\.knowledge\.[a-z_@0-9.]*\|ping\.social\.[a-z_@0-9.]*" src/fyd/proceduralize/__fixtures__/happy-place-rich-graph.ts | sed 's/^[0-9]*://' | sort | uniq -c | sort -rn
echo "########## rich graph relationships ##########"
grep -n "predicate" src/fyd/proceduralize/__fixtures__/happy-place-rich-graph.ts | grep '"' | head -15
echo "########## rich graph tail (relationships block) ##########"
tail -c 4000 src/fyd/proceduralize/__fixtures__/happy-place-rich-graph.ts
