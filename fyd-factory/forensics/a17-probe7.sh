#!/bin/bash
# AGENT-17 probe 7: generator vs planner + capability href + explore (READ-ONLY)
set -u
cd /home/nolan/projects/ping || exit 1
echo "=== generateSiteSpec def in proceduralize/generator.ts ==="
grep -n 'export function generateSiteSpec\|export async function generateSiteSpec' src/fyd/proceduralize/generator.ts src/fyd/builder/planner.ts
echo "=== planner.ts imports generateSiteSpec from generator? ==="
grep -n 'generateSiteSpec' src/fyd/builder/planner.ts | head
echo "=== builder dir ==="
ls src/fyd/builder/
echo "=== who imports from builder/planner (non-test) ==="
grep -rln 'builder/planner' src --include='*.ts' --include='*.tsx' | grep -v __tests__ | sort
echo ""
echo "=== ObjectCapability href construction ==="
grep -rn 'href' src/fyd/object/*.ts | grep -v __tests__ | head -20
echo ""
echo "=== MarginObjectLayer explore ==="
grep -n 'explore' 'src/fyd/ui/object-layer/MarginObjectLayer.tsx' | head
echo ""
echo "=== resolveSafeLink def ==="
grep -rn 'export function resolveSafeLink\|export type SafeLink' src/fyd/sitespec/safe-link.ts | head
