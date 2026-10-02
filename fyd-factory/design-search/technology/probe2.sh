#!/bin/bash
# F3-DESIGN-C probe2: rest of types.ts, dogfood fixture graphs, component registry, archetypes
cd /home/nolan/projects/ping || exit 1
echo "=== types.ts tail (FYDSiteSpec interface + tokens) ==="
sed -n '150,260p' src/fyd/sitespec/types.ts
echo "=== dogfood test 1: builder ==="
wc -l src/fyd/builder/__tests__/ping-fyd-dogfood-render.test.ts
head -150 src/fyd/builder/__tests__/ping-fyd-dogfood-render.test.ts
echo "=== dogfood test 2: components ==="
wc -l src/fyd/components/__tests__/ping-fyd-dogfood.test.ts
head -150 src/fyd/components/__tests__/ping-fyd-dogfood.test.ts
echo "=== registry.ts ==="
wc -l src/fyd/components/registry.ts
grep -n "name:\|component\|schema\|SCHEMA\|register\|def " src/fyd/components/registry.ts | head -60
echo "=== archetypes ==="
ls src/fyd/archetypes/ 2>/dev/null
echo "=== F2 mentions in docs ==="
grep -rl "F2" --include="*.md" src/fyd/ 2>/dev/null | head -5
git log --oneline -5 2>/dev/null
