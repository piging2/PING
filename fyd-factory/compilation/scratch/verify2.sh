#!/bin/bash
cd /home/nolan/projects/ping
echo "=== render-model.ts use of buildRenderContext ==="
grep -n "buildRenderContext" src/fyd/sitespec/render-model.ts
echo "=== tracer.ts use ==="
grep -n "buildRenderContext" src/fyd/lineage/tracer.ts | head -5
echo "=== binding-verifier.ts use ==="
grep -n "buildRenderContext" src/fyd/sitespec/binding-verifier.ts | head -5
echo "=== who renders pages in production: grep SitePageView/renderSection non-test callers ==="
grep -rln "SitePageView\|renderSection" src/app src/pages 2>/dev/null | head; echo ---
grep -rln "from.*fyd/components/renderer\|fyd/components/renderer\"" src --include=*.tsx --include=*.ts | grep -v __tests__ | grep -v "src/fyd/components" | head
echo "=== buildSemanticRenderModel callers incl tests ==="
grep -rln "buildSemanticRenderModel" src --include=*.ts --include=*.tsx | head
