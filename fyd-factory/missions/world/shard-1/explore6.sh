cd /home/nolan/projects/ping
echo "===== ObjectProvenance + ObjectVisibility ====="
grep -n "ObjectProvenance\b" -A 12 src/lib/ping/types.ts | sed -n '1,30p'
grep -n "ObjectVisibility" src/lib/ping/types.ts | head -5
echo "===== safe-link head ====="
sed -n '1,60p' src/fyd/sitespec/safe-link.ts
echo "===== jest moduleNameMapper ====="
grep -n "moduleNameMapper" -A 10 src/fyd/jest.config.cjs 2>/dev/null || grep -n "moduleNameMapper" -A 10 jest.config.cjs 2>/dev/null | head -15
echo "===== css imports in renderer chain ====="
grep -rn "\.css['\"]" src/fyd/components/renderer.tsx src/fyd/components/object-rail.tsx src/fyd/object/card.tsx 2>/dev/null | head
echo "===== tsconfig paths ====="
grep -n '"paths"' -A 8 tsconfig.json
