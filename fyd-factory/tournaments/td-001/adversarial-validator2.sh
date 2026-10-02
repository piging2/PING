#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== validator: the component-accepts-schema check ==="
grep -n "does not accept\|eligibleComponents\|acceptsSchemas" src/fyd/sitespec/validator.ts
echo "=== schemas.ts:250-270 SCHEMA_COMPONENTS ==="
sed -n '250,270p' src/fyd/sitespec/schemas.ts
echo "=== registry.ts:75-90 ObjectFeed def ==="
sed -n '75,90p' src/fyd/components/registry.ts
echo "=== renderer ObjectFeed case (1760-1800) ==="
sed -n '1760,1800p' src/fyd/components/renderer.tsx
