#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== pre-fix explorePage (4a9cc919^) ==="
git show 4a9cc919^:src/fyd/proceduralize/generator.ts | grep -n "explore" | head
echo "=== pre-fix section call ==="
git show 4a9cc919^:src/fyd/proceduralize/generator.ts | grep -n 'kind: "all"' | head
echo "=== validator.ts:105-125 ==="
sed -n '105,125p' src/fyd/sitespec/validator.ts
echo "=== schemas.ts eligibleComponents def ==="
grep -n "export function eligibleComponents" src/fyd/sitespec/schemas.ts
sed -n '375,395p' src/fyd/sitespec/schemas.ts
echo "=== SCHEMA_ROLES has external_identity? ==="
grep -n "external_identity" src/fyd/sitespec/schemas.ts | head
