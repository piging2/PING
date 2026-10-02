#!/bin/bash
cd /home/nolan/projects/ping
echo "=== who imports object-circle ==="
grep -rln "object-circle" src/fyd --include="*.ts" --include="*.tsx" | grep -v __tests__ | head -10
echo "=== sitespec/graph.ts imports ==="
grep -n "^import\|from \"" src/fyd/sitespec/graph.ts | head -15
echo "=== archetypes/apply.ts imports ==="
grep -n "^import\|from \"" src/fyd/archetypes/apply.ts 2>/dev/null | head -15
echo "=== sitespec/schemas.ts imports ==="
grep -n "^import\|from \"" src/fyd/sitespec/schemas.ts | head -10
