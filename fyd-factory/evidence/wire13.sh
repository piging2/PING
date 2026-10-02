#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== callers of resolveBoundField ==="
grep -rn "resolveBoundField" src/ --include="*.ts" --include="*.tsx" | grep -v __tests__ | head -20
echo "=== callers of verifyPresentationBinding (non-test) ==="
grep -rn "verifyPresentationBinding" src/ --include="*.ts" --include="*.tsx" | grep -v __tests__ | grep -v "binding-verifier.ts" | head -20
echo "=== renderer.tsx 680-715 comment ==="
sed -n '680,715p' src/fyd/components/renderer.tsx
echo "=== tests pinning weak behavior ==="
grep -rln "owner_authored" src/fyd/components/__tests__/ src/fyd/sitespec/__tests__/ 2>/dev/null | head
grep -rn "owner_authored" src/fyd/sitespec/__tests__/ 2>/dev/null | head -20
