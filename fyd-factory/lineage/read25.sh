#!/bin/bash
cd /home/nolan/projects/ping || exit 1
grep -n "function FydObjectCard" src/fyd/components/renderer.tsx
sed -n "$(grep -n 'function FydObjectCard' src/fyd/components/renderer.tsx | cut -d: -f1),+60p" src/fyd/components/renderer.tsx
echo "===== boundField ====="
grep -n "function boundField" src/fyd/components/renderer.tsx
sed -n "$(grep -n 'function boundField' src/fyd/components/renderer.tsx | cut -d: -f1),+25p" src/fyd/components/renderer.tsx
