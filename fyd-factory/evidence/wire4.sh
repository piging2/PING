#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== renderer.tsx HeroMediaWhyThis (895-935) ====="
sed -n '895,935p' src/fyd/components/renderer.tsx
echo "===== planner.ts (380-420) ====="
sed -n '380,420p' src/fyd/builder/planner.ts
echo "===== planner.ts planSite signature (140-200) ====="
sed -n '140,200p' src/fyd/builder/planner.ts
echo "===== discover.ts classifyRights (190-240) ====="
sed -n '190,240p' src/fyd/media/discover.ts
echo "===== buildVerifiedRenderModel signature ====="
grep -rn "export function buildVerifiedRenderModel\|export function verifyBinding\|export function assertSpecBindingsVerified" src/fyd/sitespec/ | head
