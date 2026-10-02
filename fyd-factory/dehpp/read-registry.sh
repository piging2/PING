#!/bin/bash
cd /home/nolan/projects/ping
echo "##### registry"
cat src/fyd/components/registry.tsx 2>/dev/null || cat src/fyd/components/registry.ts 2>/dev/null | head -120
echo "##### renderer"
wc -l src/fyd/components/renderer.tsx
