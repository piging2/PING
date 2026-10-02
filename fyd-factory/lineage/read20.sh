#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== case Services in renderer ====="
grep -n '"Services"' src/fyd/components/renderer.tsx | head -5
echo "===== resolveQuery signature ====="
sed -n 72,110p src/fyd/components/renderer.tsx
