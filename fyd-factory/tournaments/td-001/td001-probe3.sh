#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== SCHEMA_ROLES location ====="
grep -rn "SCHEMA_ROLES" --include="*.ts" -l src | grep -v __tests__ | head
echo
echo "===== external_identity mentions ====="
grep -rn "external_identity" --include="*.ts" src/fyd/builder/eligibility.ts src/fyd/proceduralize/proceduralizer.ts src/fyd/object/object-projection.ts | head -30
echo
echo "===== SCHEMA_ROLES table def ====="
grep -rn "SCHEMA_ROLES" --include="*.ts" src/fyd/components/schema-roles.ts 2>/dev/null | head -3
ls src/fyd/components/ | head -30
