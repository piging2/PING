#!/bin/bash
cd /home/nolan/projects/ping
echo "=== tsx / ts-node availability ==="
ls node_modules/.bin/ 2>/dev/null | grep -E "^(tsx|ts-node|jest)$" | head
node --version 2>/dev/null
echo "=== happy-place fixture provenance ==="
ls src/fyd/proceduralize/__fixtures__/ | grep -i happy
head -80 src/fyd/proceduralize/__fixtures__/happy-place-graph.ts 2>/dev/null
