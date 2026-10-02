#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
echo "=== select.ts exports ==="
grep -n "^export" src/fyd/media/select.ts
echo ""
echo "=== listObjectMedia? ==="
grep -n "listObjectMedia\|objectMedia\|galleryMedia" src/fyd/media/select.ts | head -20
echo ""
echo "=== RenderContext in renderer ==="
grep -n "galleryMedia\|objectMedia\|interface RenderContext\|RenderContext =" src/fyd/components/renderer.tsx | head -20
echo ""
echo "=== getPingObjectGraph signature + D4 ==="
grep -n "export async function getPingObjectGraph\|siteId\|meta.siteId" src/fyd/data/ping-object-source.ts | head -20
