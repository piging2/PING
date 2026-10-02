#!/bin/bash
set -u
cd /home/nolan/projects/ping || exit 1
echo "########## SCHEMA_ROLES + SCHEMA_COMPONENTS + eligibleComponents + schemaRole (schemas.ts) ##########"
grep -n "SCHEMA_ROLES\|SCHEMA_COMPONENTS\|export function eligibleComponents\|export function schemaRole" src/fyd/sitespec/schemas.ts
echo "########## SCHEMA_ROLES body ##########"
awk '/const SCHEMA_ROLES/,/};/' src/fyd/sitespec/schemas.ts | head -40
echo "########## SCHEMA_COMPONENTS body ##########"
awk '/const SCHEMA_COMPONENTS/,/};/' src/fyd/sitespec/schemas.ts | head -60
echo "########## eligibleComponents + schemaRole bodies ##########"
sed -n '265,300p' src/fyd/sitespec/schemas.ts
echo "########## registry.ts: rest of file after excerpt ##########"
wc -l src/fyd/components/registry.ts
sed -n '89,200p' src/fyd/components/registry.ts
echo "########## componentForSchema ##########"
grep -n -A 20 "export function componentForSchema" src/fyd/components/registry.ts | head -40
echo "########## test usage ##########"
grep -n "componentForSchema\|eligibleComponents" src/fyd/sitespec/__tests__/schemas.test.ts | head -20
