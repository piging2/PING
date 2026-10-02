#!/bin/bash
cd /home/nolan/projects/ping
echo "=== getPingObjectGraph ==="
grep -n "export async function getPingObjectGraph\|export function getPingObjectGraph" -A 25 src/fyd/data/ping-object-source.ts | head -45
echo ""
echo "=== generateSiteSpec signature ==="
grep -n "export function generateSiteSpec" -A 20 src/fyd/proceduralize/generator.ts | head -30
echo ""
echo "=== demo-owner-mode.tsx (banner wording reference) ==="
sed -n '1,60p' src/fyd/owner-mode/demo-owner-mode.tsx
