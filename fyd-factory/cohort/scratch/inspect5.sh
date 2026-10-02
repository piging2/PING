#!/bin/bash
cd /home/nolan/projects/ping
echo "=== ViewerContext in types.ts ==="
sed -n '20,40p' src/fyd/sitespec/types.ts
echo "=== ObjectGraph in types.ts ==="
grep -n "ObjectGraph" src/fyd/sitespec/types.ts | head -3
sed -n "$(grep -n 'export interface ObjectGraph\|export type ObjectGraph' src/fyd/sitespec/types.ts | head -1 | cut -d: -f1),+10p" src/fyd/sitespec/types.ts
echo "=== generateSiteSpec head ==="
sed -n '285,330p' src/fyd/proceduralize/generator.ts
