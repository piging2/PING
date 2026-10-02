#!/bin/bash
cd /home/nolan/projects/ping || exit 1
sed -n 1750,1800p src/fyd/components/renderer.tsx
echo "===== ServiceCard fields ====="
grep -n "function ServiceCard\|const ServiceCard" src/fyd/components/renderer.tsx | head -3
