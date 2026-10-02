#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== use client in renderer? ====="
head -20 src/fyd/components/renderer.tsx | grep -n "use client" || echo "no use client"
echo "===== RenderContext type ====="
grep -n "interface RenderContext" -A 20 src/fyd/components/renderer.tsx | head -30
echo "===== ask-composer imports ====="
head -30 src/lib/ping/ask-composer.ts
echo "===== react-dom/server available ====="
ls node_modules/react-dom/server* 2>/dev/null | head -3; ls node_modules/react-dom/package.json >/dev/null && echo react-dom-present
