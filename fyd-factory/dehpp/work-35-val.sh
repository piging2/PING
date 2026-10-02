#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
echo "=== validator on presentation ==="
grep -n "presentation" src/fyd/sitespec/validator.ts | head -15
echo ""
echo "=== SectionShell signature ==="
sed -n "$(grep -n 'function SectionShell' src/fyd/components/renderer.tsx | cut -d: -f1),+12p" src/fyd/components/renderer.tsx
echo ""
echo "=== site-client import check ==="
git grep -n "_shared/site-client" -- '*.tsx' | head
