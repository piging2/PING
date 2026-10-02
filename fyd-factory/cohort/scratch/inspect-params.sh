#!/bin/bash
cd /home/nolan/projects/ping
echo "=== runExtractionPipeline params ==="
sed -n '1170,1210p' src/fyd/proceduralize/proceduralizer.ts
echo "=== GeneratorOptions ==="
grep -n "GeneratorOptions" src/fyd/proceduralize/generator.ts | head -3
sed -n "$(grep -n 'interface GeneratorOptions' src/fyd/proceduralize/generator.ts | cut -d: -f1),+25p" src/fyd/proceduralize/generator.ts
echo "=== validateSiteSpec params ==="
sed -n '20,60p' src/fyd/sitespec/validator.ts
echo "=== buildSemanticRenderModel params ==="
sed -n '90,130p' src/fyd/sitespec/render-model.ts
