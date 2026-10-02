#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
echo "=== registry lookup ==="
grep -n "export function get\|export const get\|has(" src/fyd/components/registry.tsx | head
echo ""
echo "=== ping-object-source exports ==="
grep -n "export" src/fyd/ping-object-source.ts | head
echo ""
echo "=== apply-layer exports ==="
grep -n "^export" src/fyd/customize/apply-layer.ts | head
echo ""
echo "=== KNOWN_SCHEMAS ==="
grep -rn "KNOWN_SCHEMAS" src/fyd/sitespec/*.ts src/app/sites/happy-place/page.tsx 2>/dev/null | head -5
