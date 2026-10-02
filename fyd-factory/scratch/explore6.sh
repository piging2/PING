#!/bin/bash
cd /home/nolan/projects/ping
echo "===== PingObject / PingRelationship types ====="
grep -n "interface PingObject\|interface PingRelationship" -A 40 src/lib/ping/types.ts | head -120
echo ""
echo "===== coppersmith relationships section ====="
grep -n '"relationships"' src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts
