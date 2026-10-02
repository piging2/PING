#!/bin/bash
cd /home/nolan/projects/ping || exit 1
sed -n 157,185p src/fyd/components/renderer.tsx
echo "===== RenderContext builder ====="
grep -n "buildRenderContext" src/fyd/components/renderer.tsx | head -3
