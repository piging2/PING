#!/bin/bash
# F5-CEILING probe K: are the per-tenant vectors used? who calls planSite?
set -e
cd /home/nolan/projects/ping
echo "=== usages of COPPERSMITH_VECTOR / PING_DOGFOOD_VECTOR / DEFAULT_VECTOR ==="
grep -rn "COPPERSMITH_VECTOR\|PING_DOGFOOD_VECTOR\|DEFAULT_VECTOR" src/ --include="*.ts" | grep -v "dimensions.ts" | head -20
echo ""
echo "=== who calls planSite ==="
grep -rln "planSite" src/ --include="*.ts" --include="*.tsx" | head -20
echo ""
echo "=== withTenantContext signature ==="
sed -n '165,200p' src/fyd/tenant/tenant-context.ts
