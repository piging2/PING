#!/bin/bash
cd /home/nolan/projects/ping
echo "=== git log schemas.ts ==="
git log --oneline -5 -- src/fyd/sitespec/schemas.ts
echo "=== git status short for schemas.ts ==="
git status --short src/fyd/sitespec/schemas.ts
echo "=== SCHEMA_COMPONENTS present? ==="
grep -c "SCHEMA_COMPONENTS" src/fyd/sitespec/schemas.ts || true
echo "=== component registry derivation present? ==="
grep -n "componentRegistry\|COMPONENT_REGISTRY\|getComponent" src/fyd/sitespec/schemas.ts | head -5
