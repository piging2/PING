#!/bin/bash
set -e
cd /home/nolan/projects/ping
echo "=== branch ==="
git rev-parse --abbrev-ref HEAD
echo "=== dirty count (must not touch) ==="
git status --porcelain | wc -l
echo "=== runExtractionPipeline signature ==="
grep -n "export.*runExtractionPipeline" src/fyd/proceduralize/proceduralizer.ts | head -3
echo "=== generateSiteSpec signature ==="
grep -n "export.*generateSiteSpec" src/fyd/proceduralize/generator.ts | head -3
echo "=== validateSiteSpec / isRenderable ==="
grep -n "export.*validateSiteSpec\|export.*isRenderable" src/fyd/sitespec/validator.ts | head -5
echo "=== buildSemanticRenderModel ==="
grep -n "export.*buildSemanticRenderModel" src/fyd/sitespec/render-model.ts | head -3
echo "=== proceduralizer.ts head (types) ==="
sed -n '1,60p' src/fyd/proceduralize/proceduralizer.ts
