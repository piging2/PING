#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
sed -n "$(grep -n 'export function buildRenderContext' src/fyd/components/renderer.tsx | cut -d: -f1),+20p" src/fyd/components/renderer.tsx
echo "====="
sed -n '53,59p' src/fyd/sitespec/types.ts
