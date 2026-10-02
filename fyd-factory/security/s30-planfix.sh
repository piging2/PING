#!/bin/bash
set -u
cd /home/nolan/projects/ping
sed -n '1,60p' src/fyd/builder/__tests__/planner.test.ts
echo "=== fixtures: COPPERSMITH_VECTOR + CTX ==="
grep -n -B2 -A20 'COPPERSMITH_VECTOR\s*[:=]' src/fyd/builder/__tests__/fixtures.ts | head -40
grep -n 'CTX' src/fyd/builder/__tests__/planner.test.ts | head -3
