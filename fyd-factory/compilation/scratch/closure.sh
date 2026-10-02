#!/bin/bash
cd /home/nolan/projects/ping
echo "=== generator.ts imports ==="
grep -n "^import\|from \"" src/fyd/proceduralize/generator.ts | head -20
echo "=== validator.ts imports ==="
grep -n "^import\|from \"" src/fyd/sitespec/validator.ts | head -10
echo "=== renderer.tsx imports (fyd only) ==="
grep -n "from \"\.\./" src/fyd/components/renderer.tsx | head -20
echo "=== file existence ==="
for f in src/fyd/proceduralize/generator.ts src/fyd/sitespec/validator.ts src/fyd/sitespec/schemas.ts src/fyd/sitespec/types.ts src/fyd/sitespec/render-model.ts src/fyd/components/renderer.tsx src/fyd/components/registry.ts; do
  [ -f "$f" ] && echo "OK $f" || echo "MISSING $f"
done
