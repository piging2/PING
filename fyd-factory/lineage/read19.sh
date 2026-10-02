#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== renderer resolveQuery signature ====="
grep -n "export function resolveQuery\|export function renderSection\|import" src/fyd/components/renderer.tsx | head -25
echo "===== registry: Services renderer mapping ====="
sed -n 60,140p src/fyd/components/registry.ts
echo "===== site-client head ====="
ls src/app/sites/_shared/
head -70 src/app/sites/_shared/site-client.tsx 2>/dev/null || head -70 src/app/sites/_shared/site-client.ts 2>/dev/null
