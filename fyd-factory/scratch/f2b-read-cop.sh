#!/bin/bash
cd /home/nolan/projects/ping
echo "=== schemas used ==="
grep -o '"schema": "[^"]*"' src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts | sort | uniq -c
echo "=== predicates ==="
grep -o '"predicate": "[^"]*"' src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts | sort | uniq -c
echo "=== person object sample ==="
grep -A 30 '"schema": "ping.social.person@1"' src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts | head -40
echo "=== coppersmith header comment ==="
head -30 src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts
