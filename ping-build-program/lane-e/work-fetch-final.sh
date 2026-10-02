#!/bin/bash
set -u
cd /home/nolan/projects/ping || exit 1
echo "########## schemas.ts lines 120-165 (roles block) ##########"
sed -n '120,165p' src/fyd/sitespec/schemas.ts
echo "########## full eligibility test block ##########"
sed -n '40,140p' src/fyd/sitespec/__tests__/schemas.test.ts
echo "########## strategies/planner acceptsSchemas usage ##########"
grep -n "acceptsSchemas" src/fyd/builder/strategies.ts src/fyd/builder/planner.ts src/fyd/components/renderer.tsx src/fyd/lineage/tracer.ts src/app/sites/_shared/site-client.tsx 2>/dev/null | head -20
echo "########## SCHEMA_COMPONENTS direct importers (exact) ##########"
grep -rn "SCHEMA_COMPONENTS" src --include="*.ts" --include="*.tsx" | grep -v "sitespec/schemas.ts" | head
echo "########## FYDSchemaRole importers ##########"
grep -rln "FYDSchemaRole" src --include="*.ts" --include="*.tsx" | head
echo "########## schemaRole importers ##########"
grep -rln "schemaRole" src --include="*.ts" --include="*.tsx" | head
