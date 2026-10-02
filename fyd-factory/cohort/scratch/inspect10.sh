#!/bin/bash
cd /home/nolan/projects/ping
echo "=== render-model.ts imports from renderer ==="
grep -n "components/renderer" src/fyd/sitespec/render-model.ts
grep -n "^import" src/fyd/sitespec/render-model.ts
echo "=== what does it use from renderer? ==="
grep -n "RENDERER_VERSION\|DESIGN_TOKEN_VERSION\|RENDER_MODEL_VERSION" src/fyd/sitespec/render-model.ts | head -8
echo "=== where are those defined ==="
grep -rn "export const RENDERER_VERSION\|export const DESIGN_TOKEN_VERSION\|export const RENDER_MODEL_VERSION" src/fyd/components/renderer.tsx src/fyd/sitespec/*.ts 2>/dev/null | head -5
