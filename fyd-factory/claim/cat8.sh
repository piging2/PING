#!/bin/bash
cd /home/nolan/projects/ping
echo "########## coppersmith-graph.ts (head 150) ##########"
sed -n '1,150p' src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts
echo
echo "########## object ids + provenance in coppersmith ##########"
grep -n "id:\|provenance" src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts | head -60
