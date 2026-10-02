#!/bin/bash
cd /home/nolan/projects/ping || { echo "NO REPO"; exit 1; }
echo "=== registry.ts ==="
cat src/fyd/components/registry.ts
echo "=== F2 mention in regression corpus test ==="
grep -rn "F2\|corpus" src/fyd/proceduralize/__tests__/regression-corpus.test.ts | head -20
echo "=== fixtures dir listing ==="
ls -la src/fyd/proceduralize/__fixtures__/
