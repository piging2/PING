#!/bin/bash
# F5-CEILING probe O: generator ROLE_PREDICATES vs eligibility; coppersmith person relationships
set -e
cd /home/nolan/projects/ping
echo "=== generator ROLE_PREDICATES ==="
grep -n -B2 -A12 "ROLE_PREDICATES" src/fyd/proceduralize/generator.ts | head -40
echo ""
echo "=== coppersmith person object + relationships ==="
grep -n -B3 -A25 "person" src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts | head -80
echo ""
echo "=== relationships block ==="
grep -n -A8 "relationships" src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts | head -60
