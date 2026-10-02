#!/bin/bash
set -u
cd /home/nolan/projects/ping
echo "=== PingObject visibility ==="
grep -n -A25 'interface PingObject' src/lib/ping/types.ts | head -45
echo "=== any on* attrs in a baseline render? (render.test writes /tmp files - check exists) ==="
ls /tmp/fyd-render/ 2>/dev/null | head
echo "=== generateSiteSpec signature ==="
grep -n 'export function generateSiteSpec' src/fyd/proceduralize/generator.ts
grep -n -A12 'export function generateSiteSpec' src/fyd/proceduralize/generator.ts | head -18
echo "=== buildRenderContext signature ==="
grep -n -A8 'export function buildRenderContext' src/fyd/components/renderer.tsx | head -12
