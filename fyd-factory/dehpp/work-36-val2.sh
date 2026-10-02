#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
echo "=== validateSiteSpec signature ==="
grep -n "export function validateSiteSpec" -A 8 src/fyd/sitespec/validator.ts | head -12
echo ""
echo "=== PresentationIntentBlock ==="
grep -n "interface PresentationIntentBlock" -A 25 src/fyd/customize/types.ts | head -30
echo ""
echo "=== demo-owner-mode gate body ==="
sed -n '30,60p' src/fyd/owner-mode/demo-owner-mode.tsx
