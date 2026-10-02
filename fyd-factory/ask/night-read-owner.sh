#!/bin/bash
cd /home/nolan/projects/ping
echo "=== owner-mode dir ==="
ls src/fyd/owner-mode/ src/fyd/customize/
echo ""
echo "=== isDemoOwnerModeEnabled definition ==="
grep -rn "isDemoOwnerModeEnabled" src/fyd/owner-mode/*.ts src/fyd/owner-mode/*.tsx 2>/dev/null | head -10
echo ""
echo "=== demo-owner-console.tsx head ==="
head -80 src/fyd/owner-mode/demo-owner-console.tsx
echo ""
echo "=== owner-identity demo provider ==="
head -60 src/fyd/owner-mode/owner-identity.ts 2>/dev/null || ls src/fyd/owner-mode/
