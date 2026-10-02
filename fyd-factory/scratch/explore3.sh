#!/bin/bash
cd /home/nolan/projects/ping
echo "===== coppersmith-graph.ts ====="
head -120 src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts
echo ""
echo "===== happy-place projection json (first 80 lines) ====="
head -80 src/fyd/object/__tests__/fixtures/projections/happy-place.json
