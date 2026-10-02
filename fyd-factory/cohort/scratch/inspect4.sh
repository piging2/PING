#!/bin/bash
cd /home/nolan/projects/ping
echo "=== ProjectedGraph ==="
sed -n '560,600p' src/fyd/proceduralize/proceduralizer.ts
echo "=== ViewerContext (search) ==="
grep -rn "ViewerContext" src/fyd/sitespec/render-model.ts | head -3
grep -rn "export interface ViewerContext" src/fyd/ | head -2
echo "=== where does generateSiteSpec get ObjectGraph from ProjectedGraph? ==="
grep -n "interface ObjectGraph" src/fyd/proceduralize/generator.ts src/fyd/data/*.ts src/lib/ping/*.ts 2>/dev/null | head -3
grep -rn "export.*ObjectGraph" src/fyd/proceduralize/proceduralizer.ts | head -3
