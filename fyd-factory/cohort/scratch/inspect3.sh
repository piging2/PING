#!/bin/bash
cd /home/nolan/projects/ping
echo "=== PipelineReport full ==="
sed -n '1105,1122p' src/fyd/proceduralize/proceduralizer.ts
echo "=== ProjectedGraph type ==="
grep -n "ProjectedGraph\|export interface ObjectGraph" src/fyd/proceduralize/proceduralizer.ts src/fyd/data/*.ts 2>/dev/null | head -8
grep -rn "export interface ProjectedGraph" src/fyd/ | head -2
echo "=== ViewerContext ==="
grep -n "interface ViewerContext" src/fyd/sitespec/render-model.ts
sed -n "$(grep -n 'interface ViewerContext' src/fyd/sitespec/render-model.ts | cut -d: -f1),+8p" src/fyd/sitespec/render-model.ts
echo "=== BuildRenderModelOptions ==="
grep -n "interface BuildRenderModelOptions" src/fyd/sitespec/render-model.ts
sed -n "$(grep -n 'interface BuildRenderModelOptions' src/fyd/sitespec/render-model.ts | cut -d: -f1),+10p" src/fyd/sitespec/render-model.ts
