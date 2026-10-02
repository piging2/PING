#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
git add src/app/sites/_shared/__tests__ src/app/sites/_shared/compose-site.ts src/app/sites/_shared/customer-site.tsx src/app/sites/_shared/demo-chrome.tsx src/app/sites/happy-place/composition.ts src/app/sites/happy-place/page.tsx src/fyd/components/renderer.tsx src/fyd/compose src/fyd/copy src/fyd/proceduralize/__tests__/composition.test.ts src/fyd/proceduralize/generator.ts src/fyd/sitespec/types.ts src/fyd/sitespec/validator.ts
git status --porcelain | grep -v "^?? node_modules" | head -20
echo "=== staged ==="
git diff --cached --stat | tail -3