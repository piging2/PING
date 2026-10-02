#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
echo "=== actual paths ==="
git ls-files src/fyd | grep -e "registry" -e "ping-object" -e "apply-layer" | head
echo ""
echo "=== registry lookup fn ==="
grep -n "export function getComponentDef\|export function.*[Dd]ef\b" src/fyd/components/registry.ts* | head -5
echo ""
echo "=== ping-object-source exports ==="
grep -n "^export" src/fyd/ping-object-source.ts* | head -8
echo ""
echo "=== applyPresentationIntent signature ==="
sed -n "$(grep -n 'export function applyPresentationIntent' src/fyd/customize/apply-layer.ts* | cut -d: -f1),+8p" src/fyd/customize/apply-layer.ts*
