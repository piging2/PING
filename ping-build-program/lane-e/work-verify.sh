#!/bin/bash
set -u
cd /home/nolan/projects/ping || exit 1
echo "=== node_modules present? ==="
test -d node_modules && echo yes || echo no
echo "=== vitest: schemas + registry + compose tests ==="
npx vitest run src/fyd/sitespec/__tests__/schemas.test.ts src/fyd/components/__tests__/registry.test.ts src/fyd/components/__tests__/compose.test.ts 2>&1 | tail -30
echo "=== tsc: errors mentioning touched files only ==="
npx tsc --noEmit 2>&1 | grep -E "schema-roles|sitespec/schemas|components/registry" | head -20
echo "(blank = no type errors in touched files)"
