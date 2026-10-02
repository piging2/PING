#!/bin/bash
set -e
cd /home/nolan/fyd-wave2
echo "--- repoint harness to clean tree ---"
sed -i 's|\.\./projects/ping/src/|/home/nolan/fyd-wave2-clean/src/|g' harness-object.tsx
sed -i 's|/home/nolan/fyd-factory-object2|/home/nolan/fyd-wave2/out|g' harness-object.tsx
sed -i 's|OBJECT-SHARD-2 log|OBJECT-WAVE2 log|' harness-object.tsx
sed -i 's|synthetic: true, testing_only: true, \.\.\.extra,|synthetic: true, testing_only: true, baseline: "clean-tree-e48ef710", ...extra,|' harness-object.tsx
grep -c 'fyd-wave2-clean/src' harness-object.tsx
grep -c 'baseline: "clean-tree-e48ef710"' harness-object.tsx
echo "--- repoint build script ---"
sed -i 's|/home/nolan/projects/ping/tsconfig.json|/home/nolan/fyd-wave2-clean/tsconfig.json|g' build-object.mjs
sed -i 's|/home/nolan/fyd-factory-shard2/harness.tsx|/home/nolan/fyd-wave2/harness-object.tsx|g' build-object.mjs
sed -i 's|/home/nolan/fyd-factory-shard2/bundle.cjs|/home/nolan/fyd-wave2/bundle-object.cjs|g' build-object.mjs
sed -i 's|/home/nolan/projects/ping/src/fyd/sitespec/schemas.ts|/home/nolan/fyd-wave2-clean/src/fyd/sitespec/schemas.ts|g' build-object.mjs
echo "--- build ---"
node build-object.mjs harness-object.tsx bundle-object.cjs
ls -la bundle-object.cjs
echo "--- smoke test: 2 missions ---"
FYD_OUT=/home/nolan/fyd-wave2/smoke node bundle-object.cjs 2500 2502
wc -l /home/nolan/fyd-wave2/smoke/results.jsonl
