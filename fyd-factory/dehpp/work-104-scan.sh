#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
echo "=== business-name references in src (expect only HPP route data + composition record) ==="
grep -rln -i "happy-place\|happy place" src/ | grep -v "__tests__" | head -20
echo "=== tenant-conditional branches in renderer/seam (expect none) ==="
grep -rn "siteId ==\|siteId ===\|tenantId ==\|tenantId ===" src/fyd/components/renderer.tsx src/app/sites/_shared/compose-site.ts src/app/sites/_shared/customer-site.tsx src/fyd/compose/ src/fyd/copy/ 2>/dev/null | head -10
echo "=== em dashes in new/changed files ==="
grep -rn $'\u2014' src/fyd/compose/ src/fyd/copy/ src/app/sites/_shared/customer-site.tsx src/app/sites/_shared/demo-chrome.tsx src/app/sites/_shared/compose-site.ts src/app/sites/happy-place/composition.ts src/app/sites/happy-place/page.tsx src/fyd/proceduralize/generator.ts src/fyd/components/renderer.tsx src/fyd/sitespec/types.ts src/fyd/sitespec/validator.ts 2>/dev/null | head -10
echo "=== scan done ==="