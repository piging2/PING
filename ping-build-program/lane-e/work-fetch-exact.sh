#!/bin/bash
set -u
cd /home/nolan/projects/ping || exit 1
echo "########## schemas.ts lines 100-120 (comment block start) ##########"
sed -n '100,120p' src/fyd/sitespec/schemas.ts
echo "########## schemas.ts lines 1-40 (imports) ##########"
sed -n '1,40p' src/fyd/sitespec/schemas.ts
echo "########## internal uses of SCHEMA_ROLES/schemaRole/FYDSchemaRole in schemas.ts ##########"
grep -n "SCHEMA_ROLES\|schemaRole\|FYDSchemaRole" src/fyd/sitespec/schemas.ts
echo "########## registry.ts lines 1-20 (import block) ##########"
sed -n '1,20p' src/fyd/components/registry.ts
echo "########## python3 present? ##########"
which python3 && python3 --version
echo "########## node present? ##########"
which node && node --version
