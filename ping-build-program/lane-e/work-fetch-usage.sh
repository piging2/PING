#!/bin/bash
set -u
cd /home/nolan/projects/ping || exit 1
echo "########## generator.ts eligibleComponents usage ##########"
grep -n -B3 -A15 "eligibleComponents" src/fyd/proceduralize/generator.ts | head -60
echo "########## validator.ts eligibleComponents usage ##########"
grep -n -B3 -A10 "eligibleComponents" src/fyd/sitespec/validator.ts | head -40
echo "########## who imports listComponentDefs / getComponentDef / COMPONENT_REGISTRY_VERSION ##########"
grep -rln "listComponentDefs\|getComponentDef\|COMPONENT_REGISTRY_VERSION" src --include="*.ts" --include="*.tsx" | head -20
echo "########## Gallery selection path ##########"
grep -rn "Gallery" src/fyd --include="*.ts" --include="*.tsx" -l | head -10
