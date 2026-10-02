#!/bin/bash
set -u
cd /home/nolan/projects/ping || exit 1
echo "=== import registry FIRST (cycle check) ==="
cat > /tmp/lane-e-cycle.ts <<'TSEOF'
import { componentForSchema } from "/home/nolan/projects/ping/src/fyd/components/registry";
import { eligibleComponents } from "/home/nolan/projects/ping/src/fyd/sitespec/schemas";
console.log("registry-first:", componentForSchema("ping.social.service@1"), "|", eligibleComponents("ping.social.service@1").join(","));
TSEOF
npx tsx /tmp/lane-e-cycle.ts
echo "=== full tsc: any NEW errors mentioning our symbols? ==="
npx tsc --noEmit 2>&1 | grep -cE "SCHEMA_COMPONENTS|componentsForSchema|schema-roles" || true
echo "(0 = clean)"
echo "=== final diff ==="
git diff --stat
git status --short src/fyd/sitespec/ src/fyd/components/registry.ts
