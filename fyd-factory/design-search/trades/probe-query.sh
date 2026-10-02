#!/bin/bash
cd /home/nolan/projects/ping || { echo "NO REPO"; exit 1; }
echo "=== resolveQuery in renderer ==="
grep -n "resolveQuery" src/fyd/components/renderer.tsx | head -5
echo "---"
sed -n "$(grep -n 'export function resolveQuery' src/fyd/components/renderer.tsx | cut -d: -f1),+80p" src/fyd/components/renderer.tsx
echo "=== eligibleComponents for service (schemas.ts 260-290) ==="
sed -n '255,295p' src/fyd/sitespec/schemas.ts
