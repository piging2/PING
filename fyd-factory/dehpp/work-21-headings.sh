#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
echo "=== all presentation.heading ?? defaults ==="
grep -n 'presentation.heading ??' src/fyd/components/renderer.tsx
echo ""
echo "=== RenderContext 137-180 ==="
sed -n '137,180p' src/fyd/components/renderer.tsx
