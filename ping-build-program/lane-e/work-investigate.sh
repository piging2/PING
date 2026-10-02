#!/bin/bash
set -u
cd /home/nolan/projects/ping || exit 1
echo "=== branch/head ==="
git branch --show-current
git rev-parse --short HEAD
echo "=== are target files dirty? ==="
git status --short src/fyd/sitespec/schemas.ts src/fyd/components/registry.ts
echo "(blank = clean)"
echo "=== total dirty count ==="
git status --short | wc -l
echo "=== who imports componentForSchema / acceptsSchemas? ==="
grep -rln "componentForSchema" src --include="*.ts" --include="*.tsx" | head -20
echo "=== who imports SCHEMA_COMPONENTS / eligibleComponents? ==="
grep -rln "eligibleComponents\|SCHEMA_COMPONENTS" src --include="*.ts" --include="*.tsx" | head -20
