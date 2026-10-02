#!/bin/bash
set -u
cd /home/nolan/projects/ping
echo "=== planner tests: minimal planSite invocation ==="
ls src/fyd/builder/__tests__/ 2>/dev/null
grep -rn 'planSite(' src/fyd/builder/__tests__/*.ts 2>/dev/null | head -5
echo "=== ArchetypeVector minimal shape ==="
grep -n -B2 -A25 'interface ArchetypeVector\|type ArchetypeVector' src/fyd/archetypes/*.ts 2>/dev/null | head -40
echo "=== strategyForSite ==="
grep -n -B2 -A15 'export function strategyForSite' src/fyd/builder/strategy-for-site.ts | head -30
