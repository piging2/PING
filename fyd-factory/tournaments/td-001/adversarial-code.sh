#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== current generator.ts:272-287 (explorePage) ==="
sed -n '272,287p' src/fyd/proceduralize/generator.ts
echo "=== eligibleComponents in schemas.ts ==="
grep -n -A25 "function eligibleComponents" src/fyd/sitespec/schemas.ts
echo "=== validator.ts:105-125 (querySchemasFor) ==="
sed -n '105,125p' src/fyd/sitespec/validator.ts
echo "=== registry.ts ObjectFeed acceptsSchemas ==="
grep -n -B5 -A20 "acceptsSchemas" src/fyd/components/registry.ts | head -50
echo "=== route page.tsx (coppersmith) ==="
cat src/app/sites/coppersmith-plumbing/page.tsx
